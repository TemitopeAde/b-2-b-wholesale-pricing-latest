import { items } from "@wix/data";
import { type AccessGroup } from "../AccessGroupType";
import { type Member } from "../ManageMember";
import { type CustomerStats, type WholesaleApplication } from "./types";
import { dashboard } from "@wix/dashboard";
const COLLECTION_NAME = '@wd-strategies/wholesale-appllication/Accessgroup';

export const formatCurrency = (amount: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
    }).format(amount);
};

export const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
};

export const getAccessGroupNames = (groupIds: string[], accessGroups: AccessGroup[]): string => {
    if (!groupIds || groupIds.length === 0) return 'No Groups Assigned';
    
    return groupIds
        .map(id => accessGroups.find(group => group.id === id)?.name || 'Unknown')
        .join(', ');
};

export const calculateCustomerStats = (customers: WholesaleApplication[]): CustomerStats => {
    const approved = customers.filter(c => c.status === 'approved').length;
    const pending = customers.filter(c => c.status === 'pending').length;
    const rejected = customers.filter(c => c.status === 'rejected').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const total = customers.length;

    return {
        approved,
        pending,
        rejected,
        totalRevenue,
        total
    };
};

export const exportCustomersToCSV = (
    customers: WholesaleApplication[],
    accessGroups: AccessGroup[]
): void => {
    const csvContent = [
        'Business Name,Contact Name,Email,Phone,Business Type,Status,Access Groups,Total Orders,Total Spent,Last Order,Submitted Date',
        ...customers.map(customer => [
            customer.businessName,
            customer.contactName,
            customer.email,
            customer.phone,
            customer.businessType,
            customer.status,
            getAccessGroupNames(customer.accessGroupIds, accessGroups),
            customer.totalOrders,
            customer.totalSpent,
            customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never',
            new Date(customer.submittedDate).toLocaleDateString()
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wholesale-customers.csv';
    a.click();
    window.URL.revokeObjectURL(url);
};

export const filterCustomers = (
    customers: WholesaleApplication[],
    searchTerm: string,
    statusFilter: string
): WholesaleApplication[] => {
    return customers.filter(customer => {
        const matchesSearch = customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            customer.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            customer.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
};



export const memberExistsInAccessGroups = (
    memberId: string, 
    accessGroups: AccessGroup[]
): boolean => {
    return accessGroups.some(group =>
        Array.isArray(group.members) &&
        group.members.some((member: Member) => member.id === memberId)
    );
};


export const getMemberGroupNames = (
    memberId: string, 
    accessGroups: AccessGroup[]
): string[] => {
    const groupNames: string[] = [];
    
    accessGroups.forEach(group => {
        if (Array.isArray(group.members) && 
            group.members.some((member: Member) => member.id === memberId)) {
            groupNames.push(group.name);
        }
    });
    
    return groupNames;
};

export const removeMemberFromGroup = async (
    groupId: string,
    memberIdToRemove: string,
    currentGroup: AccessGroup
): Promise<AccessGroup | null> => {
    try {
        // Filter out the member to remove
        const updatedMembers = currentGroup.members?.filter(member => member.id !== memberIdToRemove) || [];
        
        // Prepare data for update
        const dataToUpdate = {
            _id: groupId,
            name: currentGroup.name,
            maxProducts: currentGroup.maxProducts,
            minProducts: currentGroup.minProducts,
            minOrder: currentGroup.minOrder,
            maxOrder: currentGroup.maxOrder,
            members: updatedMembers,
        };

        // Update the group in database
        await items.update(COLLECTION_NAME, dataToUpdate);
        
        // Return updated group
        return {
            ...currentGroup,
            members: updatedMembers
        };
        
    } catch {
        dashboard.showToast({
            message: `Failed to remove member from ${currentGroup.name}`,
            type: 'error',
            timeout: 'normal'
        });
        return null;
    }
};

export const removeUserFromAllAccessGroups = async (
    memberIdToRemove: string,
    accessGroups: AccessGroup[]
): Promise<AccessGroup[]> => {
    const updatedGroups: AccessGroup[] = [];
    let groupsModified = false;

    for (const group of accessGroups) {
        if (Array.isArray(group.members) && group.members.length > 0) {
            // Check if member exists in this group
            const memberExists = group.members.some(member => member.id === memberIdToRemove);
            
            if (memberExists) {
                groupsModified = true;
                
                // Remove member from this group using the database update function
                const updatedGroup = await removeMemberFromGroup(group.id, memberIdToRemove, group);
                
                if (updatedGroup) {
                    updatedGroups.push(updatedGroup);
                } else {
                    // If update failed, keep original group
                    updatedGroups.push(group);
                }
            } else {
                // No changes to this group
                updatedGroups.push(group);
            }
        } else {
            // Group has no members array or is empty
            updatedGroups.push(group);
        }
    }

    if (groupsModified) {
        dashboard.showToast({
            message: 'Member removed from all access groups',
            type: 'success',
            timeout: 'normal'
        });
    }

    return updatedGroups;
};
