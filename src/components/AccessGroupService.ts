import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import { type AccessGroup, type NewAccessGroup, type SetActiveDropdown, type SetEditGroup, type SetGroups, type SetLoadingActions, type SetLoadingData, type SetNewGroup, type SetSelectedGroup, type SetShowCreateForm, type SetShowEditForm, type SetShowMembersModal } from './AccessGroupType';
import { ExtendedFields, getAppInstance } from '../backend/pricing.client';

const COLLECTION_NAME = '@wd-strategies/wholesale-appllication/Accessgroup';

const isOrderValueGreaterThanOne = (value?: string) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) return true;

    const numericValue = Number(trimmedValue);
    return Number.isFinite(numericValue) && numericValue > 1;
};

export const fetchGroups = async (
    setGroups: SetGroups,
    setIsLoadingData: SetLoadingData,
    createDefaultGroups: (setGroups: SetGroups) => Promise<void>
) => {
    try {
        setIsLoadingData(true);
        const results = await items.query(COLLECTION_NAME).find();

        if (results.items.length > 0) {
            const transformedGroups: AccessGroup[] = results.items.map((item: any) => ({
                id: item._id || '',
                name: item.name || '',
                members: Array.isArray(item.members) ? item.members : [],
                minOrder: item.minOrder || '',
                maxOrder: item.maxOrder || '',
                minProducts: item.minProducts || '',
                maxProducts: item.maxProducts || '',
            }));
            setGroups(transformedGroups);
        } else {
            // await createDefaultGroups(setGroups);
        }
    } catch {
        dashboard.showToast({
            message: 'Failed to load access groups',
            type: 'error',
            timeout: 'normal'
        });
        // await createDefaultGroups(setGroups);
    } finally {
        setIsLoadingData(false);
    }
};

export const createDefaultGroups = async (setGroups: SetGroups) => {
    const defaultGroups: NewAccessGroup[] = [

    ];

    try {
        const createdGroups: AccessGroup[] = [];
        for (const group of defaultGroups) {
            const result = await items.insert(COLLECTION_NAME, { ...group, members: [] });
            createdGroups.push({
                id: result._id,
                ...group,
                members: [],
            });
        }
        setGroups(createdGroups);
        dashboard.showToast({
            message: 'Default access groups created successfully',
            type: 'success',
            timeout: 'normal'
        });
    } catch {
        dashboard.showToast({
            message: 'Failed to create default access groups',
            type: 'error',
            timeout: 'normal'
        });
    }
};

export const handleCreateGroup = async (
    newGroup: NewAccessGroup,
    setGroups: SetGroups,
    setNewGroup: SetNewGroup,
    setShowCreateForm: SetShowCreateForm,
    setLoadingActions: SetLoadingActions
) => {
    try {
        if (!isOrderValueGreaterThanOne(newGroup.minOrder) || !isOrderValueGreaterThanOne(newGroup.maxOrder)) {
            dashboard.showToast({
                message: 'Minimum and maximum order must be positive numbers greater than 1',
                type: 'error',
                timeout: 'normal'
            });
            return;
        }

        setLoadingActions(prev => ({ ...prev, 'create': true }));
        const dataToInsert = {
            name: newGroup.name,
            minProducts: newGroup.minProducts,
            maxProducts: newGroup.maxProducts,
            maxOrder: newGroup.maxOrder,
            minOrder: newGroup.minOrder,
            members: [],
        };

        const result = await items.insert(COLLECTION_NAME, dataToInsert);
        const createdGroup: AccessGroup = {
            id: result._id,
            ...dataToInsert,
        };
        setGroups(prev => [...prev, createdGroup]);
        setNewGroup({ name: '', minOrder: '', maxOrder: '', maxProducts: "", minProducts: "" });
        setShowCreateForm(false);
        dashboard.showToast({
            message: 'Group successfully created',
            type: 'success',
            timeout: 'normal'
        });
    } catch {
        dashboard.showToast({
            message: 'Failed to create group',
            type: 'error',
            timeout: 'normal'
        });
    } finally {
        setLoadingActions(prev => {
            const newState = { ...prev };
            delete newState['create'];
            return newState;
        });
    }
};

export const handleEditGroup = async (
    groupId: string,
    editGroup: AccessGroup,
    setGroups: SetGroups,
    setShowEditForm: SetShowEditForm,
    setEditGroup: SetEditGroup,
    setLoadingActions: SetLoadingActions
) => {
    try {
        if (!editGroup.name || !editGroup.name.trim()) {
            dashboard.showToast({
                message: 'Access group name is required',
                type: 'error',
                timeout: 'normal'
            });
            return;
        }

        if (!isOrderValueGreaterThanOne(editGroup.minOrder) || !isOrderValueGreaterThanOne(editGroup.maxOrder)) {
            dashboard.showToast({
                message: 'Minimum and maximum order must be positive numbers greater than 1',
                type: 'error',
                timeout: 'normal'
            });
            return;
        }

        setLoadingActions(prev => ({ ...prev, [`edit-${groupId}`]: true }));
        const dataToUpdate = {
            _id: groupId,
            name: editGroup.name,
            maxProducts: editGroup.maxProducts,
            minProducts: editGroup.minProducts,
            minOrder: editGroup.minOrder,
            maxOrder: editGroup.maxOrder,
            members: editGroup.members,
        };
        await items.update(COLLECTION_NAME, dataToUpdate);
        setGroups(prev => prev.map(group => group.id === groupId ? { ...editGroup } : group));
        setShowEditForm(false);
        setEditGroup(null);
        dashboard.showToast({
            message: 'Group successfully updated',
            type: 'success',
            timeout: 'normal'
        });
    } catch {
        dashboard.showToast({
            message: 'Failed to update group',
            type: 'error',
            timeout: 'normal'
        });
    } finally {
        setLoadingActions(prev => {
            const newState = { ...prev };
            delete newState[`edit-${groupId}`];
            return newState;
        });
    }
};

export const handleManageMembers = async (
    groupId: string,
    groups: AccessGroup[],
    setSelectedGroup: SetSelectedGroup,
    setShowMembersModal: SetShowMembersModal,
    setLoadingActions: SetLoadingActions
) => {
    try {
        setLoadingActions(prev => ({ ...prev, [`members-${groupId}`]: true }));
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
        const group = groups.find(g => g.id === groupId);
        if (group) {
            setSelectedGroup(group);
            setShowMembersModal(true);
        }
    } catch {
        dashboard.showToast({
            message: 'Failed to load members',
            type: 'error',
            timeout: 'normal'
        });
    } finally {
        setLoadingActions(prev => {
            const newState = { ...prev };
            delete newState[`members-${groupId}`];
            return newState;
        });
    }
};

export const handleDeleteGroup = async (
    groupId: string,
    setGroups: SetGroups,
    setActiveDropdown: SetActiveDropdown,
    setLoadingActions: SetLoadingActions
) => {
    try {
        setLoadingActions(prev => ({ ...prev, [`delete-${groupId}`]: true }));
        await items.remove(COLLECTION_NAME, groupId);
        setGroups(prev => prev.filter(group => group.id !== groupId));
        setActiveDropdown(null);
        dashboard.showToast({
            message: 'Group successfully deleted',
            type: 'success',
            timeout: 'normal'
        });
    } catch {
        dashboard.showToast({
            message: 'Failed to delete group',
            type: 'error',
            timeout: 'normal'
        });
    } finally {
        setLoadingActions(prev => {
            const newState = { ...prev };
            delete newState[`delete-${groupId}`];
            return newState;
        });
    }
};
