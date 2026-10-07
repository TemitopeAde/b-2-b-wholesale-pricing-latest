import React, { type FC } from 'react';
import { type FormData } from '../Application';
import { StatGrid, StatTile } from '../ui';
import { DashIcons } from '../Dashboard/icons';

interface StatsGridProps {
  applications: FormData[];
  getApplicationsByStatus: (status: string) => FormData[];
}

export const StatsGrid: FC<StatsGridProps> = ({
  applications,
  getApplicationsByStatus
}) => (
  <StatGrid>
    <StatTile label="Pending" value={getApplicationsByStatus('pending').length} note="Waiting for review" icon={<DashIcons.Clock size={16} />} tone="amber" />
    <StatTile label="Approved" value={getApplicationsByStatus('approved').length} note="Have wholesale access" icon={<DashIcons.CheckCircle size={16} />} tone="green" />
    <StatTile label="Rejected" value={getApplicationsByStatus('rejected').length} note="Declined applications" icon={<DashIcons.X size={16} />} tone="red" />
    <StatTile label="Total" value={applications.length} note="All applications" icon={<DashIcons.File size={16} />} tone="blue" />
  </StatGrid>
);
