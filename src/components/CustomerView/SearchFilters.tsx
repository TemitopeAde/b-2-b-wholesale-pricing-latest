import React from 'react';
import { type AccessGroup } from '../AccessGroupType';
import { DashIcons } from '../Dashboard/icons';
import styles from '../Dashboard/dashboard.module.css';

interface SearchFiltersProps {
    title: string;
    count: number;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    accessGroups: AccessGroup[];
    groupFilter: string;
    setGroupFilter: (groupId: string) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
    title,
    count,
    searchTerm,
    setSearchTerm,
    accessGroups,
    groupFilter,
    setGroupFilter,
}) => {
    return (
        <div className={styles.toolbar}>
            <h2 className={styles.cardTitle}>
                {title}
                <span className={styles.cardCount}>{count}</span>
            </h2>

            <label className={styles.search}>
                <DashIcons.Search size={16} />
                <span className={styles.visuallyHidden}>Search customers</span>
                <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search by name or email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        type="button"
                        className={styles.searchClear}
                        aria-label="Clear search"
                        onClick={() => setSearchTerm('')}
                    >
                        <DashIcons.Close size={14} />
                    </button>
                )}
            </label>

            {accessGroups.length > 0 && (
                <label>
                    <span className={styles.visuallyHidden}>Filter by access group</span>
                    <select
                        className={styles.select}
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                    >
                        <option value="">All access groups</option>
                        {accessGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                    </select>
                </label>
            )}
        </div>
    );
};
