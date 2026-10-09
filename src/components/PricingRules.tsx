import React, { type FC, useState, useEffect, useRef } from 'react';
import { dashboard } from '@wix/dashboard';
import { RuleForm } from './RuleForm';
import {
  type AccessGroup,
  type Category,
  type Product,
  fetchCatalogData,
  fetchAccessGroups,
  formatDiscount,
  formatMOQInfo,
  formatShippingInfo,
  getAccessGroupNames,
  SHIPPING_COLLECTION,
} from './RuleFunction';

import {
  createUnifiedRule,
  queryAllRules,
  updateUnifiedRule,
  deleteUnifiedRule,
  getUnifiedRule,
  getAppPlanIds,
  createBulkCsvRules,
  getProductById,
  repairWholesaleRuleGates,
  mergeSplitRuleFamilies,
} from "../backend/pricing.client";
import { dev_mode } from '../dashboard/dev_mode';
import { useAppInstance } from '../utils/appInstance';
import { useSiteCurrency } from '../utils/currency';
import { type PricingRule } from './RuleFunction';
import { type FilterType, type LoadingActions } from './PricingRuleTypes';
import { DeleteConfirmation } from './DeleteConfirmation';
import { UpgradeModal } from './UpgradeModal';
import { ProductDetailModal } from './ProductDetailModal';
import {
  AutoComplete,
  Badge,
  Box,
  Button,
  Card,
  CellStack,
  Checkbox,
  type Column,
  DataTable,
  Dropdown,
  EmptyState,
  LoadingBlock,
  Modal,
  Notice,
  Page,
  PageHeader,
  Pagination,
  RowActions,
  ScrollTopButton,
  Search,
  SelectionBar,
  TableFooter,
  Tabs,
  Toolbar,
  VisuallyHidden,
} from './ui';
import { DashIcons } from './Dashboard/icons';

