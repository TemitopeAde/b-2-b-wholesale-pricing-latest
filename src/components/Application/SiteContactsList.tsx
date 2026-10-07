import React, { type FC, useState, useEffect, useRef } from 'react';
import { dashboard } from '@wix/dashboard';
import { getAllContacts, getConfiguration, getContact, updateContact, sendWholesaleApprovalEmail, sendWholesaleRejectionEmail } from '../../backend/pricing.client';
import { ConfirmationModal } from './ConfirmationModal';
import {
  Badge,
  Button,
  Card,
  CellStack,
  Checkbox,
  type Column,
  DataTable,
  EmptyState,
  LoadingBlock,
  Pagination,
  RowActions,
  Search,
  SelectionBar,
  TableFooter,
  Text,
  VisuallyHidden,
} from '../ui';
import { DashIcons } from '../Dashboard/icons';

interface Contact {
  _id: string;
  info?: {
    name?: {
      first?: string | null;
      last?: string | null;
    } | null;
    extendedFields?: {
      items?: {
        [key: string]: string;
      } | null;
    } | null;
  } | null;
  primaryInfo?: {
    email?: string | null;
  } | null;
  source?: {
    _createdDate?: string | null;
  } | null;
  revision?: string | number | null;
}

const PAGE_SIZE = 50;

