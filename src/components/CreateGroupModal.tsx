import React from 'react';
import { handleCreateGroup } from './AccessGroupService';
import { type NewAccessGroup, type SetGroups, type SetLoadingActions, type SetNewGroup, type SetShowCreateForm } from './AccessGroupType';
import { GroupFormModal } from './GroupFormModal';

interface CreateGroupModalProps {
    showCreateForm: boolean;
    newGroup: NewAccessGroup;
    setNewGroup: SetNewGroup;
    setShowCreateForm: SetShowCreateForm;
    setGroups: SetGroups;
    loadingActions: { [key: string]: boolean };
    setLoadingActions: SetLoadingActions;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    showCreateForm,
    newGroup,
    setNewGroup,
    setShowCreateForm,
    setGroups,
    loadingActions,
    setLoadingActions,
}) => (
    <GroupFormModal
        isOpen={showCreateForm}
        mode="create"
        values={newGroup}
        onChange={(field, value) => setNewGroup(prev => ({ ...prev, [field]: value }))}
        onSubmit={() => handleCreateGroup(newGroup, setGroups, setNewGroup, setShowCreateForm, setLoadingActions)}
        onCancel={() => setShowCreateForm(false)}
        isSaving={!!loadingActions['create']}
    />
);
