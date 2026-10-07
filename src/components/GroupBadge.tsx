import React, { type FC } from 'react';
import { Badge } from './ui';

interface GroupStatusBadgeProps {
    isActive: boolean;
    memberCount: number;
}

export const GroupStatusBadge: FC<GroupStatusBadgeProps> = ({ isActive }) => (
    <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>
);
