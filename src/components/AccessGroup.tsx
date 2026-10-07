import React, { type FC, useState, useEffect } from 'react';
import { Button, Card, LoadingBlock, Notice, Page, PageHeader } from './ui';
import { DashIcons } from './Dashboard/icons';
import { CreateGroupModal } from './CreateGroupModal';
import { EditGroupModal } from './EditGroupModal';
import { createDefaultGroups, fetchGroups, handleDeleteGroup } from './AccessGroupService';
import ConfirmationModal from './ConfirmationModal';
import { UpgradeModal } from './UpgradeModal';
import { FilterTabs } from './FilterTabs';
import { GroupStats } from './GroupStats';
import { EmptyState } from './EmptyState';
import { GroupTable } from './GroupTable';
import ManageMember from './ManageMember';
import { type FilterType } from './AccessGroupTypes';
import { type AccessGroup, type LoadingActions, type NewAccessGroup } from './AccessGroupType';
import { dev_mode } from '../dashboard/dev_mode';
import { useSiteCurrency } from '../utils/currency';
import { useAppInstance } from '../utils/appInstance';

export const AccessGroupsView: FC = () => {
    const { currency } = useSiteCurrency();
    const { appInstance, isLoading: isInstanceLoading, error: instanceError, retry: retryInstance } = useAppInstance();
    const [groups, setGroups] = useState<AccessGroup[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [loadingActions, setLoadingActions] = useState<LoadingActions>({});
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<AccessGroup | null>(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [newGroup, setNewGroup] = useState<NewAccessGroup>({
        name: '',
        maxProducts: '',
        minProducts: '',
        minOrder: '',
        maxOrder: ''
    });
    const [editGroup, setEditGroup] = useState<AccessGroup | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<AccessGroup | null>(null);
    useEffect(() => {
        fetchGroups(setGroups, setIsLoadingData, createDefaultGroups);
    }, []);

    const getFilteredGroups = (): AccessGroup[] => {
        return groups.filter((group) => {
            const memberCount = Array.isArray(group.members) ? group.members.length : 0;

            switch (activeFilter) {
                case 'active':
                    return memberCount > 0;
                case 'empty':
                    return memberCount === 0;
                default:
                    return true;
            }
        });
    };

    const isFree = !dev_mode && appInstance?.instance?.isFree === true;

    const filteredGroups = getFilteredGroups();

    const handleGroupUpdate = (updatedGroup: AccessGroup) => {
        setGroups(prev => prev.map(group => group.id === updatedGroup.id ? updatedGroup : group));
        if (selectedGroup?.id === updatedGroup.id) {
            setSelectedGroup(updatedGroup);
        }
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        await handleDeleteGroup(groupToDelete.id, setGroups, () => {}, setLoadingActions);
        setGroupToDelete(null);
    };

    return (
        <Page>
            <PageHeader
                breadcrumb="Wholesale › Access groups"
                title="Access groups"
                subtitle="Group wholesale customers and give each group its own order and product limits."
                actions={!isInstanceLoading && !instanceError && (
                    isFree ? (
                        <Button onClick={() => setShowUpgradeModal(true)} prefixIcon={<DashIcons.Star size={16} />}>
                            Upgrade to create groups
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setShowCreateForm(true)}
                            loading={!!loadingActions['create']}
                            prefixIcon={<DashIcons.Plus size={16} />}
                        >
                            {loadingActions['create'] ? 'Creating…' : 'Create group'}
                        </Button>
                    )
                )}
            />

            {instanceError && (
                <Notice
                    tone="error"
                    title="Plan information is unavailable"
                    action={<Button variant="secondary" size="small" onClick={retryInstance}>Retry</Button>}
                >
                    Plan-dependent actions are disabled until it loads.
                </Notice>
            )}

            <GroupStats groups={groups} filteredGroups={filteredGroups} />

            <FilterTabs
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                groups={groups}
            />

            {isLoadingData ? (
                <Card><LoadingBlock message="Loading access groups…" /></Card>
            ) : filteredGroups.length === 0 ? (
                <EmptyState
                    activeFilter={activeFilter}
                    totalGroups={groups.length}
                    onCreateClick={() => (isFree ? setShowUpgradeModal(true) : setShowCreateForm(true))}
                />
            ) : (
                <GroupTable
                    groups={filteredGroups}
                    siteCurrency={currency}
                    loadingActions={loadingActions}
                    setLoadingActions={setLoadingActions}
                    setGroups={setGroups}
                    setEditGroup={setEditGroup}
                    setShowEditForm={setShowEditForm}
                    setSelectedGroup={setSelectedGroup}
                    setShowMembersModal={setShowMembersModal}
                    onDeleteGroup={(group) => setGroupToDelete(group)}
                />
            )}

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
            />

            <CreateGroupModal
                showCreateForm={showCreateForm}
                newGroup={newGroup}
                setNewGroup={setNewGroup}
                setShowCreateForm={setShowCreateForm}
                setGroups={setGroups}
                loadingActions={loadingActions}
                setLoadingActions={setLoadingActions}
            />

            <EditGroupModal
                showEditForm={showEditForm}
                editGroup={editGroup}
                setEditGroup={setEditGroup}
                setShowEditForm={setShowEditForm}
                setGroups={setGroups}
                loadingActions={loadingActions}
                setLoadingActions={setLoadingActions}
            />

            {showMembersModal && selectedGroup && (
                <ManageMember
                    selectedGroup={selectedGroup}
                    allGroups={groups}
                    onClose={() => {
                        setShowMembersModal(false);
                        setSelectedGroup(null);
                    }}
                    onUpdateGroup={handleGroupUpdate}
                />
            )}

            <ConfirmationModal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                onConfirm={confirmDeleteGroup}
                title="Delete this group?"
                message={groupToDelete
                    ? `“${groupToDelete.name}” will be permanently removed from your site. This can't be undone.`
                    : ''}
                confirmText="Delete group"
                cancelText="Cancel"
                tone="danger"
                isLoading={!!groupToDelete && !!loadingActions[`delete-${groupToDelete.id}`]}
            />
        </Page>
    );
};
