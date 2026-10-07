import { httpClient } from '@wix/essentials';
import type * as server from './pricing.server';
import { PRICING_ROUTES, type PricingMethod } from './pricing.routes';

// Frontend proxies for the backend methods in pricing.server.ts. Each one POSTs its
// arguments to /api/pricing/<route> with the caller's identity attached, and keeps
// the server function's signature so call sites read the same as the old web methods.

type ServerMethod<K extends PricingMethod> = (typeof server)[K];

// Kept in a variable on purpose: Vite rewrites `new URL(<template>, import.meta.url)`
// into a static-asset lookup, which turns every route into `<module dir>/undefined`.
const MODULE_URL = import.meta.url;

async function callPricingRoute(method: PricingMethod, args: unknown[]): Promise<unknown> {
  const url = new URL(`/api/pricing/${PRICING_ROUTES[method]}`, MODULE_URL).href;
  const res = await httpClient.fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `${method} failed with status ${res.status}`);
  }
  return body?.result;
}

function rpc<K extends PricingMethod>(method: K): ServerMethod<K> {
  return ((...args: unknown[]) => callPricingRoute(method, args)) as ServerMethod<K>;
}

export const getProductById = rpc('getProductById');
export const getProductWholesalePrice = rpc('getProductWholesalePrice');
export const getWholesalePricesBySlugs = rpc('getWholesalePricesBySlugs');
export const updateProductById = rpc('updateProductById');
export const createOrGetExtendedField = rpc('createOrGetExtendedField');
export const getMemberDetails = rpc('getMemberDetails');
export const createCustomField = rpc('createCustomField');
export const createMemberCustomField = rpc('createMemberCustomField');
export const updateContact = rpc('updateContact');
export const isContactWholesale = rpc('isContactWholesale');
export const getExtendedFieldsForMember = rpc('getExtendedFieldsForMember');
export const getWholesaleContacts = rpc('getWholesaleContacts');
export const searchWholesaleContacts = rpc('searchWholesaleContacts');
export const getAllContacts = rpc('getAllContacts');
export const getContactsByCustomerStatus = rpc('getContactsByCustomerStatus');
export const getContact = rpc('getContact');
export const findContactByEmail = rpc('findContactByEmail');
export const findOrCreateContactForApplication = rpc('findOrCreateContactForApplication');
export const getAllMembers = rpc('getAllMembers');
export const getMembersByIds = rpc('getMembersByIds');
export const fetchAllProductsV1 = rpc('fetchAllProductsV1');
export const fetchAllProductsV3 = rpc('fetchAllProductsV3');
export const getAllProductsCategoryV3 = rpc('getAllProductsCategoryV3');
export const checkCatalogVersion = rpc('checkCatalogVersion');
export const handleCatalogLogic = rpc('handleCatalogLogic');
export const getCategoryName = rpc('getCategoryName');
export const getAllProductsCategoryV1 = rpc('getAllProductsCategoryV1');
export const getAppInstance = rpc('getAppInstance');
export const getUpgradeUrl = rpc('getUpgradeUrl');
export const saveConfiguration = rpc('saveConfiguration');
export const getConfiguration = rpc('getConfiguration');
export const resetConfigurationToDefaults = rpc('resetConfigurationToDefaults');
export const getNotificationSetting = rpc('getNotificationSetting');
export const updateNotificationSetting = rpc('updateNotificationSetting');
export const getCurrentMember = rpc('getCurrentMember');
export const addMembersToDiscountRule = rpc('addMembersToDiscountRule');
export const createUnifiedRule = rpc('createUnifiedRule');
export const createBulkCsvRules = rpc('createBulkCsvRules');
export const processBulkCsvData = rpc('processBulkCsvData');
export const queryAllRules = rpc('queryAllRules');
export const updateUnifiedRule = rpc('updateUnifiedRule');
export const deleteUnifiedRule = rpc('deleteUnifiedRule');
export const getUnifiedRule = rpc('getUnifiedRule');
export const getMembersFromDiscountRule = rpc('getMembersFromDiscountRule');
export const removeMembersFromDiscountRule = rpc('removeMembersFromDiscountRule');
export const revokeWholesaleAccess = rpc('revokeWholesaleAccess');
export const appendMembersToDiscountRule = rpc('appendMembersToDiscountRule');
export const applyDiscountRuleToAccessGroup = rpc('applyDiscountRuleToAccessGroup');
export const getAppPlanIds = rpc('getAppPlanIds');
export const sendWholesaleApprovalEmail = rpc('sendWholesaleApprovalEmail');
export const sendWholesaleRejectionEmail = rpc('sendWholesaleRejectionEmail');
export const verifySiteId = rpc('verifySiteId');
export const sendNewApplicationNotificationToOwner = rpc('sendNewApplicationNotificationToOwner');
export const getAllStoreCategories = rpc('getAllStoreCategories');
export const ExtendedFields = rpc('ExtendedFields');
export const hasInstallGuideBeenSent = rpc('hasInstallGuideBeenSent');
export const markInstallGuideSent = rpc('markInstallGuideSent');
export const sendInstallGuideEmail = rpc('sendInstallGuideEmail');
