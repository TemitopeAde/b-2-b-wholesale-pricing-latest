// Input types for creating unified rules
export interface CreateUnifiedRuleInput {
  // Required fields
  name: string;

  // Rule classification
  ruleCategory?: 'pricing' | 'moq';
  type?: 'global' | 'category' | 'product' | 'bulk_csv';

  // Discount configuration
  discountType?: 'percentage' | 'fixed_amount' | 'fixed_price';
  percentage?: number;
  discountValue?: number;
  fixedAmount?: string;
  fixedPrice?: string;

  // Minimum/maximum requirements
  minimumOrder?: number; // Minimum order value (MOV)
  maximumOrder?: number; // Maximum order value
  minimumQuantity?: number; // Minimum order quantity (MOQ)
  maximumQuantity?: number; // Maximum order quantity

  // Target configuration
  categoryIds?: string[]; // Will be converted to catalogItemIds
  productIds?: string[]; // Maps to catalogItemIds
  catalogAppId?: string;

  // Access control
  accessGroups?: string[];

  // Member eligibility
  memberIds?: string[]; // Array of member GUIDs for individual member targeting

  // Trigger configuration
  triggerId?: string;
  triggerAppId?: string;

  // Optional fields
  description?: string;
  isActive?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;

  // Bulk CSV Data
  bulkCsvItems?: Array<{
    sku: string;
    productId: string;
    price: number;
    quantity: number;
  }>;
}

// Wix API discount rule structure - matches exact documentation
export interface WixDiscountRule {
  _id?: string; // Make optional to match Wix API
  _createdDate?: Date; // Make optional
  _updatedDate?: Date; // Make optional
  name: string;
  active: boolean;
  revision?: string; // Make optional
  status?: 'EXPIRED' | 'LIVE' | 'PENDING' | 'UNDEFINED'; // Make optional
  usageCount?: number; // Make optional
  activeTimeInfo?: ActiveTimeInfo;
  discounts?: Discounts; // Make optional
  trigger?: Trigger;
}
// Active time configuration - exact from docs
export interface ActiveTimeInfo {
  start?: Date; // ISO-8601 format
  end?: Date; // ISO-8601 format
}

// Discounts configuration - exact from docs
export interface Discounts {
  values: DiscountValue[]; // Only 1 discount allowed per rule
}

// Individual discount value - exact from docs
export interface DiscountValue {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FIXED_PRICE';
  targetType?: 'SPECIFIC_ITEMS'; // Only used for specific items, omitted for global
  percentage?: number; // For PERCENTAGE type
  fixedAmount?: string; // For FIXED_AMOUNT type  
  fixedPrice?: string; // For FIXED_PRICE type
  specificItemsInfo?: SpecificItemsInfo; // For SPECIFIC_ITEMS target
}

// Specific items configuration - exact from docs
export interface SpecificItemsInfo {
  scopes: Scope[]; // minSize: 1, maxSize: 50
}

// Scope definition - matches exact Wix API documentation
export interface Scope {
  _id: string; // minLength: 1, maxLength: 100 - Scope ID
  type: ScopeType; // Scope type
  catalogItemFilter?: CatalogItemFilter; // Must be passed with type "CATALOG_ITEM"
  customFilter?: CustomFilter; // Must be passed with type "CUSTOM_FILTER"
}

// Scope type enum - exact from docs
export type ScopeType = 'CATALOG_ITEM' | 'CUSTOM_FILTER' | 'UNDEFINED_SCOPE';

// Catalog item filter - exact from docs
export interface CatalogItemFilter {
  catalogAppId: string; // format: GUID - Catalog App ID (Wix Stores, Bookings, etc.)
  catalogItemIds: string[]; // minLength: 1, maxLength: 36, maxSize: 50 - Item IDs within catalog
}

// Custom filter - exact from docs
export interface CustomFilter {
  appId: string; // format: GUID - Custom filter app ID
  params: Record<string, any>; // Custom filter in { "key": "value" } form
}

// Trigger configuration - matches docs exactly
export interface Trigger {
  triggerType: 'AND' | 'SUBTOTAL_RANGE' | 'ITEM_QUANTITY_RANGE' | 'CUSTOM' | 'CUSTOMER_ELIGIBILITY';
  and?: { triggers: Trigger[] }; // For AND type - wraps sub-triggers
  customerEligibility?: CustomerEligibility; // For CUSTOMER_ELIGIBILITY type
  customTrigger?: CustomTrigger; // For CUSTOM type
  subtotalRange?: SubtotalRange; // For SUBTOTAL_RANGE type
  itemQuantityRange?: ItemQuantityRange; // For ITEM_QUANTITY_RANGE type
}

// Customer eligibility trigger - for member-specific pricing
export interface CustomerEligibility {
  eligibilityType: 'INDIVIDUAL_MEMBERS';
  individualMembersInfo?: { memberIds: string[] };
}

// Custom trigger configuration - exact from docs
export interface CustomTrigger {
  _id: string;
  appId: string;
}

// Subtotal range for minimum order value - uses from/to per Wix API
export interface SubtotalRange {
  from?: string; // string per API (e.g. "100.00")
  to?: string;
}

// Item quantity range for minimum quantity - uses from/to per Wix API
export interface ItemQuantityRange {
  from?: number; // integer per API
  to?: number;
}

