
import { type AccessGroup, type FilterType } from './AccessGroupTypes';


export const getGroupStatus = (group: AccessGroup) => {
    const memberCount = Array.isArray(group.members) ? group.members.length : 0;
    return {
        isActive: memberCount > 0,
        memberCount,
    };
};

export const filterGroups = (groups: AccessGroup[], filterType: FilterType): AccessGroup[] => {
    return groups.filter((group) => {
        const { memberCount } = getGroupStatus(group);

        switch (filterType) {
            case 'active':
                return memberCount > 0;
            case 'empty':
                return memberCount === 0;

            default:
                return true;
        }
    });
};

export const calculateGroupStats = (groups: AccessGroup[]) => {
    const totalMembers = groups.reduce((acc, group) => {
        return acc + (Array.isArray(group.members) ? group.members.length : 0);
    }, 0);

    const activeGroups = groups.filter(group => {
        const { isActive } = getGroupStatus(group);
        return isActive;
    }).length;



    return {
        totalGroups: groups.length,
        activeGroups,
        totalMembers,
    };
};

export const sortGroups = (groups: AccessGroup[], sortBy: 'name' | 'members' | 'discount' | 'created', sortOrder: 'asc' | 'desc' = 'asc'): AccessGroup[] => {
    return [...groups].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'members':
                aValue = Array.isArray(a.members) ? a.members.length : 0;
                bValue = Array.isArray(b.members) ? b.members.length : 0;
                break;

            case 'created':
                // Assuming there's a createdAt field, fallback to name if not
                aValue = (a as any).createdAt || a.name;
                bValue = (b as any).createdAt || b.name;
                break;
            default:
                aValue = a.name;
                bValue = b.name;
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
};

export const searchGroups = (groups: AccessGroup[], searchTerm: string): AccessGroup[] => {
    if (!searchTerm.trim()) return groups;

    const lowercaseSearch = searchTerm.toLowerCase();
    return groups.filter(group =>
        group.name.toLowerCase().includes(lowercaseSearch) ||
        group.description?.toLowerCase().includes(lowercaseSearch) ||
        group.discount.toLowerCase().includes(lowercaseSearch) ||
        group.minOrder.toLowerCase().includes(lowercaseSearch)
    );
};

export const getGroupHealthScore = (group: AccessGroup): number => {
    const { memberCount } = getGroupStatus(group);

    let score = 0;

    // Points for having members
    if (memberCount > 0) score += 40;
    if (memberCount >= 5) score += 20;
    if (memberCount >= 10) score += 20;

    // Points for having a description
    if (group.description && group.description.trim().length > 0) score += 10;

    return Math.min(score, 100);
};


export const validateGroupData = (group: Partial<AccessGroup>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!group.name || group.name.trim().length === 0) {
        errors.push('Group name is required');
    }

    if (group.name && group.name.length > 50) {
        errors.push('Group name must be 50 characters or less');
    }

    let minOrderValue: number | null = null;
    let maxOrderValue: number | null = null;

    if (group.minOrder) {
        minOrderValue = parseFloat(group.minOrder.replace(/[^0-9.]/g, ''));
        if (isNaN(minOrderValue) || minOrderValue <= 1) {
            errors.push('Minimum order must be a valid positive number greater than 1');
        }
    }

    if (group.maxOrder) {
        maxOrderValue = parseFloat(group.maxOrder.replace(/[^0-9.]/g, ''));
        if (isNaN(maxOrderValue) || maxOrderValue <= 1) {
            errors.push('Maximum order must be a valid positive number greater than 1');
        }
    }

    if (minOrderValue !== null && maxOrderValue !== null) {
        if (maxOrderValue < minOrderValue) {
            errors.push('Maximum order must be greater than or equal to minimum order');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};
