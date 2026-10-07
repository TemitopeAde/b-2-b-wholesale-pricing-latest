import React, { type FC } from 'react';
import { type FilterType } from './AccessGroupTypes';
import { Button, Card, EmptyState as EmptyStateView } from './ui';
import { DashIcons } from './Dashboard/icons';

interface EmptyStateProps {
    activeFilter: FilterType;
    totalGroups: number;
    onCreateClick: () => void;
}

const CONTENT: Record<FilterType, { title: string; description: string; showCreateButton: boolean }> = {
    all: {
        title: 'No access groups yet',
        description: 'Create your first access group to start organizing customers and their pricing.',
        showCreateButton: true,
    },
    active: {
        title: 'No active groups',
        description: 'No groups have members yet. Add members to a group to activate it.',
        showCreateButton: false,
    },
    empty: {
        title: 'No empty groups',
        description: 'Every group has members assigned.',
        showCreateButton: false,
    },
    'high-discount': {
        title: 'No high discount groups',
        description: 'No groups currently offer discounts of 15% or higher.',
        showCreateButton: true,
    },
    'low-discount': {
        title: 'No low discount groups',
        description: 'No groups currently offer discounts below 15%.',
        showCreateButton: true,
    },
};

export const EmptyState: FC<EmptyStateProps> = ({ activeFilter, totalGroups, onCreateClick }) => {
    const content = CONTENT[activeFilter] || CONTENT.all;
    const hint = totalGroups > 0 && activeFilter !== 'all'
        ? ` Switch to “All” to see your ${totalGroups} existing group${totalGroups === 1 ? '' : 's'}.`
        : '';

    return (
        <Card>
            <EmptyStateView
                icon={<DashIcons.Users size={22} />}
                title={content.title}
                subtitle={content.description + hint}
                action={content.showCreateButton && (
                    <Button onClick={onCreateClick} prefixIcon={<DashIcons.Plus size={16} />}>
                        Create group
                    </Button>
                )}
            />
        </Card>
    );
};