export const SiteContactsList: FC = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchContacts(currentPage, searchQuery);
  }, [currentPage]);

  const fetchContacts = async (page: number, search: string = '') => {
    try {
      setIsLoading(true);
      const result = await getAllContacts(page, PAGE_SIZE, search);
      setContacts(result.contacts || []);
      setTotalContacts(result.totalCount || 0);
    } catch {
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchContacts(1, value);
    }, 400);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setCurrentPage(1);
    fetchContacts(1, '');
  };

  const getCustomerStatus = (contact: Contact): string => {
    const extendedFields = contact.info?.extendedFields?.items || {};
    const customerFieldKey = Object.keys(extendedFields).find(key => key.includes('customer'));
    return customerFieldKey ? extendedFields[customerFieldKey] : '';
  };

  const isWholesale = (contact: Contact): boolean => {
    return getCustomerStatus(contact) === 'wholesale';
  };

  // Server-side filtering is used, so filteredContacts is no longer needed.
  // We'll use the 'contacts' state directly from now on.

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleApproveClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowConfirmApprove(true);
  };

  const handleRevokeClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowConfirmRevoke(true);
  };

  const confirmApprove = async () => {
    if (!selectedContactId) return;
    try {
      setLoadingActions(prev => ({ ...prev, [`${selectedContactId}-approve`]: true }));
      const contactResponse = await getContact(selectedContactId);
      const contact = contacts.find(c => c._id === selectedContactId);
      const email = contact?.primaryInfo?.email;

      if (contactResponse.revision === undefined || contactResponse.revision === null) {
        throw new Error('The contact has no revision and cannot be approved. Refresh and try again.');
      }

      await updateContact(selectedContactId, Number(contactResponse.revision), "wholesale");
      const updatedContactResponse = await getContact(selectedContactId);
      setContacts(prev => prev.map(c => c._id === selectedContactId ? { ...c, ...updatedContactResponse } : c));

      if (email) {
        const emailConfig = await getConfiguration();
        if (emailConfig?.notificationSettings?.approvalEmails ?? true) {
          await sendWholesaleApprovalEmail(email);
        }
      }
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : 'Unable to approve this contact.',
        type: 'error',
        timeout: 'normal',
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[`${selectedContactId}-approve`];
        return newState;
      });
      setShowConfirmApprove(false);
      setSelectedContactId(null);
    }
  };

  const confirmRevoke = async () => {
    if (!selectedContactId) return;
    try {
      setLoadingActions(prev => ({ ...prev, [`${selectedContactId}-revoke`]: true }));
      const contactResponse = await getContact(selectedContactId);
      const contact = contacts.find(c => c._id === selectedContactId);
      const email = contact?.primaryInfo?.email;

      if (contactResponse.revision === undefined || contactResponse.revision === null) {
        throw new Error('The contact has no revision and cannot be revoked. Refresh and try again.');
      }

      await updateContact(selectedContactId, Number(contactResponse.revision), "");
      const updatedContactResponse = await getContact(selectedContactId);
      setContacts(prev => prev.map(c => c._id === selectedContactId ? { ...c, ...updatedContactResponse } : c));

      if (email) {
        const emailConfig = await getConfiguration();
        if (emailConfig?.notificationSettings?.rejectionEmails ?? true) {
          await sendWholesaleRejectionEmail(email);
        }
      }
    } catch (error) {
      dashboard.showToast({
        message: error instanceof Error ? error.message : 'Unable to revoke this contact.',
        type: 'error',
        timeout: 'normal',
      });
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[`${selectedContactId}-revoke`];
        return newState;
      });
      setShowConfirmRevoke(false);
      setSelectedContactId(null);
    }
  };

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    try {
      const emailConfig = await getConfiguration();
      const shouldSendEmail = emailConfig?.notificationSettings?.approvalEmails ?? true;
      const failures: string[] = [];
      await Promise.all([...selectedIds].map(async (id) => {
        try {
          const contactResponse = await getContact(id);
          if (contactResponse.revision == null) throw new Error('missing contact revision');
          await updateContact(id, Number(contactResponse.revision), 'wholesale');
          const updated = await getContact(id);
          setContacts(prev => prev.map(c => c._id === id ? { ...c, ...updated } : c));
          const email = contacts.find(c => c._id === id)?.primaryInfo?.email;
          if (email && shouldSendEmail) await sendWholesaleApprovalEmail(email);
        } catch (error) {
          failures.push(id);
        }
      }));
      if (failures.length > 0) {
        dashboard.showToast({ message: `${failures.length} contact approval(s) failed.`, type: 'error', timeout: 'normal' });
      } else {
        dashboard.showToast({ message: 'Selected contacts approved for wholesale pricing.', type: 'success' });
      }
    } catch (error) {
      dashboard.showToast({ message: error instanceof Error ? error.message : 'Unable to approve selected contacts.', type: 'error', timeout: 'normal' });
    } finally {
      setSelectedIds(new Set());
      setBulkLoading(false);
    }
  };

  const handleBulkRevoke = async () => {
    setBulkLoading(true);
    try {
      const emailConfig = await getConfiguration();
      const shouldSendEmail = emailConfig?.notificationSettings?.rejectionEmails ?? true;
      const failures: string[] = [];
      await Promise.all([...selectedIds].map(async (id) => {
        try {
          const contactResponse = await getContact(id);
          if (contactResponse.revision == null) throw new Error('missing contact revision');
          await updateContact(id, Number(contactResponse.revision), '');
          const updated = await getContact(id);
          setContacts(prev => prev.map(c => c._id === id ? { ...c, ...updated } : c));
          const email = contacts.find(c => c._id === id)?.primaryInfo?.email;
          if (email && shouldSendEmail) await sendWholesaleRejectionEmail(email);
        } catch (error) {
          failures.push(id);
        }
      }));
      if (failures.length > 0) {
        dashboard.showToast({ message: `${failures.length} contact revoke(s) failed.`, type: 'error', timeout: 'normal' });
      } else {
        dashboard.showToast({ message: 'Selected wholesale access revoked.', type: 'success' });
      }
    } catch (error) {
      dashboard.showToast({ message: error instanceof Error ? error.message : 'Unable to revoke selected contacts.', type: 'error', timeout: 'normal' });
    } finally {
      setSelectedIds(new Set());
      setBulkLoading(false);
    }
  };

  const allPageIds = contacts.map(c => c._id);
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));
  const someSelected = allPageIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allPageIds.forEach(id => next.delete(id));
      } else {
        allPageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const columns: Column<Contact>[] = [
    {
      title: <Checkbox aria-label="Select all on this page" checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />,
      width: '48px',
      render: (row) => (
        <Checkbox aria-label="Select contact" checked={selectedIds.has(row._id)} onChange={() => toggleOne(row._id)} />
      ),
    },
    {
      title: 'Contact',
      render: (row) => {
        const firstName = row.info?.name?.first || '';
        const lastName = row.info?.name?.last || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const email = row.primaryInfo?.email || 'No email';
        return (
          <CellStack
            primary={fullName || email}
            secondary={fullName && fullName !== email ? email : undefined}
            title={fullName || email}
          />
        );
      },
    },
    {
      title: 'Pricing',
      width: '140px',
      render: (row) => {
        const wholesale = isWholesale(row);
        return <Badge tone={wholesale ? 'success' : 'neutral'}>{wholesale ? 'Wholesale' : 'Retail'}</Badge>;
      },
    },
    {
      title: 'Created',
      width: '140px',
      render: (row) => formatDate(row.source?._createdDate || undefined),
    },
    {
      title: <VisuallyHidden>Actions</VisuallyHidden>,
      align: 'right',
      width: '180px',
      render: (row) => {
        const wholesale = isWholesale(row);
        const busy = !!(loadingActions[`${row._id}-approve`] || loadingActions[`${row._id}-revoke`]);
        return (
          <RowActions
            primaryAction={{
              text: wholesale ? 'Revoke access' : 'Grant wholesale',
              variant: wholesale ? 'dangerSecondary' : 'secondary',
              icon: wholesale ? <DashIcons.Undo size={14} /> : <DashIcons.Check size={14} />,
              onClick: () => wholesale ? handleRevokeClick(row._id) : handleApproveClick(row._id),
              disabled: busy,
              loading: busy,
            }}
          />
        );
      },
    },
  ];

  const totalPages = Math.ceil(totalContacts / PAGE_SIZE);
  const selectedContacts = contacts.filter(c => selectedIds.has(c?._id || ''));
  const allNonWholesale = selectedContacts.length > 0 && selectedContacts.every(c => !isWholesale(c));
  const allWholesale = selectedContacts.length > 0 && selectedContacts.every(c => isWholesale(c));

  return (
    <>
      <Card aria-label="Site contacts">
        <Card.Header
          title="Site contacts"
          subtitle="Grant or revoke wholesale pricing for any contact on your site."
        >
          <div style={{ width: 320, maxWidth: '100%' }}>
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={handleSearchClear}
              placeholder="Search by name, email or phone"
            />
          </div>
        </Card.Header>

        {isLoading ? (
          <LoadingBlock message="Loading contacts…" />
        ) : (
          <>
            {selectedIds.size > 0 && (
              <SelectionBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} disabled={bulkLoading}>
                {allNonWholesale && (
                  <Button size="small" variant="success" onClick={handleBulkApprove} loading={bulkLoading} prefixIcon={<DashIcons.Check size={14} />}>
                    Grant wholesale
                  </Button>
                )}
                {allWholesale && (
                  <Button size="small" variant="dangerSecondary" onClick={handleBulkRevoke} loading={bulkLoading} prefixIcon={<DashIcons.Undo size={14} />}>
                    Revoke access
                  </Button>
                )}
                {!allNonWholesale && !allWholesale && (
                  <Text size="small" secondary>Select only wholesale or only retail contacts to act on them together.</Text>
                )}
              </SelectionBar>
            )}

            <DataTable
              data={contacts as Contact[]}
              columns={columns}
              rowKey={(row) => row._id}
              isRowSelected={(row) => selectedIds.has(row._id)}
              emptyState={
                <EmptyState
                  icon={<DashIcons.Users size={22} />}
                  title="No contacts found"
                  subtitle={searchQuery ? 'Try a different search.' : 'Contacts on your site will appear here.'}
                />
              }
            />

            {contacts.length > 0 && (
              <TableFooter>
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + contacts.length} of {totalContacts}
                </span>
                <Pagination currentPage={currentPage} totalPages={totalPages} onChange={({ page }) => setCurrentPage(page)} />
              </TableFooter>
            )}
          </>
        )}
      </Card>

      {showConfirmApprove && (
        <ConfirmationModal
          title="Grant wholesale pricing?"
          message="This contact will see wholesale prices the next time they log in."
          subMessage="If approval emails are on in Settings, they'll be notified."
          confirmText="Grant wholesale"
          tone="success"
          isLoading={selectedContactId ? !!loadingActions[`${selectedContactId}-approve`] : false}
          onConfirm={confirmApprove}
          onCancel={() => setShowConfirmApprove(false)}
        />
      )}

      {showConfirmRevoke && (
        <ConfirmationModal
          title="Revoke wholesale access?"
          message="This contact will lose wholesale pricing."
          subMessage="If rejection emails are on in Settings, they'll be notified."
          confirmText="Revoke access"
          tone="danger"
          isLoading={selectedContactId ? !!loadingActions[`${selectedContactId}-revoke`] : false}
          onConfirm={confirmRevoke}
          onCancel={() => setShowConfirmRevoke(false)}
        />
      )}
    </>
  );
};
