import React, { type FC } from 'react';
import { LoaderSVG, MoreVerticalIcon } from './Icons';
import { handleDeleteGroup, handleManageMembers } from './AccessGroupService';
import { GroupDropdownMenu } from './GroupDropdown';
import { GroupStatusBadge } from './GroupBadge';
import { type AccessGroup, type LoadingActions } from './AccessGroupType';

import './group.styles.css';
import { useSiteCurrency } from '../utils/currency';

interface GroupCardProps {
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



export const GroupCard: FC<GroupCardProps> = ({
    group,
    activeDropdown,
    setActiveDropdown,
    loadingActions,
    setLoadingActions,
    setGroups,
    setEditGroup,
    setShowEditForm,
    setSelectedGroup,
    setShowMembersModal,
    groups
}) => {
    const { currency: siteCurrency } = useSiteCurrency();
    const memberCount = Array.isArray(group.members) ? group.members.length : 0;
    const isActive = memberCount > 0;

    const handleEditClick = () => {
        setEditGroup(group);
        setShowEditForm(true);
        setActiveDropdown(null);
    };

    const handleMembersClick = () => {
        handleManageMembers(group.id, groups, setSelectedGroup, setShowMembersModal, setLoadingActions);
        setActiveDropdown(null);
    };

    const handleDeleteClick = () => {
        handleDeleteGroup(group.id, setGroups, setActiveDropdown, setLoadingActions);
        setActiveDropdown(null);
    };

    const displayValue = (value: string | number | undefined, fallback: string = 'Not set') => {
        if (!value || (typeof value === 'string' && !value.trim())) {
            return fallback;
        }

        const num = typeof value === 'string'
            ? parseFloat(value.replace(/[^0-9.-]/g, ''))
            : Number(value);

        if (!isNaN(num)) {
            return num.toLocaleString();
        }

        return value.toString();
    };


    // Helper function to check if value is set
    const isValueSet = (value: string | number | undefined) => {
        return value && (typeof value !== 'string' || value.trim() !== '');
    };

    return (
        <div className={`group-card ${isActive ? 'group-card-active' : ''}`}>
            {/* Card Header */}
            <div className="group-card-header">
                <div className="group-card-title-section">
                    <div className="group-card-title-row">
                        <h3 className="group-card-title">
                            {group.name}
                        </h3>
                        <GroupStatusBadge isActive={isActive} memberCount={memberCount} />
                    </div>
                </div>

                <div className="group-card-dropdown">
                    <button
                        className="group-card-dropdown-btn"
                        onClick={() => setActiveDropdown(activeDropdown === group.id ? null : group.id)}
                    >
                        <MoreVerticalIcon />
                    </button>

                    {activeDropdown === group.id && (
                        <GroupDropdownMenu
                            group={group}
                            loadingActions={loadingActions}
                            onEditClick={handleEditClick}
                            onMembersClick={handleMembersClick}
                            onDeleteClick={handleDeleteClick}
                        />
                    )}
                </div>
            </div>

            {/* Members Section */}
            <div className="group-card-members">
                <div className="group-card-members-content">
                    <span className="group-card-members-label">Members</span>
                    <span className={`group-card-members-count ${isActive ? 'group-card-members-count-active' : ''}`}>
                        {memberCount}
                    </span>
                </div>
            </div>

            {/* Order Limits Section */}
            <div className="group-card-limits-section">
                <h4 className="group-card-limits-title">Order Limits</h4>
                <div className="group-card-limits-grid group-card-order-limits">
                    <div className="group-card-limit-item">
                        <span className="group-card-limit-label">Minimum</span>
                        <span className={`group-card-limit-value ${isValueSet(group.minOrder) ? '' : 'group-card-limit-value-unset'}`}>
                            {siteCurrency ? `${displayValue(group.minOrder)} ${siteCurrency}` : 'Currency unavailable'}
                        </span>
                    </div>

                    <div className="group-card-limit-item">
                        <span className="group-card-limit-label">Maximum</span>
                        <span className={`group-card-limit-value ${isValueSet(group.maxOrder) ? '' : 'group-card-limit-value-unset'}`}>
                            {siteCurrency ? `${displayValue(group.maxOrder)} ${siteCurrency}` : 'Currency unavailable'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Product Limits Section */}
            <div className="group-card-limits-section">
                <h4 className="group-card-limits-title">Product Limits</h4>
                <div className="group-card-limits-grid group-card-product-limits">
                    <div className="group-card-limit-item">
                        <span className="group-card-limit-label">Minimum</span>
                        <span className={`group-card-limit-value ${isValueSet(group.minProducts) ? '' : 'group-card-limit-value-unset'}`}>
                            {displayValue(group.minProducts)}
                        </span>
                    </div>

                    <div className="group-card-limit-item">
                        <span className="group-card-limit-label">Maximum</span>
                        <span className={`group-card-limit-value ${isValueSet(group.maxProducts) ? '' : 'group-card-limit-value-unset'}`}>
                            {displayValue(group.maxProducts)}
                        </span>
                    </div>
                </div>
            </div>




            {/* Group Health Indicator */}
            <div className={`group-card-status ${isActive ? 'group-card-status-active' : ''}`}>
                <div className="group-card-status-content">
                    <div className={`group-card-status-dot ${isActive ? 'group-card-status-dot-active' : ''}`} />
                    <span className={`group-card-status-text ${isActive ? 'group-card-status-text-active' : ''}`}>
                        {isActive
                            ? `Active with ${memberCount} member${memberCount === 1 ? '' : 's'}`
                            : 'Inactive - No members assigned'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};