// Query response structure - exact from docs
export interface DiscountRulesQueryResult {
  items: WixDiscountRule[];
  totalCount?: number;
  hasNext?: () => boolean;
  hasPrev?: () => boolean;
  length: number;
  pageSize: number;
}

// Normalized rule format for frontend
export interface NormalizedRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  ruleCategory: 'pricing' | 'moq';
  type: 'global' | 'category' | 'product';
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price';
  percentage?: number;
  fixedAmount?: string;
  fixedPrice?: string;
  minimumOrder?: number;
  minimumQuantity?: number;
  accessGroups: string[];
  targetCategories: string[];
  targetProducts: string[];
  source: 'wix';
  status: string;
  usageCount: number;
  revision: string;
  createdAt: Date;
  updatedAt: Date;
  activeTimeInfo?: ActiveTimeInfo;
  trigger?: Trigger;
}

// API response types
export interface CreateRuleResponse {
  success: boolean;
  data: WixDiscountRule & {
    metadata?: {
      description: string;
      accessGroups: string[];
      ruleCategory: string;
      ruleType: string;
      targetCategories: string[];
      targetProducts: string[];
      createdAt: string;
    };
  };
}

export interface QueryRulesResponse {
  success: boolean;
  data: NormalizedRule[];
}

export interface UpdateRuleResponse {
  success: boolean;
  data: WixDiscountRule;
}

export interface DeleteRuleResponse {
  success: boolean;
}

export interface ProductWholesalePriceResponse {
  eligible: boolean;
  hasWholesalePrice: boolean;
  wholesalePrice?: number;
  formattedWholesalePrice?: string;
  retailPrice?: number;
  formattedRetailPrice?: string;
  ruleName?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FIXED_PRICE';
  discountValue?: number;
  thresholds?: {
    minQuantity?: number;
    minSubtotal?: number;
  };
  /** Diagnostic reason when wholesale price is not applied */
  reason?: string;
  /** Catalog version and API error behind a `slug_not_found` reason */
  catalogVersion?: string;
  lookupError?: string;
}

// Filter options for querying rules
export interface RuleFilters {
  ruleCategory?: 'pricing' | 'moq';
  ruleType?: 'global' | 'category' | 'product';
  active?: boolean;
}


export interface UpdateRuleInput {
  name?: string;
  active?: boolean;
  activeTimeInfo?: ActiveTimeInfo;
  discounts?: Discounts;
  trigger?: Trigger;
  revision?: string;
  description?: string;
  accessGroups?: string[];
  ruleCategory?: 'pricing' | 'moq';
  type?: 'global' | 'category' | 'product';
  targetId?: string;
  categoryIds?: string[];
  productIds?: string[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  moqType?: 'minimum_units' | 'case_pack' | 'both';
  moqMinQuantity?: number;
  casePackSize?: number;
  enforceMultiples?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  minimumOrder?: number;
  maximumOrder?: number;
  memberIds?: string[];
}

// Frontend component props - Updated to match RuleForm usage
export interface PricingRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  ruleCategory: 'pricing' | 'moq';
  type: 'global' | 'category' | 'product';
  discountType?: 'percentage' | 'fixed' | 'fixed_price'; // Changed 'fixed_amount' to 'fixed' to match RuleForm
  percentage?: number;
  fixedAmount?: string;
  fixedPrice?: string;
  minimumOrder?: number;
  minimumQuantity?: number;
  // Additional fields expected by RuleForm
  minQuantity?: number; // RuleForm uses this field name
  maxQuantity?: number; // RuleForm field
  casePack?: number; // RuleForm field
  discountValue?: number; // RuleForm field for the actual discount value
  targetId?: string; // RuleForm field for selected category/product ID
  accessGroups: string[];
  memberIds?: string[]; // Member GUIDs from discount rule trigger
  targetCategories: string[]; // Made required to match usage
  targetProducts: string[]; // Made required to match usage
  targetName?: string;
  source?: 'wix' | 'custom';
  status?: string;
  usageCount?: number;
  revision?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Additional fields that might be used
  activeTimeInfo?: ActiveTimeInfo;
  trigger?: Trigger;
}

export interface AccessGroup {
  _id: string;
  name: string;
  description?: string;
  discount?: string;
  minOrder?: string;
  members?: Array<{ id: string; name?: string; email?: string }>;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  price?: number;
  categoryIds?: string[];
}

// Loading states
export interface LoadingActions {
  [key: string]: boolean;
}

// Filter types for frontend
export type FilterType = 'all' | 'pricing' | 'moq' | 'global' | 'category' | 'product';

// Error types - matches docs error format
export interface RuleError {
  message: string;
  code?: number; // HTTP status codes like 400, 428
  details?: any;
}

// Webhook event types from docs
export interface DiscountRuleCreatedEvent {
  instanceId: string;
  eventType: 'DiscountRuleCreated';
  data: WixDiscountRule;
}

export interface DiscountRuleDeletedEvent {
  instanceId: string;
  eventType: 'DiscountRuleDeleted';
  data: {
    discountRuleId: string;
  };
}

export interface DiscountRuleUpdatedEvent {
  instanceId: string;
  eventType: 'DiscountRuleUpdated';
  data: WixDiscountRule;
}
