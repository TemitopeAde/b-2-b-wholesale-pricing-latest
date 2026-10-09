import { updateWholesaleCustomer } from '../backend/wholesale.client';
import React, { type FC, useState, useEffect, useRef } from 'react';
import { items } from "@wix/data";
import { dashboard } from '@wix/dashboard';
import { type EditFormData, type LoadingActions, type StatusFilter, type WholesaleApplication } from './CustomerView/types';
import { PageHeader } from './CustomerView/PageHeader';
import { SearchFilters } from './CustomerView/SearchFilters';
import { CustomerTable } from './CustomerView/CustomerTable';
import { EditCustomerModal } from './CustomerView/EditCustomer';
import { LoadingState } from './CustomerView/LoadingState';
import { exportCustomersToCSV, memberExistsInAccessGroups, removeUserFromAllAccessGroups } from './CustomerView/Utils';
import { type DashboardStats, formatRelativeDate } from './CustomerView/useDashboardStats';
import { DashIcons } from './Dashboard/icons';
import { SitePluginsCard } from './SitePluginsCard';
import { useDebouncedCallback } from '../utils/useDebouncedCallback';
import styles from './Dashboard/dashboard.module.css';

import { type AccessGroup } from './AccessGroupType';
import { verifySiteId, searchWholesaleContacts, getContact, updateContact, revokeWholesaleAccess } from '../backend/pricing.client';

// Collection names
const ACCESS_GROUPS_COLLECTION = "@wd-strategies/wholesale-appllication/Accessgroup";
const REQUEST_A_QUOTE_URL = 'https://www.wix.com/market/request-a-quote-for-wix';
const PENDING_PREVIEW_LIMIT = 3;

