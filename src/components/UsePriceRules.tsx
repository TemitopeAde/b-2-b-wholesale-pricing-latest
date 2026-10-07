import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '@wix/dashboard';
import {
  createUnifiedRule,
  queryAllRules,
  updateUnifiedRule,
  deleteUnifiedRule
} from '../backend/pricing.client';
import { type AccessGroup, type Category, type LoadingActions, type PricingRule, type Product, type RuleFormData, type WixRule } from './PricingRulesTypes';
import { fetchAccessGroups, fetchCatalogData } from './RuleFunction';

export const usePricingRules = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState<LoadingActions>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
  const [loadingAccessGroups, setLoadingAccessGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch MOQ rules from collection
  const fetchMOQRulesFromCollection = async (): Promise<any[]> => {
    try {
      const { items } = await import("@wix/data");
      let allItems: any[] = [];
      let hasNext = true;
      let skip = 0;
      const limit = 1000;

      while (hasNext) {
        const results = await items.query("@wd-strategies/wholesale-appllication/PricingRules")
          .skip(skip)
          .limit(limit)
          .find();

        allItems = allItems.concat(results.items);
        hasNext = results.hasNext();
        skip += limit;
      }

      return allItems;
    } catch {
      return [];
    }
  };

  // Transform Wix rules to our format
  const transformWixRules = (wixRules: WixRule[]): PricingRule[] => {
    return wixRules.map((wixRule) => {
      const discount = wixRule.discounts?.values?.[0];
      const isPercentage = discount?.discountType === 'PERCENTAGE';
      const discountValue = isPercentage ? discount.percentage : discount.fixedAmount || discount.fixedPrice;

      const trigger = wixRule.trigger;
      const hasCustomTrigger = trigger?.triggerType === 'CUSTOM';

      let ruleType = 'global';
      let targetName = '';
      let ruleCategory = 'pricing';

      if (discount?.specificItemsInfo?.scopes?.length > 0) {
        const firstScope = discount.specificItemsInfo.scopes[0];

        if (firstScope.type === 'CUSTOM_FILTER' && firstScope.customFilter?.params?.collectionIds) {
          ruleType = 'category';
          targetName = `Collection ${firstScope.customFilter.params.collectionIds[0]}`;
        } else if (firstScope.type === 'CATALOG_ITEM') {
          const totalScopes = discount.specificItemsInfo.scopes.length;
          if (totalScopes > 5) {
            ruleType = 'global';
            targetName = `${totalScopes} products`;
          } else {
            ruleType = 'product';
            targetName = totalScopes === 1 ? 'Single product' : `${totalScopes} products`;
          }
        }
      }

      if (trigger?.triggerType === 'ITEM_QUANTITY_RANGE' && !hasCustomTrigger) {
        ruleCategory = 'moq';
      }

      let minimumOrder = undefined;
      let minQuantity = undefined;

      if (trigger?.triggerType === 'SUBTOTAL_RANGE') {
        minimumOrder = trigger.subtotalRange?.from ? parseFloat(trigger.subtotalRange.from) : undefined;
      }

      if (trigger?.triggerType === 'ITEM_QUANTITY_RANGE') {
        minQuantity = trigger.itemQuantityRange?.from || undefined;
      }

      const targetProducts = discount?.specificItemsInfo?.scopes
        ?.filter(scope => scope.type === 'CATALOG_ITEM')
        ?.map(scope => scope._id) || [];

      const targetCategories = discount?.specificItemsInfo?.scopes
        ?.filter(scope => scope.type === 'CUSTOM_FILTER' && scope.customFilter?.params?.collectionIds)
        ?.flatMap(scope => scope.customFilter.params.collectionIds) || [];

      return {
        id: wixRule._id,
        name: wixRule.name,
        description: wixRule.offer || '',
        ruleCategory: ruleCategory as 'pricing' | 'moq',
        type: ruleType as 'global' | 'category' | 'product',
        discountType: isPercentage ? 'percentage' : 'fixed',
        discountValue: discountValue || 0,
        minimumOrder: minimumOrder,
        minQuantity: minQuantity,
        isActive: wixRule.active,
        accessGroups: [],
        targetName: targetName,
        targetCategories: targetCategories,
        targetProducts: targetProducts,
        createdDate: wixRule._createdDate,
        updatedDate: wixRule._updatedDate,
        revision: wixRule.revision,
        status: wixRule.status,
        usageCount: wixRule.usageCount || 0,
      };
    });
  };

  // Transform MOQ rules from collection
  const transformMOQRules = (moqRules: any[]): PricingRule[] => {
    return moqRules.map((moqRule) => ({
      id: moqRule._id,
      name: moqRule.name,
      description: moqRule.description || '',
      ruleCategory: 'moq' as const,
      type: moqRule.type,
      discountType: 'percentage' as const,
      discountValue: 0,
      minimumOrder: undefined,
      minQuantity: moqRule.minQuantity || 0,
      isActive: moqRule.isActive,
      accessGroups: moqRule.accessGroups || [],
      targetName: moqRule.targetName || '',
      targetCategories: moqRule.categoryIds || [],
      targetProducts: moqRule.productIds || [],
      createdDate: moqRule.createdDate || moqRule._createdDate,
      updatedDate: moqRule.updatedDate || moqRule._updatedDate,
      revision: moqRule.revision || 1,
      status: moqRule.isActive ? 'active' : 'inactive',
      usageCount: 0,
      moqType: moqRule.moqType,
      casePackSize: moqRule.casePackSize,
      enforceMultiples: moqRule.enforceMultiples,
    }));
  };

  // Fetch all rules
  const fetchRules = useCallback(async () => {
    try {
      let pricingResponse: any = null;
      let moqRulesResponse: any[] = [];

      try {
        pricingResponse = await queryAllRules();
      } catch {}

      try {
        moqRulesResponse = await fetchMOQRulesFromCollection();
      } catch {}

      let transformedPricingRules: PricingRule[] = [];
      let transformedMOQRules: PricingRule[] = [];

      if (pricingResponse && pricingResponse._items) {
        transformedPricingRules = transformWixRules(pricingResponse._items);
      }

      if (moqRulesResponse && moqRulesResponse.length > 0) {
        transformedMOQRules = transformMOQRules(moqRulesResponse);
      }

      const allRules = [...transformedPricingRules, ...transformedMOQRules];
      setRules(allRules);
    } catch (error) {
      throw error;
    }
  }, []);

  // Initialize data
  const initializeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchRules(),
        fetchCatalogData(setCategories, setProducts, setLoadingCatalog),
        fetchAccessGroups(setAccessGroups, setLoadingAccessGroups),
      ]);
    } catch {
      setError('Failed to load rules. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchRules]);

  // Create rule
  const createRule = async (formRule: RuleFormData): Promise<void> => {
    setLoadingActions(prev => ({ ...prev, create: true }));
    setError(null);

    try {
      if (formRule.ruleCategory === 'moq') {
        const moqRuleData = {
          name: formRule.name,
          description: formRule.description || '',
          ruleCategory: formRule.ruleCategory,
          type: formRule.type,
          moqType: formRule.moqType,
          minQuantity: formRule.moqMinQuantity || 0,
          additionalMinQuantity: formRule.minQuantity || undefined,
          maxQuantity: formRule.maxQuantity || undefined,
          minimumOrder: formRule.minimumOrder || undefined,
          casePackSize: formRule.casePackSize || 0,
          enforceMultiples: formRule.enforceMultiples || false,
          targetId: formRule.targetId || '',
          targetName: formRule.targetName || '',
          categoryIds: formRule.type === 'category' && formRule.targetId ? [formRule.targetId] : [],
          productIds: formRule.type === 'product' && formRule.targetId ? [formRule.targetId] : [],
          accessGroups: formRule.accessGroups || [],
          isActive: formRule.isActive,
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        };

        const { items } = await import("@wix/data");
        await items.save("@wd-strategies/wholesale-appllication/PricingRules", moqRuleData);

        await fetchRules();
        dashboard.showToast({
          message: 'MOQ rule created successfully!',
          type: 'success'
        });
        return;
      }

      // Handle pricing rules
      const triggerId = 'wholesale-pricing';
      const triggerAppId = '0415fd4c-b629-4e16-b417-707b9ff48a14';

      const ruleData = {
        name: formRule.name,
        description: formRule.description,
        ruleCategory: formRule.ruleCategory,
        type: formRule.type,
        discountType: formRule.discountType === 'fixed' ? 'fixed_amount' : formRule.discountType,
        percentage: formRule.discountType === 'percentage' ? formRule.discountValue : undefined,
        fixedAmount: formRule.discountType === 'fixed' ? formRule.discountValue?.toString() : undefined,
        minimumOrder: formRule.minimumOrder || undefined,
        minimumQuantity: formRule.minQuantity || undefined,
        categoryIds: formRule.type === 'category' && formRule.targetId ? [formRule.targetId] : undefined,
        productIds: formRule.type === 'product' && formRule.targetId ? [formRule.targetId] : undefined,
        accessGroups: formRule.accessGroups || [],
        isActive: formRule.isActive,
        triggerId,
        triggerAppId,
        catalogAppId: '215238eb-22a5-4c36-9e7b-e7c08025e04e',
        startDate: formRule.startDate || undefined,
        endDate: formRule.endDate || undefined,
      };

      const response = await createUnifiedRule(ruleData);

      if (response.success) {
        await fetchRules();
        dashboard.showToast({
          message: 'Pricing rule created successfully!',
          type: 'success'
        });
      } else {
        throw new Error('Failed to create pricing rule');
      }
    } catch (error) {
      const errorMessage = `Failed to create rule: ${(error as Error).message}`;
      setError(errorMessage);
      dashboard.showToast({
        message: errorMessage,
        type: 'error'
      });
      throw error;
    } finally {
      setLoadingActions(prev => ({ ...prev, create: false }));
    }
  };

  // Update rule
  const updateRule = async (ruleId: string, formRule: RuleFormData): Promise<void> => {
    setLoadingActions(prev => ({ ...prev, [`update-${ruleId}`]: true }));
    setError(null);

    try {
      if (formRule.ruleCategory === 'moq') {
        const moqUpdateData = {
          name: formRule.name,
          description: formRule.description || '',
          ruleCategory: formRule.ruleCategory,
          type: formRule.type,
          moqType: formRule.moqType,
          minQuantity: formRule.minQuantity || 0,
          casePackSize: formRule.casePackSize || 0,
          enforceMultiples: formRule.enforceMultiples || false,
          targetId: formRule.targetId || '',
          targetName: formRule.targetName || '',
          categoryIds: formRule.type === 'category' && formRule.targetId ? [formRule.targetId] : [],
          productIds: formRule.type === 'product' && formRule.targetId ? [formRule.targetId] : [],
          accessGroups: formRule.accessGroups || [],
          isActive: formRule.isActive,
          updatedDate: new Date().toISOString(),
        };

        const { items } = await import("@wix/data");
        await items.update("@wd-strategies/wholesale-appllication/PricingRules", ruleId, moqUpdateData);

        await fetchRules();
        dashboard.showToast({
          message: 'MOQ rule updated successfully!',
          type: 'success'
        });
        return;
      }

      const updateData = {
        name: formRule.name,
        active: formRule.isActive,
        description: formRule.description,
        accessGroups: formRule.accessGroups,
        ruleCategory: formRule.ruleCategory,
        type: formRule.type,
        startDate: formRule.startDate || undefined,
        endDate: formRule.endDate || undefined,
      };

      const response = await updateUnifiedRule(ruleId, updateData);

      if (response.success) {
        await fetchRules();
        dashboard.showToast({
          message: 'Pricing rule updated successfully!',
          type: 'success'
        });
      } else {
        throw new Error('Failed to update pricing rule');
      }
    } catch (error) {
      const errorMessage = `Failed to update rule: ${(error as Error).message}`;
      setError(errorMessage);
      dashboard.showToast({
        message: errorMessage,
        type: 'error'
      });
      throw error;
    } finally {
      setLoadingActions(prev => ({ ...prev, [`update-${ruleId}`]: false }));
    }
  };

  // Delete rule
  const deleteRule = async (ruleId: string): Promise<void> => {
    setLoadingActions(prev => ({ ...prev, [`delete-${ruleId}`]: true }));
    setError(null);

    try {
      const response = await deleteUnifiedRule(ruleId);

      if (response.success) {
        await fetchRules();
        dashboard.showToast({
          message: 'Rule deleted successfully!',
          type: 'success'
        });
      } else {
        throw new Error('Failed to delete rule');
      }
    } catch (error) {
      const errorMessage = `Failed to delete rule: ${(error as Error).message}`;
      setError(errorMessage);
      dashboard.showToast({
        message: errorMessage,
        type: 'error'
      });
      throw error;
    } finally {
      setLoadingActions(prev => ({ ...prev, [`delete-${ruleId}`]: false }));
    }
  };

  // Toggle rule active status
  const toggleRule = async (ruleId: string): Promise<void> => {
    setLoadingActions(prev => ({ ...prev, [`toggle-${ruleId}`]: true }));
    setError(null);

    try {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) throw new Error('Rule not found');

      const response = await updateUnifiedRule(ruleId, {
        active: !rule.isActive
      });

      if (response.success) {
        await fetchRules();
        dashboard.showToast({
          message: `Rule ${!rule.isActive ? 'activated' : 'deactivated'} successfully!`,
          type: 'success'
        });
      } else {
        throw new Error('Failed to toggle rule');
      }
    } catch (error) {
      const errorMessage = `Failed to toggle rule: ${(error as Error).message}`;
      setError(errorMessage);
      dashboard.showToast({
        message: errorMessage,
        type: 'error'
      });
      throw error;
    } finally {
      setLoadingActions(prev => ({ ...prev, [`toggle-${ruleId}`]: false }));
    }
  };

  // Clear error
  const clearError = () => setError(null);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return {
    // State
    rules,
    isLoading,
    loadingActions,
    categories,
    products,
    loadingCatalog,
    accessGroups,
    loadingAccessGroups,
    error,

    // Actions
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    clearError,
    refetchRules: fetchRules,
  };
};