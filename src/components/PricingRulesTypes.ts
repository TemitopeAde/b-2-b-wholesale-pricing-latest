// Core types for pricing rules
export interface PricingRule {
  id: string;
  name: string;
  description: string;
  ruleCategory: 'pricing' | 'moq' | 'shipping';
  type: 'global' | 'category' | 'product' | 'bulk_csv';
  discountType?: 'percentage' | 'fixed' | 'fixed_price';
  discountValue?: number;
  minimumOrder?: number;
  minQuantity?: number;
  isActive: boolean;
  accessGroups: (string | number)[];
  targetName?: string;
  targetCategories?: string[];
  targetProducts?: string[];
  createdDate?: string;
  updatedDate?: string;
  revision?: number;
  status?: string;
  usageCount?: number;
  // MOQ specific fields
  moqType?: string;
  casePackSize?: number;
  enforceMultiples?: boolean;
  // Shipping specific fields
  shippingType?: 'free_shipping' | 'flat_rate' | 'threshold';
  shippingRate?: number;
  freeShippingThreshold?: number;
}

export interface AccessGroup {
  id: string | number;
  name: string;
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  [key: string]: any;
}

export interface LoadingActions {
  [key: string]: boolean;
}

export interface ModalConfig {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
  action: () => void;
  isLoading: boolean;
}

export type FilterType = 'all' | 'pricing' | 'moq' | 'shipping' | 'global' | 'category' | 'product';

export interface FilterOption {
  key: FilterType;
  label: string;
  count: number;
}

// Form data types
export interface RuleFormData {
  name: string;
  description: string;
  ruleCategory: 'pricing' | 'moq' | 'shipping';
  type: 'global' | 'category' | 'product';
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  minimumOrder?: number;
  minQuantity?: number;
  moqMinQuantity?: number;
  maxQuantity?: number;
  moqType?: string;
  casePackSize?: number;
  enforceMultiples?: boolean;
  targetId?: string;
  targetName?: string;
  accessGroups: (string | number)[];
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  // Shipping specific fields
  shippingType?: 'free_shipping' | 'flat_rate' | 'threshold';
  shippingRate?: number;
  freeShippingThreshold?: number;
}

// API Response types
export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface WixRule {
  _id: string;
  name: string;
  offer?: string;
  active: boolean;
  discounts?: {
    values?: Array<{
      discountType: string;
      percentage?: number;
      fixedAmount?: number;
      fixedPrice?: number;
      specificItemsInfo?: {
        scopes?: Array<{
          type: string;
          _id: string;
          customFilter?: {
            params?: {
              collectionIds?: string[];
            };
          };
        }>;
      };
    }>;
  };
  trigger?: {
    triggerType: string;
    subtotalRange?: {
      from?: string;
    };
    itemQuantityRange?: {
      from?: number;
    };
  };
  _createdDate?: string;
  _updatedDate?: string;
  revision?: number;
  status?: string;
  usageCount?: number;
}