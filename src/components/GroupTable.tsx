import React, { type FC } from 'react';
import { type AccessGroup, type LoadingActions } from './AccessGroupType';
import { GroupStatusBadge } from './GroupBadge';
import { handleManageMembers } from './AccessGroupService';
import { Card, CellStack, type Column, DataTable, EmptyState, RowActions, VisuallyHidden } from './ui';
import { DashIcons } from './Dashboard/icons';

interface GroupTableProps {
    groups: AccessGroup[];
    siteCurrency: string | null;
    loadingActions: LoadingActions;
    setLoadingActions: React.Dispatch<React.SetStateAction<LoadingActions>>;
    setGroups: React.Dispatch<React.SetStateAction<AccessGroup[]>>;
    setEditGroup: React.Dispatch<React.SetStateAction<AccessGroup | null>>;
    setShowEditForm: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedGroup: React.Dispatch<React.SetStateAction<AccessGroup | null>>;
    setShowMembersModal: React.Dispatch<React.SetStateAction<boolean>>;
    onDeleteGroup: (group: AccessGroup) => void;
}

const isValueSet = (value: string | number | undefined) =>
    !!value && (typeof value !== 'string' || value.trim() !== '');

const displayValue = (value: string | number | undefined): string | null => {
    if (!isValueSet(value)) return null;
    const num = typeof value === 'string'
        ? parseFloat(value.replace(/[^0-9.-]/g, ''))
        : Number(value);
    return !isNaN(num) ? num.toLocaleString() : String(value);
};

const formatRange = (min: string | number | undefined, max: string | number | undefined, unit = ''): string => {
    const lo = displayValue(min);
    const hi = displayValue(max);
    const suffix = unit ? ` ${unit}` : '';
    if (lo && hi) return `${lo} – ${hi}${suffix}`;
    if (lo) return `From ${lo}${suffix}`;
    if (hi) return `Up to ${hi}${suffix}`;
    return 'No limit';
};

export const GroupTable: FC<GroupTableProps> = ({
    groups,
    siteCurrency,
    loadingActions,
    setLoadingActions,
    setEditGroup,
    setShowEditForm,
    setSelectedGroup,
    setShowMembersModal,
    onDeleteGroup,
}) => {
    const columns: Column<AccessGroup>[] = [
        {
            title: 'Group',
            render: (group) => {
                const memberCount = Array.isArray(group.members) ? group.members.length : 0;
                return <CellStack primary={group.name} secondary={`${memberCount} member${memberCount === 1 ? '' : 's'}`} title={group.name} />;
            },
        },
        {
            title: 'Status',
            width: '120px',
            render: (group) => {
                const memberCount = Array.isArray(group.members) ? group.members.length : 0;
                return <GroupStatusBadge isActive={memberCount > 0} memberCount={memberCount} />;
            },
        },
        {
            title: 'Order value',
            render: (group) => (
                siteCurrency
                    ? formatRange(group.minOrder, group.maxOrder, siteCurrency)
                    : <span style={{ color: 'var(--wh-muted)' }}>Currency unavailable</span>
            ),
        },
        {
            title: 'Products per order',
            render: (group) => formatRange(group.minProducts, group.maxProducts),
        },
        {
            title: <VisuallyHidden>Actions</VisuallyHidden>,
            align: 'right',
            width: '220px',
            render: (group) => (
                <RowActions
                    primaryAction={{
                        text: 'Manage members',
                        icon: <DashIcons.Users size={14} />,
                        onClick: () => handleManageMembers(
                            group.id, groups, setSelectedGroup, setShowMembersModal, setLoadingActions
                        ),
                        disabled: !!loadingActions[`members-${group.id}`],
                        loading: !!loadingActions[`members-${group.id}`],
                    }}
                    secondaryActions={[
                        {
                            text: 'Edit group',
                            icon: <DashIcons.Edit size={16} />,
                            onClick: () => {
                                setEditGroup(group);
                                setShowEditForm(true);
                            },
                            disabled: !!loadingActions[`edit-${group.id}`],
                        },
                        {
                            text: 'Delete group',
                            icon: <DashIcons.Trash size={16} />,
                            onClick: () => onDeleteGroup(group),
                            disabled: !!loadingActions[`delete-${group.id}`],
                            danger: true,
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <Card aria-label="Access groups">
            <DataTable
                data={groups}
                columns={columns}
                rowKey={(group) => group.id}
                emptyState={<EmptyState title="No groups found" subtitle="Try a different filter." />}
            />
        </Card>
    );
};
