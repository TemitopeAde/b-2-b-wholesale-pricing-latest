import React, { type FC } from 'react';
import { LoaderSVG } from './Icons';
import { type AccessGroup, type LoadingActions } from './AccessGroupType';

interface GroupDropdownMenuProps {
    group: AccessGroup;
    loadingActions: LoadingActions;
    onEditClick: () => void;
    onMembersClick: () => void;
    onDeleteClick: () => void;
}

const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L9.708 9.708a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168L12.146.146zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293L12.793 5.5z" />
        <path d="M2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 1 1 0v7A1.5 1.5 0 0 1 13.5 15h-11A1.5 1.5 0 0 1 1 13.5v-11A1.5 1.5 0 0 1 2.5 1h7a.5.5 0 0 1 0 1h-7z" />
    </svg>
);

const MembersIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

const DeleteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
        <polyline points="3,6 5,6 21,6"></polyline>
        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

export const GroupDropdownMenu: FC<GroupDropdownMenuProps> = ({
    group,
    loadingActions,
    onEditClick,
    onMembersClick,
    onDeleteClick
}) => {
    const handleMenuItemClick = (action: () => void, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        action();
    };

    const menuItems = [
        {
            icon: <EditIcon />,
            label: 'Edit Group',
            onClick: onEditClick,
            loading: loadingActions[`edit-${group.id}`],
            color: '#374151',
            hoverColor: '#f9fafb'
        },
        {
            icon: <MembersIcon />,
            label: 'Manage Members',
            onClick: onMembersClick,
            loading: loadingActions[`members-${group.id}`],
            color: '#374151',
            hoverColor: '#f9fafb'
        },
        {
            icon: <DeleteIcon />,
            label: 'Delete Group',
            onClick: onDeleteClick,
            loading: loadingActions[`delete-${group.id}`],
            color: '#dc2626',
            hoverColor: '#fee2e2',
            isDangerous: true
        }
    ];

    return (
        <div 
            className="dropdown-container"
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 10,
                minWidth: '180px',
                overflow: 'hidden',
                marginTop: '4px'
            }}
        >
            {menuItems.map((item, index) => (
                <React.Fragment key={item.label}>
                    {index === menuItems.length - 1 && (
                        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />
                    )}
                    <button
                        onClick={(e) => handleMenuItemClick(item.onClick, e)}
                        disabled={item.loading}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            background: 'none',
                            textAlign: 'left',
                            cursor: item.loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            color: item.loading ? '#9ca3af' : item.color,
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            opacity: item.loading ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!item.loading) {
                                e.currentTarget.style.backgroundColor = item.hoverColor;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!item.loading) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {item.loading ? (
                            <LoaderSVG style={{ marginRight: '8px', width: '14px', height: '14px' }} />
                        ) : (
                            item.icon
                        )}
                        {item.label}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};