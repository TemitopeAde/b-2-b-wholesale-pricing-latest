import React, { type FC, useEffect, useRef, useState } from "react";
import { type ActionMenuProps } from "./PricingRuleTypes";
import styles from '../dashboard/pages/element.module.css';
import { EditIcon, MembersIcon, ModernDeleteIcon, MoreIcon, ProductsIcon, ToggleIcon } from "./PricingIcons";
import { LoaderSVG } from "./Icons";

export const ActionMenu: FC<ActionMenuProps> = ({ rule, onEdit, onToggle, onDelete, onViewMembers, onViewProduct, loadingActions, siteId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const redirectToDiscounts = () => {
    if (!siteId) return;
    const url = `https://manage.wix.com/dashboard/${siteId}/discounts/rule/${rule.id}`;
    window.open(url, "_blank");
    // window.location.href = `https://manage.wix.com/dashboard/${siteId}/discounts/rule/${rule.id}`;
  };

  const handleEditClick = () => {
    onEdit();
    setIsOpen(false);
  };

  const handleToggleClick = () => {
    if (rule.ruleCategory === "pricing" && rule.isActive) {
      redirectToDiscounts();
    } else {
      onToggle();
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.actionMenuContainer} ref={menuRef}>
      <button
        className={styles.actionMenuButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreIcon />
      </button>

      {isOpen && (
        <div className={styles.actionMenu}>
          <button
            className={`${styles.actionMenuItem} ${styles.edit}`}
            onClick={handleEditClick}
            disabled={loadingActions[`update-${rule.id}`]}
          >
            {loadingActions[`update-${rule.id}`] ? <LoaderSVG /> : <EditIcon />}
            Edit Rule
          </button>

          {onViewMembers && (
            <button
              className={styles.actionMenuItem}
              onClick={() => {
                onViewMembers();
                setIsOpen(false);
              }}
            >
              <MembersIcon />
              View Members {rule.accessGroups && rule.accessGroups.length > 0 ? `(${rule.accessGroups.length})` : ''}
            </button>
          )}

          {onViewProduct && (rule.type === 'product' || (rule.targetProducts && rule.targetProducts.length > 0)) && (
            <button
              className={styles.actionMenuItem}
              onClick={() => {
                onViewProduct();
                setIsOpen(false);
              }}
            >
              <ProductsIcon />
              View Product{rule.targetProducts && rule.targetProducts.length > 1 ? 's' : ''}
            </button>
          )}

          <button
            className={`${styles.actionMenuItem} ${styles.delete}`}
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
            disabled={loadingActions[`delete-${rule.id}`]}
          >
            {loadingActions[`delete-${rule.id}`] ? <LoaderSVG /> : <ModernDeleteIcon />}
            Delete Rule
          </button>
        </div>
      )}
    </div>
  );
};
