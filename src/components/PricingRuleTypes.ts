import { type PricingRule } from "./RuleFunction";

export interface LoadingActions {
  [key: string]: boolean;
}

export type FilterType = 'all' | 'pricing' | 'moq' | 'shipping' | 'global' | 'category' | 'product';


// Action Menu Component
export interface ActionMenuProps {
  rule: PricingRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onViewMembers?: () => void;
  onViewProduct?: () => void;
  loadingActions: LoadingActions;
  siteId?: string | null;
}
// Custom Delete Confirmation Modal
export interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ruleName: string;
  isLoading: boolean;
}