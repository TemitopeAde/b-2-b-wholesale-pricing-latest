import React, { type FC } from "react";
import { type DeleteConfirmationProps } from "./PricingRuleTypes";
import { ConfirmDialog } from "./ui";

export const DeleteConfirmation: FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ruleName,
  isLoading
}) => (
  <ConfirmDialog
    isOpen={isOpen}
    tone="danger"
    title="Delete rule?"
    message={<>“{ruleName}” will be permanently removed. This can't be undone.</>}
    confirmText="Delete"
    isLoading={isLoading}
    onConfirm={onConfirm}
    onCancel={onClose}
  />
);
