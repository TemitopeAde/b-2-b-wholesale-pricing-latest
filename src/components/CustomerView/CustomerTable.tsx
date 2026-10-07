import React, { useState, useEffect } from 'react';
import { type LoadingActions, type WholesaleApplication } from './types';
import { type AccessGroup } from '../AccessGroupType';
import { getMemberGroupNames } from './Utils';
import { DashIcons } from '../Dashboard/icons';
import styles from '../Dashboard/dashboard.module.css';

interface CustomerTableProps {
    customers: WholesaleApplication[];
    accessGroups: AccessGroup[];
    loadingActions: LoadingActions;
    onEditCustomer: (customer: WholesaleApplication) => void;
    onDeleteCustomer: (customerId: string) => void;
    isFiltered: boolean;
}

const PAGE_SIZE = 10;

const AVATAR_TONES = [
    { background: '#eaeefc', color: '#1f3bb3' },
    { background: '#fcebd2', color: '#8a4b00' },
    { background: '#e3f2ea', color: '#1c6b45' },
    { background: '#f6e6f0', color: '#8e2a66' },
];

const STATUS_CLASS: Record<WholesaleApplication['status'], string> = {
    approved: styles.statusApproved,
    pending: styles.statusPending,
    rejected: styles.statusRejected,
};

const getInitials = (name: string): string => {
    const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
};

const getAvatarTone = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
};

const formatJoinedDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (!dateString || isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CustomerTable: React.FC<CustomerTableProps> = ({
    customers,
    accessGroups,
    loadingActions,
    onEditCustomer,
    onDeleteCustomer,
    isFiltered,
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when customers list changes (e.g. search filter)
    useEffect(() => {
        setCurrentPage(1);
    }, [customers]);

    if (customers.length === 0) {
        return (
            <div className={styles.stateBox}>
                <span className={styles.stateTitle}>No customers found</span>
                <span>
                    {isFiltered
                        ? 'Try a different search or access group.'
                        : 'Approved wholesale applications will appear here.'}
                </span>
            </div>
        );
    }

    const totalPages = Math.ceil(customers.length / PAGE_SIZE);
    const firstIndex = (currentPage - 1) * PAGE_SIZE;
    const pagedCustomers = customers.slice(firstIndex, firstIndex + PAGE_SIZE);

    return (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">Customer</th>
                        <th scope="col">Access groups</th>
                        <th scope="col" className={styles.colStatus}>Status</th>
                        <th scope="col" className={styles.colJoined}>Joined</th>
                        <th scope="col" className={styles.colActions}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pagedCustomers.map(row => {
                        const groupNames = row.memberId ? getMemberGroupNames(row.memberId, accessGroups) : [];
                        const isDeleting = !!loadingActions[`delete-${row.id}`];
                        const showEmail = row.email && row.email !== row.businessName;

                        return (
                            <tr key={row.id}>
                                <td>
                                    <div className={styles.customerCell}>
                                        <span className={styles.avatar} style={getAvatarTone(row.id || row.businessName)} aria-hidden="true">
                                            {getInitials(row.businessName)}
                                        </span>
                                        <div className={styles.customerText}>
                                            <span className={styles.customerName} title={row.businessName}>{row.businessName}</span>
                                            {showEmail && (
                                                <span className={styles.customerEmail} title={row.email}>{row.email}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {groupNames.length > 0 ? (
                                        <div className={styles.chips}>
                                            {groupNames.map(name => (
                                                <span key={name} className={styles.chip}>{name}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className={styles.none}>No group</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`${styles.status} ${STATUS_CLASS[row.status] || ''}`}>
                                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                                    </span>
                                </td>
                                <td>{formatJoinedDate(row.submittedDate)}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            type="button"
                                            className={styles.iconBtn}
                                            aria-label={`Edit ${row.businessName}`}
                                            title="Edit"
                                            onClick={() => onEditCustomer(row)}
                                        >
                                            <DashIcons.Edit size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                            aria-label={`Revoke wholesale access for ${row.businessName}`}
                                            title="Revoke access"
                                            disabled={isDeleting}
                                            onClick={() => onDeleteCustomer(row.id)}
                                        >
                                            {isDeleting ? <span className={styles.spinner} /> : <DashIcons.Trash size={16} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className={styles.pager}>
                <span className={styles.pagerText}>
                    Showing {firstIndex + 1}–{firstIndex + pagedCustomers.length} of {customers.length}
                </span>
                {totalPages > 1 && (
                    <>
                        <button
                            type="button"
                            className={styles.pagerBtn}
                            aria-label="Previous page"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <DashIcons.ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            className={styles.pagerBtn}
                            aria-label="Next page"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <DashIcons.ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>
        </>
    );
};
