import React from 'react';
import { handleEditGroup } from './AccessGroupService';
import { type AccessGroup, type SetEditGroup, type SetGroups, type SetLoadingActions, type SetShowEditForm } from './AccessGroupType';
import { GroupFormModal } from './GroupFormModal';

interface EditGroupModalProps {
    showEditForm: boolean;
    editGroup: AccessGroup | null;
    setEditGroup: SetEditGroup;
    setShowEditForm: SetShowEditForm;
    setGroups: SetGroups;
    loadingActions: { [key: string]: boolean };
    setLoadingActions: SetLoadingActions;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
    showEditForm,
    editGroup,
    setEditGroup,
    setShowEditForm,
    setGroups,
    loadingActions,
    setLoadingActions,
}) => {
    if (!editGroup) return null;

    const handleCancel = () => {
        setShowEditForm(false);
        setEditGroup(null);
    };

    return (
        <GroupFormModal
            isOpen={showEditForm}
            mode="edit"
            values={editGroup}
            onChange={(field, value) => setEditGroup(prev => prev ? { ...prev, [field]: value } : null)}
            onSubmit={() => handleEditGroup(editGroup.id, editGroup, setGroups, setShowEditForm, setEditGroup, setLoadingActions)}
            onCancel={handleCancel}
            isSaving={!!loadingActions[`edit-${editGroup.id}`]}
        />
    );
};
