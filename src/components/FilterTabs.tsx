import React, { type FC } from 'react';
import { type FilterType } from './AccessGroupTypes';
import { type AccessGroup } from './AccessGroupType';
import { Tabs } from './ui';

interface FilterTabsProps {
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
  groups: AccessGroup[];
}

export const FilterTabs: FC<FilterTabsProps> = ({
  activeFilter,
  setActiveFilter,
  groups
}) => {
  const getFilterCount = (filterType: FilterType): number => {
    return groups.filter((group) => {
      const memberCount = Array.isArray(group.members) ? group.members.length : 0;
      switch (filterType) {
        case 'active':
          return memberCount > 0;
        case 'empty':
          return memberCount === 0;
        default:
          return true;
      }
    }).length;
  };

  const filterOptions = [
    { id: 'all', title: `All (${groups.length})` },
    { id: 'active', title: `Active (${getFilterCount('active')})` },
    { id: 'empty', title: `Empty (${getFilterCount('empty')})` }
  ];

  return (
    <Tabs
      aria-label="Filter groups"
      activeId={activeFilter}
      onClick={(item) => setActiveFilter(item.id as FilterType)}
      items={filterOptions}
    />
  );
};