const ProductsListModal: React.FC<{ productIds: string[]; onClose: () => void }> = ({ productIds, onClose }) => {
  const [fetchedProducts, setFetchedProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    Promise.all(productIds.map(id => getProductById(id).catch(() => null))).then(results => {
      setFetchedProducts(results.filter(Boolean));
      setLoading(false);
    });
  }, []);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="medium"
      title="Products in this rule"
      subtitle={`${productIds.length} product${productIds.length === 1 ? '' : 's'}`}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {loading ? (
        <LoadingBlock message="Loading products…" />
      ) : (
        <Box direction="vertical" gap="12px">
          {fetchedProducts.map((p: any, i) => {
            const productImage = p?.media?.mainMedia?.image?.url || p?.media?.items?.[0]?.image?.url || p?.mainMedia?.url || null;
            const productPrice = p?.priceData?.price ?? p?.price?.price ?? p?.priceData?.formattedPrice ?? null;
            const productSku = p?.sku || p?.variants?.[0]?.variant?.sku || null;
            const stockStatus = p?.stock?.inventoryStatus || p?.inventoryStatus || (p?.stock?.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK') || null;
            return (
              <Box key={p?._id || i} gap="16px" verticalAlign="middle" padding="12px" border="1px solid var(--wh-line)" borderRadius="12px">
                {productImage ? (
                  <img src={productImage} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                ) : (
                  <Box width="72px" height="72px" borderRadius="10px" backgroundColor="var(--wh-sunk)" align="center" verticalAlign="middle" color="var(--wh-disabled)" style={{ flexShrink: 0 }}>
                    <DashIcons.Box size={24} />
                  </Box>
                )}
                <Box direction="vertical" gap="6px" flex="1">
                  <strong style={{ fontSize: 15 }}>{p?.name}</strong>
                  <Box gap="6px" wrap verticalAlign="middle">
                    {productPrice !== null && (
                      <span style={{ fontWeight: 700, color: 'var(--wh-accent)' }}>
                        ${typeof productPrice === 'number' ? productPrice.toFixed(2) : productPrice}
                      </span>
                    )}
                    {productSku && <Badge tone="neutral" dot={false}>SKU {productSku}</Badge>}
                    {stockStatus && stockStatus !== 'IN_STOCK' && <Badge tone="danger">Out of stock</Badge>}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Modal>
  );
};

export const PricingRulesView: FC = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [loadingActions, setLoadingActions] = useState<LoadingActions>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [accessGroups, setAccessGroups] = useState<AccessGroup[]>([]);
  const [loadingAccessGroups, setLoadingAccessGroups] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusSort, setStatusSort] = useState<'default' | 'active' | 'inactive'>('default');
  const [error, setError] = useState<string | null>(null);
  const { appInstance, isLoading: isInstanceLoading, error: instanceError, retry: retryInstance } = useAppInstance();
  const { currency } = useSiteCurrency();
  const isFree = !dev_mode && appInstance?.instance?.isFree === true;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    ruleId: string;
    ruleName: string;
  }>({
    isOpen: false,
    ruleId: '',
    ruleName: ''
  });

  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const [productDetail, setProductDetail] = useState<{
    isOpen: boolean;
    productId: string;
    productIds: string[];
    productName?: string;
  }>({
    isOpen: false,
    productId: '',
    productIds: [],
    productName: undefined,
  });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const rulesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (rulesContainerRef.current) {
      rulesContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    scrollToTop();
  }, [currentPage]);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (documentHeight - (scrollTop + windowHeight) < 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setError(null);
      fetchCatalogData(setCategories, setProducts, setLoadingCatalog);
      fetchAccessGroups(setAccessGroups, setLoadingAccessGroups);
      // Group pieces of rules the dashboard used to split one-by-one, so they list and edit as one rule.
      try {
        await mergeSplitRuleFamilies();
      } catch (mergeError) {
        console.warn('[mergeSplitRuleFamilies] failed', mergeError);
      }
      // Re-save older rules without the wholesale gate before listing them, since repair replaces rule IDs.
      try {
        const repair = await repairWholesaleRuleGates();
        if (repair && !repair.success) {
          console.warn('[repairWholesaleRuleGates] rules that could not be updated', repair.failed);
          const [first] = repair.failed;
          throw new Error(`${repair.failed.length} rule(s) could not be updated. First: "${first?.name}": ${first?.error}`);
        }
      } catch (repairError) {
        dashboard.showToast({
          message: `Some pricing rules may still apply to retail customers: ${(repairError as Error).message}`,
          type: 'error'
        });
      }
      try {
        await fetchEnhancedRules();
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, []);

  const fetchEnhancedRules = async () => {
    try {
      let pricingResponse: any = null;
      let moqRulesResponse: any = null;
      let shippingRulesResponse: any = null;

      try {
        pricingResponse = await queryAllRules();
      } catch {
        // Ignore query error
      }

      try {
        const { items: dataItems } = await import("@wix/data");
        const moqResults = await dataItems.query("@wd-strategies/wholesale-appllication/PricingRules").find();
        moqRulesResponse = moqResults.items;
      } catch {
        // Ignore query error
      }

      try {
        const { items: dataItems } = await import("@wix/data");
        const shippingResults = await dataItems.query(SHIPPING_COLLECTION).find();
        shippingRulesResponse = shippingResults.items;
      } catch {
        // Ignore query error
      }

      let transformedPricingRules: PricingRule[] = [];
      const pricingItems = pricingResponse?.items || pricingResponse?._items || [];

      if (pricingItems && pricingItems.length > 0) {
        transformedPricingRules = pricingItems.map((wixRule: any) => {
          const discount = wixRule.discounts?.values?.[0];
          const isPercentage = discount?.discountType === 'PERCENTAGE';
          const isFixedPrice = discount?.discountType === 'FIXED_PRICE';
          const discountValue = isPercentage ? discount.percentage : (isFixedPrice ? discount.fixedPrice : discount.fixedAmount);

          let ruleType: 'global' | 'category' | 'product' | 'bulk_csv' = 'global';
          let targetId = '';
          let targetName = '';
          let targetCategories: string[] = [];
          let targetProducts: string[] = [];

          if (discount?.specificItemsInfo?.scopes?.length > 0) {
            const allScopes = discount.specificItemsInfo.scopes;
            const categoryScopes = allScopes.filter(
              (s: any) => s.type === 'CUSTOM_FILTER' && s.customFilter?.params?.collectionIds
            );
            const productScopes = allScopes.filter(
              (s: any) => s.type === 'CATALOG_ITEM' && s.catalogItemFilter?.catalogItemIds?.length > 0
            );
            const globalScope = allScopes.find(
              (s: any) => s.type === 'CATALOG_ITEM' && (s.catalogItemFilter?.catalogItemIds?.length === 0)
            );

            if (categoryScopes.length > 0) {
              ruleType = 'category';
              targetCategories = categoryScopes.flatMap((s: any) => s.customFilter.params.collectionIds);
              targetId = targetCategories[0];
              targetName = targetCategories.length > 1 ? `${targetCategories.length} Categories` : `Category ${targetId}`;
            } else if (productScopes.length > 0) {
              const allProductIds = productScopes.flatMap((s: any) => s.catalogItemFilter.catalogItemIds);
              const hasCategoryPrefix = allProductIds.some((id: string) => id.startsWith('category_'));
              if (hasCategoryPrefix) {
                ruleType = 'category';
                targetCategories = allProductIds.map((id: string) => id.replace('category_', ''));
                targetId = targetCategories[0];
                targetName = targetCategories.length > 1 ? `${targetCategories.length} Categories` : `Category ${targetId}`;
              } else {
                ruleType = 'product';
                targetProducts = allProductIds;
                targetId = allProductIds[0];
                targetName = allProductIds.length > 1 ? `${allProductIds.length} Products` : (wixRule.name || 'Single Product');
              }
            } else if (globalScope) {
              ruleType = 'global';
            }
          }

          let minimumOrder: number | undefined;
          let maximumOrder: number | undefined;
          let minQuantity: number | undefined;
          let maxQuantity: number | undefined;
          let memberIdsFromTrigger: string[] = [];

          const extractFromTrigger = (t: any) => {
            if (!t) return;
            if (t.triggerType === 'AND') (t.and?.triggers || []).forEach(extractFromTrigger);
            else if (t.triggerType === 'SUBTOTAL_RANGE') {
              minimumOrder = t.subtotalRange?.from ? parseFloat(t.subtotalRange.from) : undefined;
              maximumOrder = t.subtotalRange?.to ? parseFloat(t.subtotalRange.to) : undefined;
            } else if (t.triggerType === 'ITEM_QUANTITY_RANGE') {
              minQuantity = t.itemQuantityRange?.from || undefined;
              maxQuantity = t.itemQuantityRange?.to || undefined;
            } else if (t.triggerType === 'CUSTOMER_ELIGIBILITY') {
              memberIdsFromTrigger = t.customerEligibility?.individualMembersInfo?.memberIds || [];
            }
          };
          extractFromTrigger(wixRule.trigger);

          const offerString = wixRule.offer || '';
          const groupTagMatch = offerString.match(/ \|\| Groups: (.*)$/);
          const cleanDescription = groupTagMatch ? offerString.replace(/ \|\| Groups: (.*)$/, '') : offerString;
          const extractedGroups = groupTagMatch ? groupTagMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean) : [];

          return {
            id: wixRule._id,
            name: wixRule.name,
            description: cleanDescription,
            ruleCategory: 'pricing',
            type: ruleType,
            discountType: (isPercentage ? 'percentage' : (isFixedPrice ? 'fixed_price' : 'fixed')),
            discountValue: discountValue || 0,
            minimumOrder, maximumOrder, minQuantity, maxQuantity,
            isActive: wixRule.active,
            accessGroups: extractedGroups,
            memberIds: memberIdsFromTrigger,
            targetId, targetName, targetCategories, targetProducts,
            startDate: wixRule.activeTimeInfo?.start || null,
            endDate: wixRule.activeTimeInfo?.end || null,
            createdDate: wixRule._createdDate,
            updatedDate: wixRule._updatedDate,
            revision: wixRule.revision,
          };
        });
      }

      const transformedMOQRules = (moqRulesResponse || []).map((m: any) => ({
        ...m, id: m._id, ruleCategory: 'moq', targetCategories: m.categoryIds || [], targetProducts: m.productIds || []
      }));
      const transformedShippingRules = (shippingRulesResponse || []).map((s: any) => ({
        ...s, id: s._id, ruleCategory: 'shipping'
      }));

      setRules([...transformedPricingRules, ...transformedMOQRules, ...transformedShippingRules]);
    } catch {
      // Ignore error
    }
  };

  const handleEnhancedCreateRule = async (formRule: any) => {
    setLoadingActions(prev => ({ ...prev, create: true }));
    try {
      if (formRule.ruleCategory === 'moq' || formRule.ruleCategory === 'shipping') {
        const collection = formRule.ruleCategory === 'moq' ? "@wd-strategies/wholesale-appllication/PricingRules" : SHIPPING_COLLECTION;
        const { items: dataItems } = await import("@wix/data");
        await dataItems.save(collection, { ...formRule, createdDate: new Date().toISOString() });
      } else {
        const groupTag = formRule.accessGroups?.length > 0 ? ` || Groups: ${formRule.accessGroups.join(',')}` : '';
        const accessGroupMemberIds = (formRule.accessGroups || []).flatMap(
          gid => accessGroups.find(g => g.id === gid)?.members.map((m: any) => m.id) || []
        );
        const allMemberIds = Array.from(new Set([...(formRule.memberIds || []), ...accessGroupMemberIds]));
        
        // Convert form discount fields to the shape expected by createUnifiedRule
        const formDiscountType = formRule.discountType; // 'percentage' | 'fixed' | 'fixed_price'
        const formDiscountValue = formRule.discountValue;
        const backendDiscountType =
          formDiscountType === 'fixed' ? 'fixed_amount' :
          formDiscountType === 'fixed_price' ? 'fixed_price' :
          'percentage';

        const ruleBaseData = {
          ...formRule,
          description: (formRule.description || '') + groupTag,
          discountType: backendDiscountType,
          percentage: formDiscountType === 'percentage' ? formDiscountValue : undefined,
          fixedAmount: formDiscountType === 'fixed' ? (formDiscountValue !== undefined ? String(formDiscountValue) : undefined) : undefined,
          fixedPrice: formDiscountType === 'fixed_price' ? (formDiscountValue !== undefined ? String(formDiscountValue) : undefined) : undefined,
          productIds: formRule.type === 'product' ? (formRule.targetIds?.length > 0 ? formRule.targetIds : (formRule.targetId ? [formRule.targetId] : [])) : undefined,
          categoryIds: formRule.type === 'category' ? (formRule.categoryIds?.length > 0 ? formRule.categoryIds : (formRule.targetId ? [formRule.targetId] : [])) : undefined,
        };

        // One call with every member: the server splits them into Wix rules of 100 that share a
        // ruleFamilyId, so they list, edit and delete as one rule. Splitting here gave each piece its own family.
        const ruleData = {
          ...ruleBaseData,
          memberIds: allMemberIds.length > 0 ? allMemberIds : formRule.memberIds,
        };
        if (formRule.type === 'bulk_csv') {
          await createBulkCsvRules(ruleData);
        } else {
          await createUnifiedRule(ruleData);
        }
      }
      setShowCreateForm(false);
      dashboard.showToast({ message: 'Rule(s) created successfully', type: 'success' });
      fetchEnhancedRules();
    } catch (e: any) {
      dashboard.showToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, create: false }));
    }
  };

  const handleEnhancedUpdateRule = async (ruleId: string, formRule: any) => {
    setLoadingActions(prev => ({ ...prev, [`update-${ruleId}`]: true }));
    try {
      if (formRule.ruleCategory === 'moq' || formRule.ruleCategory === 'shipping') {
        const collection = formRule.ruleCategory === 'moq' ? "@wd-strategies/wholesale-appllication/PricingRules" : SHIPPING_COLLECTION;
        const { items: dataItems } = await import("@wix/data");
        await dataItems.update(collection, { ...formRule, _id: ruleId, updatedDate: new Date().toISOString() });
      } else {
        const groupTag = formRule.accessGroups?.length > 0 ? ` || Groups: ${formRule.accessGroups.join(',')}` : '';
        const accessGroupMemberIds = (formRule.accessGroups || []).flatMap(
          gid => accessGroups.find(g => g.id === gid)?.members.map((m: any) => m.id) || []
        );
        const allMemberIds = Array.from(new Set([...(formRule.memberIds || []), ...accessGroupMemberIds]));
        // Convert form discount fields to the shape expected by updateUnifiedRule
        const updFormDiscountType = formRule.discountType; // 'percentage' | 'fixed' | 'fixed_price'
        const updFormDiscountValue = formRule.discountValue;
        const updBackendDiscountType =
          updFormDiscountType === 'fixed' ? 'fixed_amount' :
          updFormDiscountType === 'fixed_price' ? 'fixed_price' :
          'percentage';

        const updateData = {
          ...formRule,
          active: formRule.isActive,
          description: (formRule.description || '') + groupTag,
          discountType: updBackendDiscountType,
          percentage: updFormDiscountType === 'percentage' ? updFormDiscountValue : undefined,
          fixedAmount: updFormDiscountType === 'fixed' ? (updFormDiscountValue !== undefined ? String(updFormDiscountValue) : undefined) : undefined,
          fixedPrice: updFormDiscountType === 'fixed_price' ? (updFormDiscountValue !== undefined ? String(updFormDiscountValue) : undefined) : undefined,
          memberIds: allMemberIds.length > 0 ? allMemberIds : formRule.memberIds,
          productIds: formRule.type === 'product' ? (formRule.targetIds?.length > 0 ? formRule.targetIds : (formRule.targetId ? [formRule.targetId] : [])) : undefined,
          categoryIds: formRule.type === 'category' ? (formRule.categoryIds?.length > 0 ? formRule.categoryIds : (formRule.targetId ? [formRule.targetId] : [])) : undefined,
        };
        await updateUnifiedRule(ruleId, updateData);
      }
      setShowEditForm(false);
      dashboard.showToast({ message: 'Rule updated successfully', type: 'success' });
      setIsLoading(true);
      await fetchEnhancedRules();
      setIsLoading(false);
    } catch (e: any) {
      dashboard.showToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`update-${ruleId}`]: false }));
    }
  };

  const handleEnhancedToggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    setLoadingActions(prev => ({ ...prev, [`toggle-${ruleId}`]: true }));
    try {
      if (rule.ruleCategory === 'moq' || rule.ruleCategory === 'shipping') {
        const collection = rule.ruleCategory === 'moq' ? "@wd-strategies/wholesale-appllication/PricingRules" : SHIPPING_COLLECTION;
        const { items: dataItems } = await import("@wix/data");
        await dataItems.update(collection, { _id: ruleId, isActive: !rule.isActive });
      } else {
        await updateUnifiedRule(ruleId, { active: !rule.isActive, revision: rule.revision });
      }
      await fetchEnhancedRules();
      dashboard.showToast({ message: 'Rule updated successfully', type: 'success' });
    } catch (e: any) {
      dashboard.showToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`toggle-${ruleId}`]: false }));
    }
  };

  const handleEnhancedDeleteRule = async (ruleId: string, skipRefresh = false) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    setLoadingActions(prev => ({ ...prev, [`delete-${ruleId}`]: true }));
    try {
      if (rule.ruleCategory === 'moq' || rule.ruleCategory === 'shipping') {
        const collection = rule.ruleCategory === 'moq' ? "@wd-strategies/wholesale-appllication/PricingRules" : SHIPPING_COLLECTION;
        const { items: dataItems } = await import("@wix/data");
        await dataItems.remove(collection, ruleId);
      } else {
        await deleteUnifiedRule(ruleId);
      }
      
      if (!skipRefresh) {
        await fetchEnhancedRules();
        dashboard.showToast({ message: 'Rule deleted successfully', type: 'success' });
      }
    } catch (e: any) {
      dashboard.showToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, [`delete-${ruleId}`]: false }));
      if (!skipRefresh) {
        setDeleteConfirmation({ isOpen: false, ruleId: '', ruleName: '' });
      }
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRuleIds);
    setLoadingActions(prev => ({ ...prev, 'bulk-delete': true }));
    try {
      for (const id of ids) {
        await handleEnhancedDeleteRule(id, true);
      }
      await fetchEnhancedRules();
      setSelectedRuleIds(new Set());
      dashboard.showToast({ message: 'Rules deleted successfully', type: 'success' });
    } catch (e: any) {
      dashboard.showToast({ message: `Error: ${e.message}`, type: 'error' });
    } finally {
      setLoadingActions(prev => ({ ...prev, 'bulk-delete': false }));
      setShowBulkDeleteConfirm(false);
    }
  };

  const openDeleteConfirmation = (ruleId: string, ruleName: string) => setDeleteConfirmation({ isOpen: true, ruleId, ruleName });
  const confirmDelete = () => deleteConfirmation.ruleId && handleEnhancedDeleteRule(deleteConfirmation.ruleId);
  const toggleRuleSelection = (id: string) => setSelectedRuleIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredRules = rules.filter(r => {
    const matchesProduct = selectedProductId === 'all' || r.targetId === selectedProductId || (r.targetProducts || []).includes(selectedProductId);
    const matchesSearch = !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || (['pricing', 'moq', 'shipping'].includes(activeFilter) ? r.ruleCategory === activeFilter : r.type === activeFilter);
    return matchesProduct && matchesSearch && matchesFilter;
  });

  // Stable sort: keeps the original order within each status group
  if (statusSort !== 'default') {
    const activeFirst = statusSort === 'active';
    filteredRules.sort((a, b) => Number(activeFirst ? b.isActive : a.isActive) - Number(activeFirst ? a.isActive : b.isActive));
  }

  const paginatedRules = filteredRules.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredRules.length / PAGE_SIZE);

  const toggleSelectAllOnPage = () => {
    const allOnPage = paginatedRules.every(r => selectedRuleIds.has(r.id));
    setSelectedRuleIds(prev => {
      const next = new Set(prev);
      paginatedRules.forEach(r => allOnPage ? next.delete(r.id) : next.add(r.id));
      return next;
    });
  };

  const CATEGORY_LABEL: Record<string, string> = { pricing: 'Pricing', moq: 'MOQ', shipping: 'Shipping' };
  const TYPE_LABEL: Record<string, string> = { global: 'All products', category: 'Categories', product: 'Products', bulk_csv: 'CSV import' };

  const ruleProductIds = (row: PricingRule): string[] =>
    row.targetProducts && row.targetProducts.length > 0 ? row.targetProducts : (row.targetId ? [row.targetId] : []);

  const ruleColumns: Column<PricingRule>[] = [
    {
      title: (
        <Checkbox
          aria-label="Select all rules on this page"
          checked={paginatedRules.length > 0 && paginatedRules.every(r => selectedRuleIds.has(r.id))}
          indeterminate={paginatedRules.some(r => selectedRuleIds.has(r.id)) && !paginatedRules.every(r => selectedRuleIds.has(r.id))}
          onChange={toggleSelectAllOnPage}
        />
      ),
      width: '48px',
      render: (row) => (
        <Checkbox aria-label={`Select ${row.name}`} checked={selectedRuleIds.has(row.id)} onChange={() => toggleRuleSelection(row.id)} />
      ),
    },
    {
      title: 'Rule',
      render: (row) => <CellStack primary={row.name} secondary={row.description} title={row.name} />,
    },
    {
      title: 'Type',
      width: '170px',
      render: (row) => (
        <Box gap="6px" wrap>
          <Badge tone={row.ruleCategory === 'moq' ? 'pink' : row.ruleCategory === 'shipping' ? 'warning' : 'info'} dot={false}>
            {CATEGORY_LABEL[row.ruleCategory] || row.ruleCategory}
          </Badge>
          {TYPE_LABEL[row.type] && <Badge tone="neutral" dot={false}>{TYPE_LABEL[row.type]}</Badge>}
        </Box>
      ),
    },
    {
      title: 'Value',
      width: '160px',
      render: (row) => (
        <strong style={{ color: 'var(--wh-ink)' }}>
          {row.ruleCategory === 'moq' ? formatMOQInfo(row) : row.ruleCategory === 'shipping' ? formatShippingInfo(row, currency) : formatDiscount(row, currency)}
        </strong>
      ),
    },
    {
      title: 'Status',
      width: '110px',
      render: (row) => <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      title: <VisuallyHidden>Actions</VisuallyHidden>,
      align: 'right',
      width: '130px',
      render: (row) => {
        const productIds = ruleProductIds(row);
        const secondary = [
          ...((row.type === 'product' || productIds.length > 0) ? [{
            text: productIds.length > 1 ? 'View products' : 'View product',
            icon: <DashIcons.Box size={16} />,
            onClick: () => {
              if (productIds.length > 0) setProductDetail({ isOpen: true, productId: productIds[0], productIds, productName: row.targetName });
            },
            disabled: productIds.length === 0,
          }] : []),
          {
            text: 'Delete rule',
            icon: <DashIcons.Trash size={16} />,
            onClick: () => openDeleteConfirmation(row.id, row.name),
            disabled: !!loadingActions[`delete-${row.id}`],
            danger: true,
          },
        ];
        return (
          <RowActions
            primaryAction={{
              text: 'Edit',
              icon: <DashIcons.Edit size={14} />,
              onClick: () => { setEditingRule(row); setShowEditForm(true); },
              loading: !!loadingActions[`update-${row.id}`],
            }}
            secondaryActions={secondary}
          />
        );
      },
    },
  ];


  const countFor = (category?: string) => category ? rules.filter(r => r.ruleCategory === category).length : rules.length;
  const activeCount = rules.filter(r => r.isActive).length;

  return (
    <Page ref={rulesContainerRef}>
      <PageHeader
        breadcrumb="Wholesale › Pricing rules"
        title="Pricing rules"
        subtitle="Automate wholesale discounts, minimum order quantities and shipping for your customers and groups."
        actions={
          <Button
            onClick={() => setShowCreateForm(true)}
            prefixIcon={<DashIcons.Plus size={16} />}
            disabled={isInstanceLoading || !!instanceError}
          >
            New rule
          </Button>
        }
      />

      {instanceError && (
        <Notice
          tone="error"
          title="Plan information couldn't be loaded"
          action={<Button variant="secondary" size="small" onClick={retryInstance}>Retry</Button>}
        >
          Creating rules is disabled until it loads.
        </Notice>
      )}

      <Tabs
        aria-label="Filter rules by type"
        activeId={activeFilter}
        items={[
          { id: 'all', title: `All (${countFor()})` },
          { id: 'pricing', title: `Pricing (${countFor('pricing')})` },
          { id: 'moq', title: `MOQ (${countFor('moq')})` },
          { id: 'shipping', title: `Shipping (${countFor('shipping')})` },
        ]}
        onClick={it => { setActiveFilter(it.id as any); setCurrentPage(1); }}
      />

      <Card aria-label="Rules">
        <Card.Header
          title="Rules"
          subtitle={isLoading ? undefined : `${activeCount} active of ${rules.length}`}
        >
          <Toolbar>
            <div style={{ width: 240 }}>
              <Search
                size="small"
                placeholder="Search rules"
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                onClear={() => setSearchTerm('')}
                value={searchTerm}
              />
            </div>
            <div style={{ width: 240 }}>
              <AutoComplete
                size="small"
                placeholder="Filter by product"
                options={[{ id: 'all', value: 'All products' }, ...products.map(p => ({ id: p._id, value: p.name }))]}
                onSelect={opt => { setSelectedProductId(opt.id as string); setCurrentPage(1); }}
                onClear={() => setSelectedProductId('all')}
              />
            </div>
            <div style={{ width: 180 }}>
              <Dropdown
                size="small"
                aria-label="Sort rules by status"
                options={[
                  { id: 'default', value: 'Default order' },
                  { id: 'active', value: 'Active first' },
                  { id: 'inactive', value: 'Inactive first' },
                ]}
                selectedId={statusSort}
                onSelect={opt => { setStatusSort(opt.id as 'default' | 'active' | 'inactive'); setCurrentPage(1); }}
              />
            </div>
          </Toolbar>
        </Card.Header>

        {selectedRuleIds.size > 0 && (
          <SelectionBar count={selectedRuleIds.size} onClear={() => setSelectedRuleIds(new Set())} disabled={!!loadingActions['bulk-delete']}>
            <Button size="small" variant="danger" onClick={() => setShowBulkDeleteConfirm(true)} prefixIcon={<DashIcons.Trash size={14} />}>
              Delete selected
            </Button>
          </SelectionBar>
        )}

        {isLoading ? (
          <LoadingBlock message="Loading your rules…" />
        ) : (
          <>
            <DataTable
              data={paginatedRules}
              columns={ruleColumns}
              rowKey={(row) => row.id}
              isRowSelected={(row) => selectedRuleIds.has(row.id)}
              emptyState={
                rules.length === 0 ? (
                  <EmptyState
                    icon={<DashIcons.Tag size={22} />}
                    title="No rules yet"
                    subtitle="Create a rule to give wholesale customers discounts, minimum quantities or shipping terms."
                    action={
                      <Button onClick={() => setShowCreateForm(true)} prefixIcon={<DashIcons.Plus size={16} />} disabled={isInstanceLoading || !!instanceError}>
                        New rule
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState title="No rules match" subtitle="Try a different search, product or type filter." />
                )
              }
            />
            {filteredRules.length > 0 && (
              <TableFooter>
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + paginatedRules.length} of {filteredRules.length}
                </span>
                <Pagination currentPage={currentPage} totalPages={totalPages} onChange={e => setCurrentPage(e.page)} />
              </TableFooter>
            )}
          </>
        )}
      </Card>

      {showCreateForm && (
        <RuleForm
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleEnhancedCreateRule}
          categories={categories}
          products={products}
          accessGroups={accessGroups}
          loadingCatalog={loadingCatalog}
          loadingAccessGroups={loadingAccessGroups}
          setAccessGroups={setAccessGroups}
          onAccessGroupsChanged={fetchEnhancedRules}
        />
      )}

      {showEditForm && editingRule && (
        <RuleForm
          mode="edit"
          rule={editingRule}
          onClose={() => setShowEditForm(false)}
          onSubmit={nr => handleEnhancedUpdateRule(editingRule.id, nr)}
          categories={categories}
          products={products}
          accessGroups={accessGroups}
          loadingCatalog={loadingCatalog}
          loadingAccessGroups={loadingAccessGroups}
          setAccessGroups={setAccessGroups}
          onAccessGroupsChanged={fetchEnhancedRules}
        />
      )}

      {deleteConfirmation.isOpen && (
        <DeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          ruleName={deleteConfirmation.ruleName}
          onConfirm={confirmDelete}
          onClose={() => setDeleteConfirmation({ isOpen: false, ruleId: '', ruleName: '' })}
          isLoading={loadingActions[`delete-${deleteConfirmation.ruleId}`]}
        />
      )}

      {showBulkDeleteConfirm && (
        <DeleteConfirmation
          isOpen={showBulkDeleteConfirm}
          ruleName={`${selectedRuleIds.size} rules`}
          onConfirm={handleBulkDelete}
          onClose={() => setShowBulkDeleteConfirm(false)}
          isLoading={loadingActions['bulk-delete']}
        />
      )}

      {productDetail.isOpen && productDetail.productIds.length > 1 ? (
        <ProductsListModal
          productIds={productDetail.productIds}
          onClose={() => setProductDetail({ isOpen: false, productId: '', productIds: [], productName: undefined })}
        />
      ) : productDetail.isOpen ? (
        <ProductDetailModal
          productId={productDetail.productId}
          productName={productDetail.productName}
          onClose={() => setProductDetail({ isOpen: false, productId: '', productIds: [], productName: undefined })}
        />
      ) : null}

      {showScrollTop && <ScrollTopButton onClick={scrollToTop} />}
    </Page>
  );
};
