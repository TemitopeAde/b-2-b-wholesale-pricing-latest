import React, { type FC, useEffect, useState } from 'react';
import { type FormData } from '../Application';
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  CellStack,
  Checkbox,
  type Column,
  DataTable,
  EmptyState,
  LoadingBlock,
  Pagination,
  type RowAction,
  RowActions,
  SelectionBar,
  TableFooter,
  Tabs,
  Text,
  VisuallyHidden,
} from '../ui';
import { DashIcons } from '../Dashboard/icons';

interface ApplicationsListProps {
  applications: FormData[];
  isLoading: boolean;
  loadingActions: { [key: string]: boolean };
  onView: (application: FormData) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRevoke: (id: string) => void;
  onBulkApprove: (ids: string[]) => Promise<void>;
  onBulkReject: (ids: string[]) => Promise<void>;
}

type StatusFilter = 'all' | FormData['status'];

const PAGE_SIZE = 20;

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (!dateString || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const ApplicationsList: FC<ApplicationsListProps> = ({
  applications,
  isLoading,
  loadingActions,
  onView,
  onApprove,
  onReject,
  onRevoke,
  onBulkApprove,
  onBulkReject,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const visible = statusFilter === 'all' ? applications : applications.filter(a => a.status === statusFilter);
  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const paged = visible.slice(firstIndex, firstIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages]);

  const runBulk = async (action: (ids: string[]) => Promise<void>) => {
    setBulkLoading(true);
    try {
      await action([...selectedIds]);
    } finally {
      setSelectedIds(new Set());
      setBulkLoading(false);
    }
  };

  const pageIds = paged.map(a => a.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someSelected = pageIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
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

  const countFor = (status: StatusFilter) =>
    status === 'all' ? applications.length : applications.filter(a => a.status === status).length;

  const columns: Column<FormData>[] = [
    {
      title: <Checkbox aria-label="Select all on this page" checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />,
      width: '48px',
      render: (row) => (
        <Checkbox
          aria-label={`Select ${row.businessName || row.contactName}`}
          checked={selectedIds.has(row.id)}
          onChange={() => toggleOne(row.id)}
        />
      ),
    },
    {
      title: 'Applicant',
      render: (row) => (
        <CellStack
          primary={row.businessName || row.contactName || row.email || 'Unnamed applicant'}
          secondary={[row.businessName ? row.contactName : null, row.email].filter(Boolean).join(' · ')}
          title={row.businessName || row.contactName}
        />
      ),
    },
    {
      title: 'Business type',
      width: '160px',
      render: (row) => row.businessType || <Text secondary size="small">—</Text>,
    },
    {
      title: 'Status',
      width: '120px',
      render: (row) => <Badge tone={STATUS_TONE[row.status] || 'neutral'}>{capitalize(row.status)}</Badge>,
    },
    {
      title: 'Submitted',
      width: '130px',
      render: (row) => formatDate(row.submittedDate),
    },
    {
      title: <VisuallyHidden>Actions</VisuallyHidden>,
      align: 'right',
      width: '140px',
      render: (row) => {
        const secondaryActions: RowAction[] = [];

        if (row.status === 'pending' || row.status === 'rejected') {
          secondaryActions.push({
            text: 'Approve',
            icon: <DashIcons.Check size={16} />,
            onClick: () => onApprove(row.id),
            disabled: loadingActions[`${row.id}-approved`],
          });
        }
        if (row.status === 'pending') {
          secondaryActions.push({
            text: 'Reject',
            icon: <DashIcons.X size={16} />,
            onClick: () => onReject(row.id),
            disabled: loadingActions[`${row.id}-rejected`],
            danger: true,
          });
        }
        if (row.status === 'approved') {
          secondaryActions.push({
            text: 'Revoke approval',
            icon: <DashIcons.Undo size={16} />,
            onClick: () => onRevoke(row.id),
            disabled: loadingActions[`${row.id}-pending`],
            danger: true,
          });
        }

        return (
          <RowActions
            primaryAction={{ text: 'View', icon: <DashIcons.Eye size={14} />, onClick: () => onView(row) }}
            secondaryActions={secondaryActions}
          />
        );
      },
    },
  ];

  const selectedApps = applications.filter(a => selectedIds.has(a.id));
  const allApprovable = selectedApps.length > 0 && selectedApps.every(a => a.status === 'pending' || a.status === 'rejected');
  const allRejectable = selectedApps.length > 0 && selectedApps.every(a => a.status === 'pending' || a.status === 'approved');

  return (
    <Card aria-label="Applications">
      <Card.Header title="Applications" subtitle="Review who has applied for wholesale access.">
        <Tabs
          aria-label="Filter by status"
          activeId={statusFilter}
          onClick={(item) => setStatusFilter(item.id as StatusFilter)}
          items={(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(id => ({
            id,
            title: `${id === 'all' ? 'All' : capitalize(id)} (${countFor(id)})`,
          }))}
        />
      </Card.Header>

      {isLoading ? (
        <LoadingBlock message="Loading applications…" />
      ) : (
        <>
          {selectedIds.size > 0 && (
            <SelectionBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} disabled={bulkLoading}>
              {allApprovable && (
                <Button size="small" variant="success" onClick={() => runBulk(onBulkApprove)} loading={bulkLoading} prefixIcon={<DashIcons.Check size={14} />}>
                  Approve selected
                </Button>
              )}
              {allRejectable && (
                <Button size="small" variant="dangerSecondary" onClick={() => runBulk(onBulkReject)} disabled={bulkLoading} prefixIcon={<DashIcons.X size={14} />}>
                  Reject selected
                </Button>
              )}
              {!allApprovable && !allRejectable && (
                <Text size="small" secondary>Select applications with the same status to act on them together.</Text>
              )}
            </SelectionBar>
          )}

          <DataTable
            data={paged}
            columns={columns}
            rowKey={(row) => row.id}
            isRowSelected={(row) => selectedIds.has(row.id)}
            emptyState={
              <EmptyState
                icon={<DashIcons.File size={22} />}
                title={statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter} applications`}
                subtitle={statusFilter === 'all'
                  ? 'New wholesale applications from your site will appear here.'
                  : 'Try another status filter.'}
              />
            }
          />

          {visible.length > 0 && (
            <TableFooter>
              <span>Showing {firstIndex + 1}–{firstIndex + paged.length} of {visible.length}</span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onChange={({ page }) => setCurrentPage(page)} />
            </TableFooter>
          )}
        </>
      )}
    </Card>
  );
};
