import React, { type FC } from 'react';
import { ConfirmDialog, type ConfirmTone } from '../ui';

interface ConfirmationModalProps {
  title: string;
  message: string;
  subMessage?: string;
  confirmText: string;
  /** Legacy style prop — its background colour picks the dialog tone. */
  confirmStyle?: React.CSSProperties;
  tone?: ConfirmTone;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneFromStyle = (style?: React.CSSProperties): ConfirmTone => {
  const bg = String(style?.backgroundColor || '').toLowerCase();
  if (bg === '#10b981') return 'success';
  if (bg === '#ff6b35' || bg === '#f59e0b') return 'warning';
  if (bg === '#dc2626' || bg === '#ef4444') return 'danger';
  return 'primary';
};

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  title,
  message,
  subMessage,
  confirmText,
  confirmStyle,
  tone,
  isLoading,
  onConfirm,
  onCancel
}) => (
  <ConfirmDialog
    isOpen
    title={title}
    message={message}
    subMessage={subMessage}
    confirmText={confirmText}
    tone={tone ?? toneFromStyle(confirmStyle)}
    isLoading={isLoading}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
