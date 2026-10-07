
import { formatCurrency } from '../utils/currency';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import { handleCatalogLogic, getAllStoreCategories } from '../backend/pricing.client';
import { type Dispatch, type SetStateAction } from 'react';

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'category' | 'product' | 'bulk_csv';
  ruleCategory: 'pricing' | 'moq' | 'shipping';
  discountType?: 'percentage' | 'fixed' | 'fixed_price';
  discountValue?: number;
  minimumOrder?: number;
  minQuantity?: number;
  maxQuantity?: number;
  casePack?: number;
  targetId?: string;
  targetName?: string;
  productId?: string;
  collectionId?: string;
  isActive: boolean;
  accessGroups: string[];
  memberIds?: string[];
  createdDate?: string;
  targetCategories?: string[];
  targetProducts?: string[];
  updatedDate?: string;
  revision?: string | number;
  // Shipping specific fields
  shippingType?: 'free_shipping' | 'flat_rate' | 'threshold';
  shippingRate?: number;
  freeShippingThreshold?: number;
  b2cOnly?: boolean;
  belowMinimumShippingRate?: number;
}

export interface AccessGroup {
  id: string;
  name: string;
  description: string;
  discount: string;
  minOrder: string;
  members: { id: string; name: string; email: string }[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  _id: string;
  name: string;
  price: { price: number };
  collectionIds: string[];
}

const COLLECTION_NAME = '@wd-strategies/wholesale-appllication/PricingRules';
const ACCESS_GROUPS_COLLECTION = '@wd-strategies/wholesale-appllication/Accessgroup';
export const SHIPPING_COLLECTION = '@wd-strategies/wholesale-appllication/ShippingRules';

export const fetchAccessGroups = async (
  setAccessGroups: Dispatch<SetStateAction<AccessGroup[]>>,
  setLoadingAccessGroups: Dispatch<SetStateAction<boolean>>,
) => {
  try {
    setLoadingAccessGroups(true);
    const results = await items.query(ACCESS_GROUPS_COLLECTION).find();
    const transformedGroups: AccessGroup[] = results.items.map((item: any) => ({
      id: item._id || '',
      name: item.name || '(Unnamed Group)',
      description: item.description || '',
      discount: item.discount || '',
      minOrder: item.minOrder || '',
      members: Array.isArray(item.members) ? item.members : [],
    }));
    setAccessGroups(transformedGroups);
    return transformedGroups;
  } catch {
    setAccessGroups([]);
  } finally {
    setLoadingAccessGroups(false);
  }
};

export const fetchCatalogData = async (
  setCategories: Dispatch<SetStateAction<Category[]>>,
  setProducts: Dispatch<SetStateAction<Product[]>>,
  setLoadingCatalog: Dispatch<SetStateAction<boolean>>,
) => {
  try {
    setLoadingCatalog(true);
    const categoryResults = await getAllStoreCategories();
    const allCategories: Category[] = (categoryResults as any[]).map((item: any) => ({
      id: item._id || '',
      name: item.name || 'Unnamed Category',
    }));
    setCategories(allCategories);

    const productResults = await handleCatalogLogic();
    const transformedProducts: Product[] = (productResults as any)?.products?.map((item: any) => ({
      _id: item._id || '',
      name: item.name || 'Unnamed Product',
      price: item.price || { price: 0 },
      collectionIds: item.collectionIds || item.collections || [],
    }));
    setProducts(transformedProducts);
  } catch {
    setCategories([]);
    setProducts([]);
  } finally {
    setLoadingCatalog(false);
  }
};

export const fetchRules = async (
  setRules: Dispatch<SetStateAction<PricingRule[]>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  createDefaultRules: () => Promise<void>,
) => {
  try {
    setIsLoading(true);
    const results = await items.query(COLLECTION_NAME).find();
    if (results.items.length > 0) {
      const transformedRules: PricingRule[] = results.items.map((item: any) => ({
        id: item._id || '',
        name: item.name || '',
        description: item.description || '',
        type: item.type || 'global',
        ruleCategory: item.ruleCategory || 'pricing',
        discountType: item.discountType || 'percentage',
        discountValue: item.discountValue || 0,
        targetId: item.targetId || '',
        targetName: item.targetName || '',
        productId: item.productId || '',
        collectionId: item.collectionId || '',
        isActive: item.isActive !== false,
        minimumOrder: item.minimumOrder || 0,
        accessGroups: Array.isArray(item.accessGroups) ? item.accessGroups : [],
        minQuantity: item.minQuantity || undefined,
        maxQuantity: item.maxQuantity || undefined,
        casePack: item.casePack || undefined,
        createdDate: item._createdDate || new Date().toISOString(),
        updatedDate: item._updatedDate || new Date().toISOString(),
      }));
      setRules(transformedRules);
    } else {
      await createDefaultRules();
    }
  } catch {
    dashboard.showToast({
      message: 'Failed to load rules',
      type: 'error',
      timeout: 'normal',
    });
  } finally {
    setIsLoading(false);
  }
};

export const createDefaultRules = async () => {
  const defaultRules = [
    {
      name: 'Basic Wholesale Discount',
      description: 'Standard 15% discount for all wholesale customers',
      type: 'global',
      ruleCategory: 'pricing',
      discountType: 'percentage',
      discountValue: 15,
      isActive: true,
      accessGroups: [],
      minimumOrder: 500,
    }
  ];

  try {
    const createdRules = [];
    for (const rule of defaultRules) {
      const result = await items.save(COLLECTION_NAME, rule);
      createdRules.push({
        id: result._id,
        ...rule,
        createdDate: result._createdDate || new Date().toISOString(),
        updatedDate: result._updatedDate || new Date().toISOString(),
      });
    }
    return createdRules;
  } catch (error) {
    throw error;
  }
};

export const handleCreateRule = async (
  newRule: Omit<PricingRule, 'id' | 'createdDate' | 'updatedDate'>,
  setRules: Dispatch<SetStateAction<PricingRule[]>>,
  setLoadingActions: Dispatch<SetStateAction<{ [key: string]: boolean }>>,
  setShowCreateForm: Dispatch<SetStateAction<boolean>>,
) => {
  try {
    setLoadingActions((prev) => ({ ...prev, create: true }));
    const dataToInsert = {
      name: newRule.name,
      description: newRule.description,
      type: newRule.type,
      ruleCategory: newRule.ruleCategory,
      discountType: newRule.discountType,
      discountValue: newRule.discountValue,
      minimumOrder: newRule.minimumOrder || 0,
      minQuantity: newRule.minQuantity,
      maxQuantity: newRule.maxQuantity,
      casePack: newRule.casePack,
      targetId: newRule.targetId || '',
      targetName: newRule.targetName || '',
      productId: newRule.type === 'product' ? newRule.targetId : '',
      collectionId: newRule.type === 'category' ? newRule.targetId : '',
      isActive: newRule.isActive,
      accessGroups: newRule.accessGroups,
    };

    const result = await items.save(COLLECTION_NAME, dataToInsert);
    const createdRule: PricingRule = {
      id: result._id,
      ...dataToInsert,
    };

    setRules((prev) => [...prev, createdRule]);
    setShowCreateForm(false);

    dashboard.showToast({
      message: `${newRule.ruleCategory === 'pricing' ? 'Pricing' : 'MOQ'} rule created successfully`,
      type: 'success',
      timeout: 'normal',
    });
  } catch (error) {
    dashboard.showToast({
      message: 'Failed to create rule',
      type: 'error',
      timeout: 'normal',
    });
  } finally {
    setLoadingActions((prev) => {
      const newState = { ...prev };
      delete newState['create'];
      return newState;
    });
  }
};

export const handleEditRule = (
  rule: PricingRule,
  setEditingRule: Dispatch<SetStateAction<PricingRule | null>>,
  setShowEditForm: Dispatch<SetStateAction<boolean>>,
) => {
  setEditingRule(rule);
  setShowEditForm(true);
};

export const handleUpdateRule = async (
  ruleId: string,
  newRule: Omit<PricingRule, 'id' | 'createdDate' | 'updatedDate'>,
  rules: PricingRule[],
  setRules: Dispatch<SetStateAction<PricingRule[]>>,
  setLoadingActions: Dispatch<SetStateAction<{ [key: string]: boolean }>>,
  setShowEditForm: Dispatch<SetStateAction<boolean>>,
  setEditingRule: Dispatch<SetStateAction<PricingRule | null>>,
) => {
  try {
    setLoadingActions((prev) => ({ ...prev, update: true }));
    const dataToUpdate = {
      _id: ruleId,
      name: newRule.name,
      description: newRule.description,
      type: newRule.type,
      ruleCategory: newRule.ruleCategory,
      discountType: newRule.discountType,
      discountValue: newRule.discountValue,
      targetId: newRule.targetId || '',
      targetName: newRule.targetName || '',
      productId: newRule.type === 'product' ? newRule.targetId : '',
      collectionId: newRule.type === 'category' ? newRule.targetId : '',
      isActive: newRule.isActive,
      minimumOrder: newRule.minimumOrder || 0,
      accessGroups: newRule.accessGroups,
      minQuantity: newRule.minQuantity,
      maxQuantity: newRule.maxQuantity,
      casePack: newRule.casePack,
    };

    await items.update(COLLECTION_NAME, dataToUpdate);

    const updatedRule: PricingRule = {
      id: ruleId,
      ...dataToUpdate,
      createdDate: rules.find((r) => r.id === ruleId)?.createdDate || new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };

    setRules((prev) => prev.map((r) => (r.id === ruleId ? updatedRule : r)));
    setShowEditForm(false);
    setEditingRule(null);

    dashboard.showToast({
      message: 'Rule updated successfully',
      type: 'success',
      timeout: 'normal',
    });
  } catch (error) {
    dashboard.showToast({
      message: 'Failed to update rule',
      type: 'error',
      timeout: 'normal',
    });
  } finally {
    setLoadingActions((prev) => {
      const newState = { ...prev };
      delete newState['update'];
      return newState;
    });
  }
};

export const handleDeleteRule = async (
  ruleId: string,
  setRules: Dispatch<SetStateAction<PricingRule[]>>,
  setLoadingActions: Dispatch<SetStateAction<{ [key: string]: boolean }>>,
) => {
  try {
    setLoadingActions((prev) => ({ ...prev, [`delete-${ruleId}`]: true }));
    await items.remove(COLLECTION_NAME, ruleId);
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
    dashboard.showToast({
      message: 'Rule deleted successfully',
      type: 'success',
      timeout: 'normal',
    });
  } catch (error) {
    dashboard.showToast({
      message: 'Failed to delete rule',
      type: 'error',
      timeout: 'normal',
    });
  } finally {
    setLoadingActions((prev) => {
      const newState = { ...prev };
      delete newState[`delete-${ruleId}`];
      return newState;
    });
  }
};

export const handleToggleRule = async (
  ruleId: string,
  rules: PricingRule[],
  setRules: Dispatch<SetStateAction<PricingRule[]>>,
  setLoadingActions: Dispatch<SetStateAction<{ [key: string]: boolean }>>,
) => {
  try {
    setLoadingActions((prev) => ({ ...prev, [`toggle-${ruleId}`]: true }));
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    await items.patch(COLLECTION_NAME, ruleId).setField('isActive', !rule.isActive).run();

    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r)));

    dashboard.showToast({
      message: `Rule ${!rule.isActive ? 'activated' : 'deactivated'}`,
      type: 'success',
      timeout: 'normal',
    });
  } catch (error) {
    dashboard.showToast({
      message: 'Failed to update rule status',
      type: 'error',
      timeout: 'normal',
    });
  } finally {
    setLoadingActions((prev) => {
      const newState = { ...prev };
      delete newState[`toggle-${ruleId}`];
      return newState;
    });
  }
};