interface DeleteConfirmModalProps {
    isOpen: boolean;
    customerName: string;
    isLoading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    customerName,
    isLoading,
    onConfirm,
    onCancel
}) => {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        cancelRef.current?.focus();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) onCancel();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, isLoading, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onCancel(); }}
        >
            <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="revoke-title" aria-describedby="revoke-desc">
                <h2 id="revoke-title" className={styles.dialogTitle}>Revoke wholesale access?</h2>
                <p id="revoke-desc" className={styles.dialogText}>
                    <strong>{customerName}</strong> will lose wholesale pricing and be removed from all access groups. This can't be undone.
                </p>
                <div className={styles.dialogActions}>
                    <button ref={cancelRef} type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onConfirm} disabled={isLoading}>
                        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
                        {isLoading ? 'Revoking…' : 'Revoke access'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface KpiTileProps {
    label: string;
    value: number | null;
    note: string;
    tone: string;
    icon: React.ReactNode;
}

const KpiTile: FC<KpiTileProps> = ({ label, value, note, tone, icon }) => (
    <div className={styles.kpi}>
        <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>{label}</span>
            <span className={`${styles.kpiIcon} ${tone}`}>{icon}</span>
        </div>
        <div className={styles.kpiValue}>
            {value === null ? <span className={styles.skeleton} aria-label="Loading" /> : value}
        </div>
        <div className={styles.kpiNote}>{note}</div>
    </div>
);

interface CustomersViewProps {
    stats: DashboardStats;
    onNavigate: (tab: string) => void;
}

export const CustomersView: FC<CustomersViewProps> = ({ stats, onNavigate }) => {
    // State management
    const [searchTerm, setSearchTerm] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [customers, setCustomers] = useState<WholesaleApplication[]>([]);
    const [totalCustomers, setTotalCustomers] = useState<number | null>(null);
    const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
    const [accessGroupsLoaded, setAccessGroupsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingActions, setLoadingActions] = useState<LoadingActions>({});
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<WholesaleApplication | null>(null);
    const [statusFilter] = useState<StatusFilter>('all');
    const [showBanner, setShowBanner] = useState(false);
    // Only the newest request may update the list, so a slow earlier search can't overwrite it.
    const latestFetchRef = useRef(0);

    // Delete confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<WholesaleApplication | null>(null);

    const [editForm, setEditForm] = useState<EditFormData>({
        accessGroupIds: [],
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: '',
        status: 'pending'
    });

    // Data fetching functions
    const fetchAccessGroups = async (): Promise<void> => {
        try {
            const results = await items.query(ACCESS_GROUPS_COLLECTION).find();
            const transformedGroups: AccessGroup[] = results.items.map((item: any) => ({
                id: item._id || '',
                name: item.name || '',
                maxOrder: item.maxOrder || '',
                minProducts: item.minProducts || '',
                maxProducts: item.maxProducts || '',
                discount: item.discount || '',
                minOrder: item.minOrder || '',
                members: item.members || [],
            }));
            setAccessGroups(transformedGroups);
        } catch {
            setAccessGroups([]);
        } finally {
            setAccessGroupsLoaded(true);
        }
    };

    const fetchCustomers = async (search: string = ''): Promise<void> => {
        const requestId = ++latestFetchRef.current;
        try {
            setIsLoading(true);
            const contacts = await searchWholesaleContacts(search);
            if (requestId !== latestFetchRef.current) return;
            const transformedCustomers: WholesaleApplication[] = (contacts || []).map((contact: any) => {
                const firstName = contact.info?.name?.first || '';
                const lastName = contact.info?.name?.last || '';
                const fullName = `${firstName} ${lastName}`.trim();
                const email = contact.primaryInfo?.email
                    || contact.memberInfo?.email
                    || contact.info?.emails?.[0]?.email
                    || '';

                const displayName = fullName || email || 'No Identity';

                return {
                    id: contact._id || '',
                    businessName: displayName,
                    contactName: fullName,
                    email,
                    status: 'approved' as const,
                    memberId: contact.memberInfo?.memberId || contact._id || '',
                    submittedDate: contact.source?._createdDate || contact._createdDate || '',
                    phone: '', businessType: '', yearsInBusiness: '', annualRevenue: '',
                    numberOfLocations: '', resaleCertificate: '', taxId: '', website: '',
                    hearAboutUs: '', interestedProducts: [], estimatedMonthlyVolume: '',
                    additionalInfo: '', accessGroupIds: [], totalOrders: 0,
                    totalSpent: 0, lastOrderDate: '',
                };
            });
            setCustomers(transformedCustomers);
            if (!search) setTotalCustomers(transformedCustomers.length);
        } catch {
            if (requestId !== latestFetchRef.current) return;
            dashboard.showToast({
                message: "Failed to load customers",
                type: "error",
            });
        } finally {
            if (requestId === latestFetchRef.current) setIsLoading(false);
        }
    };

    const debouncedFetchCustomers = useDebouncedCallback(fetchCustomers, 400);

    /** Search box handler: calls the server after 400ms idle; clearing the box reloads at once. */
    const handleSearchChange = (value: string): void => {
        setSearchTerm(value);
        if (value.trim()) {
            debouncedFetchCustomers(value);
        } else {
            debouncedFetchCustomers.cancel();
            fetchCustomers('');
        }
    };

    useEffect(() => {
        fetchAccessGroups();
        fetchCustomers('');
    }, []);

    useEffect(() => {
        const checkApiAndShowBanner = async () => {
            try {
                const response = await verifySiteId()
                if (response.data) {
                    setShowBanner(false);
                }
            } catch {
                setShowBanner(true)
            }
        };

        checkApiAndShowBanner();
    }, []);

    const handleEditCustomer = (customer: WholesaleApplication): void => {
        setEditingCustomer(customer);
        setEditForm({
            accessGroupIds: customer.accessGroupIds || [],
            totalOrders: customer.totalOrders || 0,
            totalSpent: customer.totalSpent || 0,
            lastOrderDate: customer.lastOrderDate || '',
            status: customer.status
        });
        setShowEditModal(true);
    };

    const handleFormChange = (field: keyof EditFormData, value: any): void => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleUpdateCustomer = async (): Promise<void> => {
        if (!editingCustomer) return;

        try {
            setLoadingActions(prev => ({ ...prev, 'update': true }));

            await updateWholesaleCustomer(editingCustomer.id, editForm.status, editForm.status === 'approved' ? editForm.accessGroupIds.map(String) : []);
            await fetchAccessGroups();
            const updatedCustomer: WholesaleApplication = {
                ...editingCustomer,
                accessGroupIds: editForm.accessGroupIds,
                status: editForm.status,
            };

            setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updatedCustomer : c));
            setEditingCustomer(null);
            setShowEditModal(false);

            dashboard.showToast({
                message: "Customer updated successfully",
                type: "success",
            });
        } catch (error) {
            dashboard.showToast({
                message: error instanceof Error ? error.message : "Failed to update customer",
                type: "error",
            });
        } finally {
            setLoadingActions(prev => {
                const newState = { ...prev };
                delete newState['update'];
                return newState;
            });
        }
    };

    const handleDeleteCustomer = (customerId: string): void => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        setCustomerToDelete(customer);
        setShowDeleteModal(true);
    };

    const confirmDeleteCustomer = async (): Promise<void> => {
        if (!customerToDelete) return;

        try {
            setLoadingActions(prev => ({ ...prev, [`delete-${customerToDelete.id}`]: true }));

            await updateWholesaleCustomer(customerToDelete.id, 'pending');
            await fetchAccessGroups();

            setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
            setTotalCustomers(prev => (prev === null ? prev : Math.max(0, prev - 1)));

            dashboard.showToast({
                message: "Wholesale access revoked successfully",
                type: "success",
            });

            setShowDeleteModal(false);
            setCustomerToDelete(null);
        } catch (error) {
            dashboard.showToast({
                message: error instanceof Error ? error.message : "Failed to delete customer",
                type: "error",
            });
        } finally {
            setLoadingActions(prev => {
                const newState = { ...prev };
                delete newState[`delete-${customerToDelete.id}`];
                return newState;
            });
        }
    };

    const cancelDeleteCustomer = (): void => {
        setShowDeleteModal(false);
        setCustomerToDelete(null);
    };

    const handleCloseModal = (): void => {
        setShowEditModal(false);
        setEditingCustomer(null);
    };

    // Computed values — server already filters by search; status and access group are filtered locally
    const filteredCustomers = customers.filter(c => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (groupFilter) {
            const group = accessGroups.find(g => g.id === groupFilter);
            return !!group?.members?.some(m => m.id === c.memberId);
        }
        return true;
    });

    const handleExport = (): void => {
        exportCustomersToCSV(filteredCustomers, accessGroups);
    };

    const pendingCount = stats.pendingApplications.length;
    const pendingPreview = stats.pendingApplications.slice(0, PENDING_PREVIEW_LIMIT);
    const statsReady = !stats.isLoading || stats.activePricingRules !== null;

    return (
        <div className={styles.page}>
            <PageHeader
                breadcrumb="Wholesale › Customers"
                title="Wholesale customers"
                subtitle="Manage wholesale accounts, their access groups and pricing."
            >
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={handleExport}
                    disabled={isLoading || filteredCustomers.length === 0}
                >
                    <DashIcons.Download size={16} />
                    Export CSV
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onNavigate('applications')}>
                    Review applications
                    {pendingCount > 0 && <span className={styles.btnBadge}>{pendingCount}</span>}
                </button>
            </PageHeader>

            <div className={styles.kpis}>
                <KpiTile
                    label="Wholesale customers"
                    value={totalCustomers}
                    note="Approved accounts"
                    tone={styles.toneBlue}
                    icon={<DashIcons.Users size={16} />}
                />
                <KpiTile
                    label="Pending applications"
                    value={statsReady ? pendingCount : null}
                    note={pendingCount > 0 ? 'Waiting for your review' : 'All caught up'}
                    tone={styles.toneAmber}
                    icon={<DashIcons.Clock size={16} />}
                />
                <KpiTile
                    label="Access groups"
                    value={accessGroupsLoaded ? accessGroups.length : null}
                    note="Customer tiers"
                    tone={styles.toneGreen}
                    icon={<DashIcons.Grid size={16} />}
                />
                <KpiTile
                    label="Active pricing rules"
                    value={statsReady ? stats.activePricingRules ?? 0 : null}
                    note="Applied at checkout"
                    tone={styles.tonePink}
                    icon={<DashIcons.Tag size={16} />}
                />
            </div>

            <SitePluginsCard />

            <div className={styles.body}>
                <section className={`${styles.card} ${styles.tableCard}`} aria-label="Customers">
                    <SearchFilters
                        title="All customers"
                        count={filteredCustomers.length}
                        searchTerm={searchTerm}
                        setSearchTerm={handleSearchChange}
                        accessGroups={accessGroups}
                        groupFilter={groupFilter}
                        setGroupFilter={setGroupFilter}
                    />
                    {isLoading ? (
                        <LoadingState message="Loading customers..." />
                    ) : (
                        <CustomerTable
                            customers={filteredCustomers}
                            accessGroups={accessGroups}
                            loadingActions={loadingActions}
                            onEditCustomer={handleEditCustomer}
                            onDeleteCustomer={handleDeleteCustomer}
                            isFiltered={!!searchTerm || !!groupFilter}
                        />
                    )}
                </section>

                <aside className={styles.rail}>
                    <section className={`${styles.card} ${styles.railCard}`} aria-labelledby="needs-review-title">
                        <div className={styles.railHead}>
                            <h2 id="needs-review-title" className={styles.railTitle}>Needs review</h2>
                            <button type="button" className={styles.linkBtn} onClick={() => onNavigate('applications')}>
                                View all
                            </button>
                        </div>
                        {!statsReady ? (
                            <div className={styles.railEmpty}>Loading applications…</div>
                        ) : pendingPreview.length === 0 ? (
                            <div className={styles.railEmpty}>No applications waiting for review.</div>
                        ) : (
                            pendingPreview.map(app => {
                                const submitted = formatRelativeDate(app.submittedDate);
                                const meta = [app.businessType, submitted && `submitted ${submitted}`].filter(Boolean).join(' · ');
                                return (
                                    <div key={app.id} className={styles.pendingItem}>
                                        <div className={styles.pendingText}>
                                            <span className={styles.pendingName} title={app.businessName}>{app.businessName}</span>
                                            {meta && <span className={styles.pendingMeta}>{meta}</span>}
                                        </div>
                                        <button type="button" className={styles.reviewBtn} onClick={() => onNavigate('applications')}>
                                            Review
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </section>

                    <section className={`${styles.card} ${styles.railCard}`} aria-labelledby="quick-actions-title">
                        <h2 id="quick-actions-title" className={styles.railTitle}>Quick actions</h2>
                        <div>
                            <button type="button" className={styles.quickAction} onClick={() => onNavigate('pricing')}>
                                <span className={`${styles.kpiIcon} ${styles.tonePink}`}><DashIcons.Plus size={16} /></span>
                                <span className={styles.navText}>New pricing rule</span>
                                <span className={styles.chevron}><DashIcons.ChevronRight size={16} /></span>
                            </button>
                            <button type="button" className={styles.quickAction} onClick={() => onNavigate('groups')}>
                                <span className={`${styles.kpiIcon} ${styles.toneGreen}`}><DashIcons.Plus size={16} /></span>
                                <span className={styles.navText}>New access group</span>
                                <span className={styles.chevron}><DashIcons.ChevronRight size={16} /></span>
                            </button>
                            <button type="button" className={styles.quickAction} onClick={() => onNavigate('settings')}>
                                <span className={`${styles.kpiIcon} ${styles.toneBlue}`}><DashIcons.File size={16} /></span>
                                <span className={styles.navText}>Edit application form</span>
                                <span className={styles.chevron}><DashIcons.ChevronRight size={16} /></span>
                            </button>
                        </div>
                    </section>

                    {showBanner && (
                        <a className={styles.promo} href={REQUEST_A_QUOTE_URL} target="_blank" rel="noopener noreferrer">
                            <span className={styles.promoEyebrow}>From WD Tech</span>
                            <span className={styles.promoTitle}>Let buyers request quotes from the cart</span>
                            <span className={styles.promoLink}>Get Request a Quote →</span>
                        </a>
                    )}
                </aside>
            </div>

            <EditCustomerModal
                isOpen={showEditModal}
                customer={editingCustomer}
                editForm={editForm}
                accessGroups={accessGroups}
                isLoading={loadingActions['update'] || false}
                onClose={handleCloseModal}
                onSubmit={handleUpdateCustomer}
                onFormChange={handleFormChange}
            />

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                customerName={customerToDelete?.businessName || ''}
                isLoading={customerToDelete ? !!loadingActions[`delete-${customerToDelete.id}`] : false}
                onConfirm={confirmDeleteCustomer}
                onCancel={cancelDeleteCustomer}
            />
        </div>
    );
};
