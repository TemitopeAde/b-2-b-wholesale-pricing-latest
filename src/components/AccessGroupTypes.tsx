import React from 'react';

// Types for AccessGroupsView and related components

export type FilterType = 'all' | 'active' | 'empty' | 'high-discount' | 'low-discount';

export interface AccessGroup {
    id: string;
    name: string;
    description?: string;
    minOrder: string;
    maxOrder: string;
    members?: Member[];
    createdAt?: string;
    updatedAt?: string;
    isActive?: boolean;
    tags?: string[];
    metadata?: GroupMetadata;
}

export interface Member {
    id: string;
    name: string;
    email: string;
    role?: string;
    joinedAt?: string;
    isActive?: boolean;
}

export interface GroupMetadata {
    totalOrders?: number;
    totalRevenue?: number;
    lastActivity?: string;
    averageOrderValue?: number;
    conversionRate?: number;
}

export interface NewAccessGroup {
    name: string;
    description: string;
    discount: string;
    minOrder: string;
    tags?: string[];
}

export interface LoadingActions {
    [key: string]: boolean;
}

export interface GroupStats {
    totalGroups: number;
    activeGroups: number;
    totalMembers: number;
    highestDiscount: number;
    lowestDiscount: number;
}

export interface GroupFilters {
    search: string;
    status: 'all' | 'active' | 'inactive';
    discountRange: 'all' | 'low' | 'medium' | 'high';
    memberCount: 'all' | 'empty' | 'small' | 'medium' | 'large';
    sortBy: 'name' | 'members' | 'discount' | 'created';
    sortOrder: 'asc' | 'desc';
}

export interface BulkAction {
    type: 'activate' | 'deactivate' | 'delete' | 'addTags' | 'removeTags';
    groupIds: string[];
    payload?: any;
}

// Extended service interfaces
export interface AccessGroupServiceInterface {
    fetchGroups: () => Promise<AccessGroup[]>;
    createGroup: (group: NewAccessGroup) => Promise<AccessGroup>;
    updateGroup: (id: string, updates: Partial<AccessGroup>) => Promise<AccessGroup>;
    deleteGroup: (id: string) => Promise<void>;
    addMemberToGroup: (groupId: string, member: Member) => Promise<AccessGroup>;
    removeMemberFromGroup: (groupId: string, memberId: string) => Promise<AccessGroup>;
    bulkUpdateGroups: (action: BulkAction) => Promise<AccessGroup[]>;
    getGroupAnalytics: (groupId: string) => Promise<GroupMetadata>;
}

// Event types for group operations
export interface GroupEvent {
    type: 'created' | 'updated' | 'deleted' | 'member_added' | 'member_removed';
    groupId: string;
    timestamp: string;
    userId?: string;
    metadata?: any;
}

// Validation schemas
export interface GroupValidationRules {
    name: {
        required: boolean;
        minLength: number;
        maxLength: number;
        pattern?: RegExp;
    };
    description: {
        maxLength: number;
    };
    discount: {
        min: number;
        max: number;
        required: boolean;
    };
    minOrder: {
        min: number;
        required: boolean;
    };
}

export const DEFAULT_VALIDATION_RULES: GroupValidationRules = {
    name: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\s\-_]+$/
    },
    description: {
        maxLength: 200
    },
    discount: {
        min: 0,
        max: 100,
        required: true
    },
    minOrder: {
        min: 0,
        required: false
    }
};

// Filter configuration
export interface FilterConfig {
    key: FilterType;
    label: string;
    description?: string;
    icon?: string;
}

export const FILTER_CONFIGS: FilterConfig[] = [
    { key: 'all', label: 'All Groups', description: 'Show all access groups' },
    { key: 'active', label: 'Active Groups', description: 'Groups with assigned members' },
    { key: 'empty', label: 'Empty Groups', description: 'Groups without members' },
    { key: 'high-discount', label: 'High Discount (15%+)', description: 'Groups offering 15% or higher discounts' },
    { key: 'low-discount', label: 'Low Discount (<15%)', description: 'Groups offering discounts below 15%' }
];

// Component prop types with correct React.Dispatch types
export interface FilterTabsProps {
    activeFilter: FilterType;
    setActiveFilter: React.Dispatch<React.SetStateAction<FilterType>>;
    groups: AccessGroup[];
}

export interface GroupStatsProps {
    groups: AccessGroup[];
    filteredGroups: AccessGroup[];
}

export interface EmptyStateProps {
    activeFilter: FilterType;
    totalGroups: number;
    onCreateClick: () => void;
}

export interface GroupCardProps {
    group: AccessGroup;
    activeDropdown: string | null;
    setActiveDropdown: React.Dispatch<React.SetStateAction<string | null>>;
    loadingActions: LoadingActions;
    setLoadingActions: React.Dispatch<React.SetStateAction<LoadingActions>>;
    setGroups: React.Dispatch<React.SetStateAction<AccessGroup[]>>;
    setEditGroup: React.Dispatch<React.SetStateAction<AccessGroup | null>>;
    setShowEditForm: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedGroup: React.Dispatch<React.SetStateAction<AccessGroup | null>>;
    setShowMembersModal: React.Dispatch<React.SetStateAction<boolean>>;
    groups: AccessGroup[];
}

export interface GroupDropdownMenuProps {
    group: AccessGroup;
    loadingActions: LoadingActions;
    onEditClick: () => void;
    onMembersClick: () => void;
    onDeleteClick: () => void;
}

export interface GroupStatusBadgeProps {
    isActive: boolean;
    memberCount: number;
}

// Type aliases for common state setters
export type SetSelectedGroup = React.Dispatch<React.SetStateAction<AccessGroup | null>>;
export type SetActiveDropdown = React.Dispatch<React.SetStateAction<string | null>>;
export type SetShowModal = React.Dispatch<React.SetStateAction<boolean>>;
export type SetGroups = React.Dispatch<React.SetStateAction<AccessGroup[]>>;
export type SetLoadingActions = React.Dispatch<React.SetStateAction<LoadingActions>>;