export const getRuleTypeIcon = (type: string) => {
  switch (type) {
    case 'global':
      return '🌍';
    case 'category':
      return '📁';
    case 'product':
      return '📦';
    default:
      return '⭐';
  }
};

export const getRuleCategoryIcon = (category: string) => {
  return category === 'pricing' ? '💰' : '📊';
};

/** Money in the site currency; bare number while the currency is unknown (never a hardcoded "$"). */
const money = (amount: number | undefined | null, currency?: string | null) =>
  currency ? formatCurrency(Number(amount) || 0, currency) : String(Number(amount) || 0);

export const formatDiscount = (rule: PricingRule, currency?: string | null) => {
  if (rule.ruleCategory !== 'pricing') return null;
  if (rule.discountType === 'fixed_price') {
    return rule.discountValue === 0 || !rule.discountValue ? 'Sale Price: Not Set' : `Sale Price: ${money(rule.discountValue, currency)}`;
  }
  return rule.discountType === 'percentage'
    ? `${Number(rule.discountValue).toFixed(2)}% off`
    : `${money(rule.discountValue, currency)} off`;
};

export const formatMOQInfo = (rule: PricingRule) => {
  if (rule.ruleCategory !== 'moq') return null;
  const parts = [];
  if (rule.minQuantity) parts.push(`Min: ${rule.minQuantity}`);
  if (rule.maxQuantity) parts.push(`Max: ${rule.maxQuantity}`);
  if (rule.casePack) parts.push(`Pack: ${rule.casePack}`);
  return parts.join(' • ') || 'MOQ Rule';
};

export const formatShippingInfo = (rule: PricingRule, currency?: string | null) => {
  if (rule.ruleCategory !== 'shipping') return null;
  const b2c = rule.b2cOnly ? ' · B2C' : '';
  switch (rule.shippingType) {
    case 'free_shipping':
      return `Free Shipping${b2c}`;
    case 'flat_rate':
      return rule.shippingRate != null ? `Flat Rate: ${money(rule.shippingRate, currency)}${b2c}` : `Flat Rate${b2c}`;
    case 'threshold':
      return rule.freeShippingThreshold != null
        ? `Free Shipping over ${money(rule.freeShippingThreshold, currency)}${b2c}`
        : `Threshold Shipping${b2c}`;
    default:
      return 'Shipping Rule';
  }
};

export const getAccessGroupNames = (groupIds: string[], accessGroups: AccessGroup[]) => {
  if (!groupIds || groupIds.length === 0) return 'All Groups';
  return groupIds.map((id) => accessGroups.find((group) => group.id === id)?.name || id || '(Unnamed Group)').join(', ');
};
