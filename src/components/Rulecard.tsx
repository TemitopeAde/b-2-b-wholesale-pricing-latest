import React, { useEffect, useRef, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { EditIcon, ModernDeleteIcon as DeleteIcon, ToggleIcon, MoreIcon } from './PricingIcons';
import './ruleCards.styles.css';

interface MenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  variant?: 'danger';
  color?: string;
}

const ActionMenu: React.FC<{ actions: MenuAction[]; position?: 'bottom-right' | 'bottom-left' }> = ({ actions, position = 'bottom-right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <MoreIcon />
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', [position === 'bottom-right' ? 'right' : 'left']: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 160 }}>
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.loading}
              onClick={() => { action.onClick(); setIsOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: action.color }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Rule Types
export type RuleCategory = 'pricing' | 'moq' | string;

export interface Rule {
  id: string | number;
  name: string;
  description: string;
  ruleCategory: RuleCategory;
  isActive: boolean;
  minimumOrder?: number;
  minQuantity?: number;
  accessGroups: (string | number)[];
  // Add other rule properties as needed
  [key: string]: any;
}

export interface AccessGroup {
  id: string | number;
  name: string;
  // Add other access group properties as needed
  [key: string]: any;
}

// Loading Actions Type
export interface LoadingActions {
  [key: string]: boolean;
}

// Modal Configuration
interface ModalConfig {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
  action: () => void;
  isLoading: boolean;
}

// Rule Cards Props
export interface RuleCardsProps {
  filteredRules: Rule[];
  formatDiscount: (rule: Rule) => string;
  formatMOQInfo: (rule: Rule) => string;
  getAccessGroupNames: (accessGroupIds: (string | number)[], accessGroups: AccessGroup[]) => string;
  accessGroups: AccessGroup[];
  setEditingRule: (rule: Rule) => void;
  setShowEditForm: (show: boolean) => void;
  handleEnhancedToggleRule: (ruleId: string | number) => void;
  handleEnhancedDeleteRule: (ruleId: string | number) => void;
  loadingActions: LoadingActions;
  className?: string;
  style?: React.CSSProperties;
}

const RuleCards: React.FC<RuleCardsProps> = ({ 
  filteredRules, 
  formatDiscount, 
  formatMOQInfo, 
  getAccessGroupNames, 
  accessGroups,
  setEditingRule,
  setShowEditForm,
  handleEnhancedToggleRule,
  handleEnhancedDeleteRule,
  loadingActions,
  className = "",
  style = {}
}) => {
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const closeModal = (): void => {
    if (!modalConfig?.isLoading) {
      setModalConfig(null);
    }
  };

  const confirmAction = (): void => {
    if (modalConfig) {
      modalConfig.action();
      setModalConfig(null);
    }
  };

  const createActionMenu = (rule: Rule): MenuAction[] => {
    const handleEdit = (): void => {
      setEditingRule(rule);
      setShowEditForm(true);
    };

    const handleToggle = (): void => {
      setModalConfig({
        title: rule.isActive ? 'Deactivate Rule' : 'Activate Rule',
        message: `Are you sure you want to ${rule.isActive ? 'deactivate' : 'activate'} "${rule.name}"?`,
        confirmText: rule.isActive ? 'Deactivate' : 'Activate',
        confirmColor: rule.isActive ? '#f59e0b' : '#10b981',
        action: () => handleEnhancedToggleRule(rule.id),
        isLoading: loadingActions[`toggle-${rule.id}`] || false
      });
    };

    const handleDelete = (): void => {
      setModalConfig({
        title: 'Delete Rule',
        message: `Are you sure you want to delete "${rule.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmColor: '#dc2626',
        action: () => handleEnhancedDeleteRule(rule.id),
        isLoading: loadingActions[`delete-${rule.id}`] || false
      });
    };

    const actions: MenuAction[] = [
      {
        key: 'edit',
        label: 'Edit',
        icon: <EditIcon />,
        onClick: handleEdit,
        color: '#374151'
      },
      {
        key: 'toggle',
        label: rule.isActive ? 'Deactivate' : 'Activate',
        icon: <ToggleIcon isActive={rule.isActive} />,
        onClick: handleToggle,
        loading: loadingActions[`toggle-${rule.id}`] || false,
        color: '#374151'
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <DeleteIcon />,
        onClick: handleDelete,
        loading: loadingActions[`delete-${rule.id}`] || false,
        variant: 'danger',
        color: '#dc2626'
      }
    ];

    return actions;
  };

  const renderPricingDetails = (rule: Rule): React.ReactNode => (
    <div className="rule-card-details-pricing">
      <div>
        <span className="rule-card-detail-label">
          Discount
        </span>
        <p className="rule-card-detail-value discount">
          {formatDiscount(rule)}
        </p>
      </div>
      {rule.minimumOrder && rule.minimumOrder > 0 && (
        <div>
          <span className="rule-card-detail-label">
            Minimum Order Value
          </span>
          <p className="rule-card-detail-value default">
            ${rule.minimumOrder}
          </p>
        </div>
      )}
      {rule.minQuantity && rule.minQuantity > 0 && (
        <div>
          <span className="rule-card-detail-label">
            Minimum Quantity
          </span>
          <p className="rule-card-detail-value default">
            {rule.minQuantity} items
          </p>
        </div>
      )}
    </div>
  );

  const renderMOQDetails = (rule: Rule): React.ReactNode => (
    <div>
      <span className="rule-card-detail-label">
        MOQ Requirements
      </span>
      <p className="rule-card-detail-value moq">
        {formatMOQInfo(rule)}
      </p>
    </div>
  );

  return (
    <>
      <div className={`rule-cards-container ${className}`} style={style}>
        {filteredRules.map((rule: Rule) => (
          <div
            key={rule.id}
            className={`rule-card ${rule.isActive ? 'active' : 'inactive'}`}
          >
            {/* Action Menu in top right */}
            <div className="rule-card-action-menu">
              <ActionMenu
                actions={createActionMenu(rule)}
                position="bottom-right"
              />
            </div>

            <div className="rule-card-content">
              <div className="rule-card-header">
                <h3 className="rule-card-title">
                  {rule.name}
                </h3>
                <span className={`rule-card-badge ${rule.ruleCategory === 'pricing' ? 'pricing' : 'non-pricing'}`}>
                  {rule.ruleCategory.toUpperCase()}
                </span>
                <span className={`rule-card-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p className="rule-card-description">
                {rule.description}
              </p>
              
              <div className="rule-card-details">
                {rule.ruleCategory === 'pricing' ? renderPricingDetails(rule) : renderMOQDetails(rule)}

                <div className="rule-card-detail-item">
                  <span className="rule-card-detail-label">
                    Access Groups
                  </span>
                  <p className="rule-card-detail-value access-groups">
                    {getAccessGroupNames(rule.accessGroups, accessGroups)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={!!modalConfig}
        onClose={closeModal}
        onConfirm={confirmAction}
        title={modalConfig?.title}
        message={modalConfig?.message}
        confirmText={modalConfig?.confirmText}
        confirmColor={modalConfig?.confirmColor}
        isLoading={modalConfig?.isLoading}
      />
    </>
  );
};

export default RuleCards;