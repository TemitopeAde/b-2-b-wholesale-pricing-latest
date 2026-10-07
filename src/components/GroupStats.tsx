import React, { type FC } from 'react';
import { type AccessGroup } from './AccessGroupType';
import { StatGrid, StatTile } from './ui';
import { DashIcons } from './Dashboard/icons';

interface GroupStatsProps {
    groups: AccessGroup[];
    filteredGroups: AccessGroup[];
}

export const GroupStats: FC<GroupStatsProps> = ({ groups }) => {
    const totalMembers = groups.reduce((acc, group) => {
        return acc + (Array.isArray(group.members) ? group.members.length : 0);
    }, 0);

    const activeGroups = groups.filter(group =>
        Array.isArray(group.members) && group.members.length > 0
    ).length;

    return (
        <StatGrid>
            <StatTile label="Total groups" value={groups.length} note="Customer tiers" icon={<DashIcons.Grid size={16} />} tone="blue" />
            <StatTile label="Active groups" value={activeGroups} note="With at least one member" icon={<DashIcons.CheckCircle size={16} />} tone="green" />
            <StatTile label="Total members" value={totalMembers} note="Across all groups" icon={<DashIcons.Users size={16} />} tone="pink" />
        </StatGrid>
    );
};
