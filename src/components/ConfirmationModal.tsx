import React from 'react';
import { ConfirmDialog, type ConfirmTone } from './ui';

export type ModalSize = 'small' | 'medium' | 'large';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Legacy colour prop — red shades map to the danger tone, anything else to primary. */
  confirmColor?: string;
  tone?: ConfirmTone;
  isLoading?: boolean;
  size?: ModalSize;
  className?: string;
  style?: React.CSSProperties;
}

const toneFromColor = (color?: string): ConfirmTone => {
  if (!color) return 'danger';
  const c = color.toLowerCase();
  if (['#dc2626', '#ef4444', '#b91c1c', '#e11d48', 'red'].includes(c)) return 'danger';
  if (['#10b981', '#16a34a', '#22c55e', 'green'].includes(c)) return 'success';
  if (['#f59e0b', '#ff6b35', '#f97316', 'orange'].includes(c)) return 'warning';
  return 'primary';
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  tone,
  isLoading = false,
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    title={title || 'Are you sure?'}
    message={message}
    confirmText={confirmText}
    cancelText={cancelText}
    tone={tone ?? toneFromColor(confirmColor)}
    isLoading={isLoading}
    onConfirm={onConfirm}
    onCancel={onClose}
  />
);

export default ConfirmationModal;
