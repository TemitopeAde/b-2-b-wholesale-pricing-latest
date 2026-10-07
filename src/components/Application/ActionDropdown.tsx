import React, { type FC, useState, useEffect, useRef } from 'react';

import { DotsIcon, EyeIcon, CheckIcon, XIcon, UndoIcon, LoaderIcon } from './Icons';
import { type FormData } from '../Application';

interface ActionDropdownProps {
  application: FormData;
  loadingActions: { [key: string]: boolean };
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevoke: () => void;
}

export const ActionDropdown: FC<ActionDropdownProps> = ({
  application,
  loadingActions,
  onView,
  onApprove,
  onReject,
  onRevoke
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const isAnyActionLoading = Object.values(loadingActions).some(loading => loading);

  return (
    <div className="wholesale-dropdown" ref={dropdownRef}>
      <button
        className="wholesale-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isAnyActionLoading}
      >
        <DotsIcon />
      </button>
      
      {isOpen && (
        <div className="wholesale-dropdown-menu">
          <button
            className="wholesale-dropdown-item"
            onClick={() => handleAction(onView)}
          >
            <EyeIcon />
            <span>View Details</span>
          </button>
          
          {application.status === 'pending' && (
            <>
              <button
                className="wholesale-dropdown-item wholesale-dropdown-item-success"
                onClick={() => handleAction(onApprove)}
                disabled={loadingActions[`${application.id}-approved`]}
              >
                {loadingActions[`${application.id}-approved`] ? (
                  <LoaderIcon />
                ) : (
                  <CheckIcon />
                )}
                <span>Approve</span>
              </button>
              <button
                className="wholesale-dropdown-item wholesale-dropdown-item-danger"
                onClick={() => handleAction(onReject)}
                disabled={loadingActions[`${application.id}-rejected`] || loadingActions[`${application.id}-approved`]}
              >
                {loadingActions[`${application.id}-rejected`] ? (
                  <LoaderIcon />
                ) : (
                  <XIcon />
                )}
                <span>Reject</span>
              </button>
            </>
          )}
          
          {application.status === 'approved' && (
            <button
              className="wholesale-dropdown-item wholesale-dropdown-item-warning"
              onClick={() => handleAction(onRevoke)}
              disabled={loadingActions[`${application.id}-pending`]}
            >
              {loadingActions[`${application.id}-pending`] ? (
                <LoaderIcon />
              ) : (
                <UndoIcon />
              )}
              <span>Revoke Approval</span>
            </button>
          )}
          
          {application.status === 'rejected' && (
            <button
              className="wholesale-dropdown-item wholesale-dropdown-item-success"
              onClick={() => handleAction(onApprove)}
              disabled={loadingActions[`${application.id}-approved`]}
            >
              {loadingActions[`${application.id}-approved`] ? (
                <LoaderIcon />
              ) : (
                <CheckIcon />
              )}
              <span>Approve</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};