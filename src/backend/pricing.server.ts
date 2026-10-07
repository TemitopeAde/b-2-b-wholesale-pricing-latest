// Web methods are not supported by the Astro runtime. Each exported method is a plain
// async function here, exposed over HTTP by its route in src/pages/api/.
const Permissions = { Anyone: 'Anyone', Admin: 'Admin', SiteMember: 'SiteMember' } as const;
const webMethod = <F extends (...args: any[]) => any>(_permission: string, fn: F): F => fn;
import { extendedFields } from '@wix/crm';
import { auth, monitoring } from '@wix/essentials';
import { contacts, } from '@wix/crm';
import { members } from '@wix/members';
import { collections, products, productsV3 } from '@wix/stores';
import { catalogVersioning } from '@wix/stores';
import { categories } from '@wix/categories';
import { appInstances } from "@wix/app-management";
import { billing } from "@wix/app-management";
import { discountRules } from '@wix/ecom';
import { items } from '@wix/data';
import { customFields } from '@wix/members';
import {
  type CreateUnifiedRuleInput,
  type CreateRuleResponse,
  type UpdateRuleResponse,
  type DeleteRuleResponse,
  type RuleFilters,
  type UpdateRuleInput,
  type ProductWholesalePriceResponse,
} from './types';
import { appPlans } from '@wix/app-management';

export const dev_mode = true;

const UPDATED_RULES_COLLECTION = '@wd-strategies/wholesale-appllication/UpdatedRules';

const MEMBER_BATCH_SIZE = 100;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// --- UpdatedRules mirror helpers ---

async function mirrorRuleSave(rule: any): Promise<void> {
  const ruleId = rule?._id;
  if (!ruleId) return;
  try {
    await items.save(UPDATED_RULES_COLLECTION, { _id: ruleId, ...rule });
  } catch (err) {
  }
}

async function mirrorRuleReplace(oldRuleId: string, newRule: any): Promise<void> {
  try {
    await items.remove(UPDATED_RULES_COLLECTION, oldRuleId);
  } catch (_) {}
  await mirrorRuleSave(newRule);
}

async function mirrorRuleDelete(ruleId: string): Promise<void> {
  try {
    await items.remove(UPDATED_RULES_COLLECTION, ruleId);
  } catch (err) {
  }
}

// -----------------------------------

const elevatedListMembers = auth.elevate(members.listMembers);
const elevatedQueryExtendedFields = auth.elevate(
  extendedFields.queryExtendedFields,
);
const elevatedGetContact = auth.elevate(contacts.getContact);
const elevatedUpdateContact = auth.elevate(contacts.updateContact);
const elevatedFindOrCreateExtendedField = auth.elevate(extendedFields.findOrCreateExtendedField);
const elevatedGetMember = auth.elevate(members.getMember);
const elevatedGetCurrentMember = auth.elevate(members.getCurrentMember);
const elevatedQueryMembers = auth.elevate(members.queryMembers);
const elevatedQueryItems = auth.elevate(items.query);
const elevatedGetDataItem = auth.elevate(items.get);


const CONFIGURATION_COLLECTION = '@wd-strategies/wholesale-appllication/Configuration';
const PROTON_EMAIL_ENDPOINT = 'https://www.wixcustomsolutions.com/_functions/proton';
const INSTALL_GUIDE_EMAIL_SUBJECT = 'Welcome to Wholesale Pricing — Setup Guide';

const DEFAULT_NOTIFICATION_SETTINGS = {
  newQuoteRequests: true,
  customerRegistrations: true,
  approvalEmails: true,
  rejectionEmails: true,
  largeOrders: true,
  dailySummary: false,
  lowStockAlerts: true,
  priceChangeUpdates: false,
  weeklyReports: false,
  systemUpdates: true
};

type InstallGuideTracking = {
  sentInstanceIds?: string[];
  updatedDate?: Date | string;
};

const getInstallGuideEmailHTML = (): string => {
  const guideUrl = 'https://35df0f92-64f5-4260-b003-37c573f99716.usrfiles.com/ugd/35df0f_559add1403a34aa0b30f975142843015.pdf';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background-color: #ffffff; color: #1f2937; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #0f62fe 0%, #8b5cf6 100%); color: #ffffff; padding: 24px; border-radius: 14px; text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0 0 10px 0; font-size: 28px;">Welcome to Wholesale Pricing</h1>
        <p style="margin: 0; font-size: 16px; opacity: 0.95;">Here’s your setup guide to get wholesale pricing live on your Wix site.</p>
      </div>

      <p style="margin: 0 0 16px 0;">Thanks for installing the app. This guide walks you through the wholesale workflow from customer applications to storefront pricing.</p>

      <div style="background-color: #eef4ff; border-left: 4px solid #0f62fe; border-radius: 10px; padding: 16px 18px; margin-bottom: 22px;">
        <strong>Important:</strong> storefront pricing now appears on native Wix product and category pages through the app’s site plugins, not through app widgets.
      </div>

      <h2 style="font-size: 20px; margin: 0 0 10px 0; color: #0f172a;">What this app helps you do</h2>
      <ul style="margin: 0 0 18px 20px; padding: 0;">
        <li style="margin-bottom: 8px;">Collect wholesale applications</li>
        <li style="margin-bottom: 8px;">Approve and manage wholesale customers</li>
        <li style="margin-bottom: 8px;">Create access groups</li>
        <li style="margin-bottom: 8px;">Set pricing rules by customer or product scope</li>
        <li style="margin-bottom: 8px;">Show wholesale prices on native Wix store pages</li>
      </ul>

      <h2 style="font-size: 20px; margin: 0 0 10px 0; color: #0f172a;">Quick setup checklist</h2>
      <ol style="margin: 0 0 18px 20px; padding: 0;">
        <li style="margin-bottom: 8px;">Review your notification settings</li>
        <li style="margin-bottom: 8px;">Add the wholesale application form if you want customers to apply on-site</li>
        <li style="margin-bottom: 8px;">Create your access groups</li>
        <li style="margin-bottom: 8px;">Approve or add wholesale customers</li>
        <li style="margin-bottom: 8px;">Create pricing rules</li>
        <li style="margin-bottom: 8px;">Confirm the site plugins are present on product and listing pages</li>
        <li style="margin-bottom: 8px;">Test the site as an eligible wholesale member</li>
      </ol>

      <h2 style="font-size: 20px; margin: 0 0 10px 0; color: #0f172a;">Storefront pricing note</h2>
      <p style="margin: 0 0 10px 0;">If the app’s site plugin is not added automatically, you’ll need to add it manually to the relevant product or category page.</p>
      <p style="margin: 0 0 22px 0;">You may also want to hide or visually replace the native retail price where it makes sense.</p>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${guideUrl}" style="display: inline-block; background-color: #0f62fe; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700;">Open the full guide</a>
      </div>

      <p style="margin: 0; color: #6b7280; font-size: 13px;">Need the full version? Use the button above to open the complete setup guide.</p>
    </div>
  `;
};

async function getInstallGuideTrackingRecord(): Promise<any | null> {
  const results = await items.query(CONFIGURATION_COLLECTION)
    .eq('configType', 'install-guide-tracking')
    .limit(1)
    .find();

  return results.items.length > 0 ? results.items[0] : null;
}

export async function hasInstallGuideBeenSent(instanceId: string): Promise<boolean> {
  if (!instanceId) {
    return false;
  }

  try {
    const trackingRecord = await getInstallGuideTrackingRecord();
    const sentInstanceIds = (trackingRecord?.sentInstanceIds || []) as string[];
    return sentInstanceIds.includes(instanceId);
  } catch (error) {
    return false;
  }
}

export async function markInstallGuideSent(instanceId: string): Promise<void> {
  if (!instanceId) {
    return;
  }

  const trackingRecord = await getInstallGuideTrackingRecord();
  const sentInstanceIds = Array.isArray(trackingRecord?.sentInstanceIds)
    ? trackingRecord.sentInstanceIds
    : [];

  if (sentInstanceIds.includes(instanceId)) {
    return;
  }

  const updatedRecord: InstallGuideTracking & { _id?: string; configType: string } = {
    _id: trackingRecord?._id,
    configType: 'install-guide-tracking',
    sentInstanceIds: [...sentInstanceIds, instanceId],
    updatedDate: new Date(),
  };

  await items.save(CONFIGURATION_COLLECTION, updatedRecord, {
    suppressHooks: false,
  });
}

export async function sendInstallGuideEmail(recipientEmail: string) {
  const htmlContent = getInstallGuideEmailHTML();

  try {

    const response = await fetch(PROTON_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: recipientEmail,
        subject: INSTALL_GUIDE_EMAIL_SUBJECT,
        data: {
          emailTemplate: htmlContent,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      recipientEmail,
      subject: INSTALL_GUIDE_EMAIL_SUBJECT,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      recipientEmail,
      subject: INSTALL_GUIDE_EMAIL_SUBJECT,
      error: error?.message || 'Unknown error',
    };
  }
}


async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientSystemError(error: unknown): boolean {
  const message = String(error || '').toLowerCase();
  return (
    message.includes('system error') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('timeout') ||
    message.includes('temporar') ||
    message.includes('econnreset') ||
    message.includes('503') ||
    message.includes('429')
  );
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isTransientSystemError(error);
      if (!retryable || attempt === attempts) {
        throw error;
      }
      await sleep(150 * attempt);
    }
  }
  throw lastError;
}

async function fetchProductById(id: string) {
  const elevatedGetProductV1 = auth.elevate(products.getProduct);
  const elevatedGetProductV3 = auth.elevate(productsV3.getProduct);

  return withRetry(`fetchProductById:${id}`, async () => {
    // 1. Try V1 API
    try {
      const response = await elevatedGetProductV1(id);
      if (response && response.product) {
        return response.product;
      }
    } catch (_) {
      // V1 failed — continue to V3
    }

    // 2. Try V3 API
    const product = await elevatedGetProductV3(id);
    if (product) return product;
    throw new Error(`Product not found in V1 or V3 | productId=${id}`);
  });
}

export const getProductById = webMethod(
  Permissions.Anyone,
  async (id: string) => fetchProductById(id)
);

type UpdatedRuleRecord = {
  _id?: string;
  name?: string;
  active?: boolean;
  activeTimeInfo?: {
    start?: string | Date;
    end?: string | Date;
  };
  discounts?: {
    values?: Array<{
      discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FIXED_PRICE';
      percentage?: number;
      fixedAmount?: string;
      fixedPrice?: string;
      specificItemsInfo?: {
        scopes?: Array<{
          type?: string;
          catalogItemFilter?: {
            catalogItemIds?: string[];
          };
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
    triggerType?: string;
    customerEligibility?: {
      individualMembersInfo?: {
        memberIds?: string[];
      };
    };
    itemQuantityRange?: {
      from?: number;
    };
    subtotalRange?: {
      from?: string;
    };
    and?: {
      triggers?: Array<any>;
    };
  };
};

function isRuleActiveNow(rule: UpdatedRuleRecord): boolean {
  if (rule.active === false) return false;

  const start = rule.activeTimeInfo?.start ? new Date(rule.activeTimeInfo.start) : null;
  const end = rule.activeTimeInfo?.end ? new Date(rule.activeTimeInfo.end) : null;
  const now = new Date();

  if (start && !Number.isNaN(start.getTime()) && start > now) return false;
  if (end && !Number.isNaN(end.getTime()) && end < now) return false;

  return true;
}

function flattenTriggers(trigger: any): any[] {
  if (!trigger) return [];
  if (trigger.triggerType === 'AND' && Array.isArray(trigger.and?.triggers)) {
    return trigger.and.triggers.flatMap((nested: any) => flattenTriggers(nested));
  }
  return [trigger];
}

function extractEligibleMemberIds(rule: UpdatedRuleRecord): string[] {
  return flattenTriggers(rule.trigger)
    .filter((trigger) => trigger?.triggerType === 'CUSTOMER_ELIGIBILITY')
    .flatMap((trigger) => trigger?.customerEligibility?.individualMembersInfo?.memberIds || []);
}

function extractThresholds(rule: UpdatedRuleRecord): ProductWholesalePriceResponse['thresholds'] {
  const triggers = flattenTriggers(rule.trigger);
  const quantityTrigger = triggers.find((trigger) => trigger?.triggerType === 'ITEM_QUANTITY_RANGE');
  const subtotalTrigger = triggers.find((trigger) => trigger?.triggerType === 'SUBTOTAL_RANGE');

  return {
    minQuantity: quantityTrigger?.itemQuantityRange?.from,
    minSubtotal: subtotalTrigger?.subtotalRange?.from
      ? parseFloat(subtotalTrigger.subtotalRange.from)
      : undefined,
  };
}

function getRuleScopeDetails(rule: UpdatedRuleRecord) {
  const scopes = rule.discounts?.values?.[0]?.specificItemsInfo?.scopes || [];
  const productIds = scopes
    .filter((scope) => scope?.type === 'CATALOG_ITEM')
    .flatMap((scope) => scope?.catalogItemFilter?.catalogItemIds || []);
  const categoryIds = scopes
    .filter((scope) => scope?.type === 'CUSTOM_FILTER')
    .flatMap((scope) => scope?.customFilter?.params?.collectionIds || []);

  let scopeType: 'product' | 'category' | 'global' = 'global';
  const hasGlobalCatalogScope = scopes.some(
    (scope) =>
      scope?.type === 'CATALOG_ITEM' &&
      Array.isArray(scope?.catalogItemFilter?.catalogItemIds) &&
      scope.catalogItemFilter.catalogItemIds.length === 0
  );

  if (productIds.length > 0) {
    scopeType = 'product';
  } else if (categoryIds.length > 0) {
    scopeType = 'category';
  } else if (hasGlobalCatalogScope) {
    scopeType = 'global';
  }

  return { scopeType, productIds, categoryIds };
}

function calculateWholesalePrice(basePrice: number, rule: UpdatedRuleRecord): { price?: number; type?: ProductWholesalePriceResponse['discountType']; value?: number } {
  const discount = rule.discounts?.values?.[0];
  if (!discount?.discountType) {
    return {};
  }

  if (discount.discountType === 'PERCENTAGE') {
    const percentage = Number(discount.percentage || 0);
    return {
      price: Math.max(0, basePrice - (basePrice * percentage) / 100),
      type: 'PERCENTAGE',
      value: percentage,
    };
  }

  if (discount.discountType === 'FIXED_AMOUNT') {
    const fixedAmount = Number(discount.fixedAmount || 0);
    return {
      price: Math.max(0, basePrice - fixedAmount),
      type: 'FIXED_AMOUNT',
      value: fixedAmount,
    };
  }

  if (discount.discountType === 'FIXED_PRICE') {
    const fixedPrice = Number(discount.fixedPrice || 0);
    return {
      price: Math.max(0, fixedPrice),
      type: 'FIXED_PRICE',
      value: fixedPrice,
    };
  }

  return {};
}

async function getAllUpdatedRules(): Promise<UpdatedRuleRecord[]> {
  const PAGE_SIZE = 100;
  let result: any = await elevatedQueryItems(UPDATED_RULES_COLLECTION).limit(PAGE_SIZE).find();
  const allItems: UpdatedRuleRecord[] = [...(result.items || [])];

  while (result.hasNext && result.hasNext()) {
    result = await result.next();
    allItems.push(...(result.items || []));
  }

  if (allItems.length === 0) {
  }

  return allItems;
}

type CurrencyResolutionDetails = {
  productCurrencyCandidates: Record<string, unknown>;
  productCurrency: string | null;
  siteCurrency: string | null;
  resolvedCurrency: string;
  fallbackSource: 'product' | 'site' | 'default';
};

function tryNormalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

async function resolveCurrencyDetails(
  product: any,
  siteCurrencyOverride?: string | null
): Promise<CurrencyResolutionDetails> {
  const productCurrencyCandidates: Record<string, unknown> = {
    priceDataCurrency: product?.priceData?.currency,
    priceDataCurrencyCode: product?.priceData?.currencyCode,
    priceCurrency: product?.price?.currency,
    priceCurrencyCode: product?.price?.currencyCode,
    currency: product?.currency,
    currencyCode: product?.currencyCode,
    convertedPriceDataCurrency: product?.convertedPriceData?.currency,
    convertedPriceDataCurrencyCode: product?.convertedPriceData?.currencyCode,
  };

  const productCurrency =
    tryNormalizeCurrencyCode(productCurrencyCandidates.priceDataCurrency) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.priceDataCurrencyCode) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.priceCurrency) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.priceCurrencyCode) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.currency) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.currencyCode) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.convertedPriceDataCurrency) ||
    tryNormalizeCurrencyCode(productCurrencyCandidates.convertedPriceDataCurrencyCode);

  const siteCurrency = normalizeCurrencyCode(siteCurrencyOverride);
  const resolvedCurrency = siteCurrency;
  const fallbackSource: CurrencyResolutionDetails['fallbackSource'] = 'site';

  return {
    productCurrencyCandidates,
    productCurrency,
    siteCurrency,
    resolvedCurrency,
    fallbackSource,
  };
}

type WholesalePriceResolveContext = {
  memberId?: string;
  /** When true, skip session lookup and use memberId as-is */
  trustMemberId?: boolean;
  /** When true, skip re-checking contact customer=wholesale (batch already verified) */
  isApproved?: boolean;
  rules?: UpdatedRuleRecord[];
  product?: any;
  siteCurrency?: string | null;
};

function coercePriceNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object') {
    const asAny = value as Record<string, unknown>;
    return (
      coercePriceNumber(asAny.amount) ||
      coercePriceNumber(asAny.value) ||
      coercePriceNumber(asAny.price) ||
      coercePriceNumber(asAny.minValue) ||
      coercePriceNumber(asAny.min)
    );
  }

  return 0;
}

function extractProductBasePrice(product: any): number {
  const candidates: unknown[] = [
    product?.priceData?.price,
    product?.priceData?.discountedPrice,
    product?.convertedPriceData?.price,
    product?.convertedPriceData?.discountedPrice,
    product?.price?.price,
    product?.price?.discountedPrice,
    product?.price?.value,
    product?.price?.amount,
    product?.price?.actualPrice?.amount,
    product?.price?.actualPrice,
    typeof product?.price === 'number' || typeof product?.price === 'string' ? product?.price : null,
    product?.actualPriceRange?.minValue?.amount,
    product?.actualPriceRange?.minValue,
    product?.actualPriceRange?.min?.amount,
    product?.actualPriceRange?.min,
    product?.priceRange?.minValue?.amount,
    product?.priceRange?.minValue,
    product?.variantsInfo?.variants?.[0]?.price?.actualPrice?.amount,
    product?.variantsInfo?.variants?.[0]?.price?.actualPrice,
    product?.variantsInfo?.variants?.[0]?.price?.compareAtPrice?.amount,
    product?.variants?.[0]?.variant?.priceData?.price,
    product?.variants?.[0]?.variant?.priceData?.discountedPrice,
    product?.variants?.[0]?.price?.actualPrice?.amount,
    product?.variants?.[0]?.priceData?.price,
  ];

  for (const candidate of candidates) {
    const price = coercePriceNumber(candidate);
    if (price > 0) {
      return price;
    }
  }

  return 0;
}

function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (error) {
    throw new Error(`Unable to format amount with currency ${currency}.`);
  }
}

function normalizeCurrencyCode(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('A valid Wix site currency code is required.');
  }

  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('A valid three-letter currency code is required.');
  }

  return currency;
}

function extractMemberIdFromCurrentMember(currentMember: unknown): string | undefined {
  return (
    (currentMember as any)?.member?.id ||
    (currentMember as any)?.member?._id ||
    (currentMember as any)?.id ||
    (currentMember as any)?._id ||
    (currentMember as any)?.member?.contactId ||
    undefined
  );
}

async function getCustomerExtendedFieldKey(): Promise<string | null> {
  try {
    return await getCustomerFieldKey();
  } catch {
    return null;
  }
}

/** True when contact extended field customer === "wholesale" (dashboard approval). */
async function isContactWholesaleApproved(contactId: string): Promise<boolean> {
  try {
    const contact = await elevatedGetContact(contactId, {
      fieldsets: ['EXTENDED'],
    });
    const customerFieldKey = await getCustomerExtendedFieldKey();
    if (!customerFieldKey) {
      return false;
    }

    const rawContact = contact as any;
    const contactData = rawContact?.contact || rawContact;
    const extendedFieldItems =
      contactData?.info?.extendedFields?.items ||
      contactData?.extendedFields?.items ||
      rawContact?.extendedFields?.items ||
      {};
    const status = extendedFieldItems[customerFieldKey];
    const approved = status === 'wholesale';

    return approved;
  } catch (error) {
    return false;
  }
}

/** True when the site member's linked contact is an approved wholesale customer. */
async function isMemberWholesaleApproved(memberId: string): Promise<boolean> {
  try {
    const member = await elevatedGetMember(memberId, { fieldsets: ['FULL'] } as any);
    const contactId =
      (member as any)?.contactId ||
      (member as any)?.member?.contactId ||
      (member as any)?.contact?.contactId ||
      (member as any)?.contact?._id;

    if (!contactId) {
      return false;
    }

    const approved = await isContactWholesaleApproved(String(contactId));
    return approved;
  } catch (error) {
    return false;
  }
}

async function resolveCurrentMemberId(memberIdOverride?: string): Promise<{
  memberId?: string;
  source: 'session' | 'override' | 'none';
}> {
  const currentMember = await members.getCurrentMember({ fieldsets: ['FULL'] } as any).catch(() => null);
  const sessionMemberId = extractMemberIdFromCurrentMember(currentMember);

  // Prefer session identity; only fall back to client override when session is missing.
  if (sessionMemberId) {
    return { memberId: sessionMemberId, source: 'session' };
  }

  const normalizedOverride = typeof memberIdOverride === 'string' ? memberIdOverride.trim() : '';
  if (normalizedOverride) {
    return { memberId: normalizedOverride, source: 'override' };
  }

  return { memberId: undefined, source: 'none' };
}

async function resolveProductWholesalePrice(
  productId: string,
  context: WholesalePriceResolveContext = {}
): Promise<ProductWholesalePriceResponse> {
  let memberId: string | undefined = context.memberId;
  try {

    if (!context.trustMemberId || !memberId) {
      const resolvedMember = await resolveCurrentMemberId(context.memberId);
      memberId = resolvedMember.memberId;
    } else {
    }

    if (!memberId) {
      return {
        eligible: false,
        hasWholesalePrice: false,
        reason: 'no_member',
      };
    }

    const resolvedMemberId: string = memberId;

    // Always require approved wholesale status (customer=wholesale), even when trustMemberId is set.
    if (context.isApproved !== true) {
      const approved = await isMemberWholesaleApproved(resolvedMemberId);
      if (!approved) {
        return {
          eligible: false,
          hasWholesalePrice: false,
          reason: 'not_approved',
        };
      }
    }

    let product = context.product;
    let basePrice = extractProductBasePrice(product);
    let loadedFromCatalog = Boolean(context.product);

    // Catalog list payloads (especially V3) often omit variant prices — fetch full product then.
    if (!basePrice) {
      product = await fetchProductById(productId);
      basePrice = extractProductBasePrice(product);
      loadedFromCatalog = false;
    }

    const collectionIds: string[] = (product as any)?.collectionIds || (product as any)?.collections || [];

    if (!basePrice) {
      return {
        eligible: true,
        hasWholesalePrice: false,
        reason: 'missing_base_price',
      };
    }

    const allRules = context.rules || (await getAllUpdatedRules());
    if (allRules.length === 0) {
      return {
        eligible: false,
        hasWholesalePrice: false,
        reason: 'no_rules',
      };
    }

    if (!context.rules) {
      allRules.forEach((rule) => {
        const scope = getRuleScopeDetails(rule);
        const ruleMemberIds = extractEligibleMemberIds(rule);
      });
    }

    const matchingRules = allRules
      .filter(isRuleActiveNow)
      .map((rule) => ({ rule, scope: getRuleScopeDetails(rule), memberIds: extractEligibleMemberIds(rule) }))
      .filter(({ rule, memberIds }) => {
        const matchesMember = memberIds.includes(resolvedMemberId);
        return matchesMember;
      })
      .filter(({ scope }) => {
        if (scope.scopeType === 'product') {
          const matchesProduct = scope.productIds.includes(productId);
          return matchesProduct;
        }
        if (scope.scopeType === 'category') {
          const matchesCategory = scope.categoryIds.some((categoryId) => collectionIds.includes(categoryId));
          return matchesCategory;
        }
        return true;
      });

    const selectedMatch =
      matchingRules.find(({ scope }) => scope.scopeType === 'product') ||
      matchingRules.find(({ scope }) => scope.scopeType === 'category') ||
      matchingRules.find(({ scope }) => scope.scopeType === 'global');

    if (!selectedMatch) {
      return {
        eligible: false,
        hasWholesalePrice: false,
        reason: 'no_matching_rule',
      };
    }

    const priceResult = calculateWholesalePrice(basePrice, selectedMatch.rule);

    if (priceResult.price === undefined) {
      return {
        eligible: true,
        hasWholesalePrice: false,
        reason: 'no_calculable_price',
      };
    }

    const currencyDetails = await resolveCurrencyDetails(product, context.siteCurrency);
    const formattedWholesalePrice = formatCurrencyAmount(
      priceResult.price,
      currencyDetails.resolvedCurrency
    );
    const formattedRetailPrice = formatCurrencyAmount(
      basePrice,
      currencyDetails.resolvedCurrency
    );
    return {
      eligible: true,
      hasWholesalePrice: true,
      wholesalePrice: priceResult.price,
      formattedWholesalePrice,
      retailPrice: basePrice,
      formattedRetailPrice,
      ruleName: selectedMatch.rule.name,
      discountType: priceResult.type,
      discountValue: priceResult.value,
      thresholds: extractThresholds(selectedMatch.rule),
    };
  } catch (error) {
    return {
      eligible: false,
      hasWholesalePrice: false,
      reason: `error:${String(error)}`,
    };
  }
}

export const getProductWholesalePrice = webMethod(
  Permissions.Anyone,
  async (productId: string, currencyCode: string, memberIdOverride?: string): Promise<ProductWholesalePriceResponse> =>
    resolveProductWholesalePrice(productId, {
      memberId: memberIdOverride,
      siteCurrency: normalizeCurrencyCode(currencyCode),
    })
);

function extractProductSlugValue(product: any): string | undefined {
  const slugCandidates = [
    product?.slug,
    product?.seoData?.slug,
    product?.seoData?.slug?.value,
    product?.seoData?.slug?.slug,
    product?.productPageUrl,
    product?.productPageUrl?.path,
    product?.productPageUrl?.value,
    product?.link?.url,
    product?.handle,
    product?.urlPart,
  ];

  for (const candidate of slugCandidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    let trimmedCandidate = candidate.trim();
    if (!trimmedCandidate) {
      continue;
    }

    try {
      trimmedCandidate = decodeURIComponent(trimmedCandidate);
    } catch {
      // Keep the original value when a legacy product contains malformed encoding.
    }

    if (trimmedCandidate.includes('/')) {
      const sanitizedCandidate = trimmedCandidate.replace(/\/+$/, '');
      const pathSegments = sanitizedCandidate.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment) {
        return lastSegment;
      }
    }

    return trimmedCandidate;
  }

  return undefined;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return safeStringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }

  return safeStringify(error);
}

function extractProductFromSlugLookup(response: any): any | null {
  if (!response) {
    return null;
  }

  if (response.product) {
    return response.product;
  }

  if (response._id || response.id) {
    return response;
  }

  return null;
}

async function getCatalogVersionLabel(): Promise<string | null> {
  try {
    const elevatedGetCatalogVersion = auth.elevate(catalogVersioning.getCatalogVersion);
    const response = await elevatedGetCatalogVersion();
    return response?.catalogVersion || null;
  } catch (error) {
    return null;
  }
}

// Console logs from web methods don't reach Sentry, so report lookup misses
// explicitly. The message is constant so Sentry groups them into one issue.
function reportMissingSlugs(details: {
  catalogVersion: string | null;
  requestedCount: number;
  missingSlugs: string[];
  lookupErrors: Record<string, string>;
  elapsedMs: number;
}): void {
  try {
    const client = monitoring.getMonitoringClient();
    client?.captureMessage('[Wholesale] Product slug lookup returned missing slugs', {
      level: 'warning',
      tags: {
        area: 'wholesale-slug-lookup',
        catalogVersion: details.catalogVersion || 'unknown',
        allMissing: String(details.missingSlugs.length === details.requestedCount),
        hasLookupErrors: String(Object.keys(details.lookupErrors).length > 0),
      },
      contexts: {
        slugLookup: {
          catalogVersion: details.catalogVersion || 'unknown',
          requestedCount: details.requestedCount,
          missingCount: details.missingSlugs.length,
          missingSlugs: details.missingSlugs.slice(0, 50),
          lookupErrors: Object.fromEntries(Object.entries(details.lookupErrors).slice(0, 20)),
          elapsedMs: details.elapsedMs,
        },
      },
    });
  } catch {
    // Monitoring must never break pricing.
  }
}

/**
 * Resolve only the requested slugs instead of paging the entire catalog.
 * Full-catalog loads time out on large stores (~14s empty result).
 */
async function fetchProductsBySlugs(slugs: string[]): Promise<{
  slugToProduct: Map<string, any>;
  catalogVersion: string | null;
  foundCount: number;
  missingSlugs: string[];
  lookupErrors: Record<string, string>;
  elapsedMs: number;
}> {
  const startedAt = Date.now();
  const normalizedSlugs = Array.from(
    new Set(
      (Array.isArray(slugs) ? slugs : [])
        .map((slug) => String(slug || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const slugToProduct = new Map<string, any>();
  const lookupErrors: Record<string, string> = {};
  if (normalizedSlugs.length === 0) {
    return {
      slugToProduct,
      catalogVersion: null,
      foundCount: 0,
      missingSlugs: [],
      lookupErrors,
      elapsedMs: Date.now() - startedAt,
    };
  }

  const catalogVersion = await getCatalogVersionLabel();
  console.info(`[Wholesale] Product slug lookup started | catalogVersion=${catalogVersion || 'unknown'} | requestedCount=${normalizedSlugs.length} | requestedSlugs=${JSON.stringify(normalizedSlugs)}`);

  // Key by the requested slug as well as the product's own slug: the stored
  // slug can differ slightly from the URL segment the storefront sends.
  const addProduct = (product: any, requestedSlug?: string) => {
    if (!product) {
      return;
    }
    const productId = product?._id || product?.id;
    if (!productId) {
      return;
    }
    if (requestedSlug && !slugToProduct.has(requestedSlug)) {
      slugToProduct.set(requestedSlug, product);
    }
    const productSlug = extractProductSlugValue(product)?.toLowerCase();
    if (productSlug && !slugToProduct.has(productSlug)) {
      slugToProduct.set(productSlug, product);
    }
  };

  const lookupV1 = async (slugsToLookup: string[]) => {
    const elevatedQueryProducts = auth.elevate(products.queryProducts);
    for (const slug of slugsToLookup) {
      let primaryLookupError: unknown = null;
      try {
        const { items } = await (elevatedQueryProducts() as any)
          .eq('slug', slug)
          .limit(1)
          .find();
        const product = items?.[0];
        if (product) {
          addProduct(product, slug);
        }
        console.info(`[Wholesale] V1 product slug lookup result | slug=${slug} | lookupField=slug | found=${Boolean(product)} | productId=${product?._id || product?.id || 'none'} | resolvedSlug=${product ? extractProductSlugValue(product) || 'none' : 'none'} | itemCount=${items?.length || 0}`);
        if (product) {
          continue;
        }
      } catch (error) {
        primaryLookupError = error;
      }

      // Some older catalogs expose the URL path rather than a direct slug.
      try {
        const { items } = await (elevatedQueryProducts() as any)
          .eq('productPageUrl.path', slug)
          .limit(1)
          .find();
        const product = items?.[0];
        if (product) {
          addProduct(product, slug);
        } else if (primaryLookupError) {
          lookupErrors[slug] = [lookupErrors[slug], `v1: ${serializeError(primaryLookupError)}`]
            .filter(Boolean)
            .join(' | ');
        }
        console.info(`[Wholesale] V1 product slug lookup result | slug=${slug} | lookupField=productPageUrl.path | found=${Boolean(product)} | productId=${product?._id || product?.id || 'none'} | itemCount=${items?.length || 0} | primaryLookupError=${primaryLookupError ? serializeError(primaryLookupError) : 'none'}`);
      } catch (slugError) {
        lookupErrors[slug] = [lookupErrors[slug], `v1: ${serializeError(primaryLookupError)}`, `v1 fallback: ${serializeError(slugError)}`]
          .filter(Boolean)
          .join(' | ');
        console.warn(`[Wholesale] V1 product slug lookup failed | slug=${slug} | primaryLookupError=${primaryLookupError ? serializeError(primaryLookupError) : 'none'} | fallbackLookupError=${serializeError(slugError)}`);
      }
    }
  };

  try {
    // Unknown catalog version (e.g. getCatalogVersion failed) → try V3 first,
    // then fall back to V1 for anything still missing.
    if (catalogVersion === 'V3_CATALOG' || !catalogVersion) {
      const elevatedGetBySlug = auth.elevate(productsV3.getProductBySlug);
      const SLUG_BATCH = 5;

      for (let i = 0; i < normalizedSlugs.length; i += SLUG_BATCH) {
        const batch = normalizedSlugs.slice(i, i + SLUG_BATCH);
        const batchStartedAt = Date.now();
        const results = await Promise.all(
          batch.map(async (slug) => {
            try {
              const response = await elevatedGetBySlug(slug);
              const product = extractProductFromSlugLookup(response);
              return {
                slug,
                product,
                error: null as string | null,
                responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
              };
            } catch (error) {
              return {
                slug,
                product: null,
                error: serializeError(error),
                responseKeys: [],
              };
            }
          })
        );

        results.forEach(({ slug, product, error, responseKeys }) => {
          if (product) {
            addProduct(product, slug);
          } else if (error) {
            lookupErrors[slug] = `v3: ${error}`;
          }
          console.info(`[Wholesale] V3 product slug lookup result | slug=${slug} | found=${Boolean(product)} | productId=${product?._id || product?.id || 'none'} | resolvedSlug=${product ? extractProductSlugValue(product) || 'none' : 'none'} | responseKeys=${JSON.stringify(responseKeys)} | error=${error || 'none'}`);
          if (!product) {
          }
        });
      }
    }

    if (catalogVersion !== 'V3_CATALOG') {
      const remaining = normalizedSlugs.filter((slug) => !slugToProduct.has(slug));
      if (remaining.length > 0) {
        await lookupV1(remaining);
      }
    }
  } catch (error) {
    throw error;
  }

  const missingSlugs = normalizedSlugs.filter((slug) => !slugToProduct.has(slug));

  if (missingSlugs.length > 0) {
    reportMissingSlugs({
      catalogVersion,
      requestedCount: normalizedSlugs.length,
      missingSlugs,
      lookupErrors,
      elapsedMs: Date.now() - startedAt,
    });
  }

  console.info(`[Wholesale] Product slug lookup completed | catalogVersion=${catalogVersion || 'unknown'} | requestedCount=${normalizedSlugs.length} | foundCount=${normalizedSlugs.length - missingSlugs.length} | missingSlugs=${JSON.stringify(missingSlugs)} | elapsedMs=${Date.now() - startedAt}`);

  return {
    slugToProduct,
    catalogVersion,
    foundCount: normalizedSlugs.length - missingSlugs.length,
    missingSlugs,
    lookupErrors,
    elapsedMs: Date.now() - startedAt,
  };
}

export const getWholesalePricesBySlugs = webMethod(
  Permissions.Anyone,
  async (
    slugs: string[],
    currencyCode: string,
    memberIdOverride?: string
  ): Promise<Record<string, ProductWholesalePriceResponse>> => {
    const startedAt = Date.now();
    const siteCurrency = normalizeCurrencyCode(currencyCode);
    const normalizedSlugs = Array.from(
      new Set(
        (Array.isArray(slugs) ? slugs : [])
          .map((slug) => String(slug || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (normalizedSlugs.length === 0) {
      return {};
    }

    try {
      // Resolve shared batch context once to avoid parallel API storms on live.
      // Timed separately so large-catalog sites show which step fails/timeouts.
      const memberStartedAt = Date.now();
      const resolvedMember = await resolveCurrentMemberId(memberIdOverride);

      // Anonymous / unqualified visitors never get wholesale prices — skip catalog entirely.
      if (!resolvedMember.memberId) {
        const response = Object.fromEntries(
          normalizedSlugs.map((slug) => [
            slug,
            {
              eligible: false,
              hasWholesalePrice: false,
              reason: 'no_member',
            } as ProductWholesalePriceResponse,
          ])
        );
        return response;
      }

      const approvalStartedAt = Date.now();
      const isApproved = await isMemberWholesaleApproved(resolvedMember.memberId);

      if (!isApproved) {
        const response = Object.fromEntries(
          normalizedSlugs.map((slug) => [
            slug,
            {
              eligible: false,
              hasWholesalePrice: false,
              reason: 'not_approved',
            } as ProductWholesalePriceResponse,
          ])
        );
        return response;
      }

      const rulesStartedAt = Date.now();
      let allRules: UpdatedRuleRecord[] = [];
      try {
        allRules = await getAllUpdatedRules();
      } catch (error) {
        throw error;
      }

      const productsLookup = await fetchProductsBySlugs(normalizedSlugs);
      const slugToProduct = productsLookup.slugToProduct;

      console.info(`[Wholesale] Wholesale slug pricing lookup summary | catalogVersion=${productsLookup.catalogVersion || 'unknown'} | requestedCount=${normalizedSlugs.length} | foundCount=${productsLookup.foundCount} | missingSlugs=${JSON.stringify(productsLookup.missingSlugs)} | memberResolved=${Boolean(resolvedMember.memberId)} | approved=${isApproved}`);

      if (allRules.length > 0) {
        allRules.forEach((rule) => {
          const scope = getRuleScopeDetails(rule);
          const ruleMemberIds = extractEligibleMemberIds(rule);
        });
      }

      // Resolve in small batches to avoid live API rate limits when catalog omits prices.
      const BATCH_SIZE = 3;
      const responseEntries: Array<readonly [string, ProductWholesalePriceResponse]> = [];

      for (let i = 0; i < normalizedSlugs.length; i += BATCH_SIZE) {
        const slugBatch = normalizedSlugs.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const batchStartedAt = Date.now();

        const batchEntries = await Promise.all(
          slugBatch.map(async (slug) => {
            const product = slugToProduct.get(slug);
            const productId = product?._id || product?.id;

            if (!productId) {
              console.warn(`[Wholesale] Slug has no resolved product ID | slug=${slug} | catalogVersion=${productsLookup.catalogVersion || 'unknown'}`);
              return [
                slug,
                {
                  eligible: false,
                  hasWholesalePrice: false,
                  reason: 'slug_not_found',
                  catalogVersion: productsLookup.catalogVersion || 'unknown',
                  lookupError: productsLookup.lookupErrors[slug] || 'none',
                } as ProductWholesalePriceResponse,
              ] as const;
            }

            try {
              const priceStartedAt = Date.now();
              const priceResponse = await resolveProductWholesalePrice(productId, {
                memberId: resolvedMember.memberId,
                trustMemberId: true,
                isApproved: true,
                rules: allRules,
                product,
                siteCurrency,
              });
              return [
                slug,
                priceResponse || {
                  eligible: false,
                  hasWholesalePrice: false,
                  reason: 'empty_price_response',
                },
              ] as const;
            } catch (error) {
              return [
                slug,
                {
                  eligible: false,
                  hasWholesalePrice: false,
                  reason: `error:${String(error)}`,
                } as ProductWholesalePriceResponse,
              ] as const;
            }
          })
        );

        responseEntries.push(...batchEntries);
      }

      const response = Object.fromEntries(responseEntries);
      return response;
    } catch (error) {
      return {};
    }
  }
);

export const updateProductById = webMethod(
  Permissions.Anyone,
  async (id: string, updateData: { name?: string; description?: string; price?: number }) => {
    try {
      // Try V1 update
      const updatePayload: any = { product: { _id: id } };
      if (updateData.name !== undefined) updatePayload.product.name = updateData.name;
      if (updateData.description !== undefined) updatePayload.product.description = updateData.description;
      if (updateData.price !== undefined) {
        updatePayload.product.priceData = { price: updateData.price };
      }

      const response = await products.updateProduct(id, updatePayload.product);
      return { success: true, product: response.product };
    } catch (v1Error) {
      try {
        const v3Payload: any = { _id: id };
        if (updateData.name !== undefined) v3Payload.name = updateData.name;
        if (updateData.description !== undefined) v3Payload.description = updateData.description;
        if (updateData.price !== undefined) v3Payload.priceData = { price: updateData.price };

        const product = await productsV3.updateProduct(id, v3Payload);
        return { success: true, product };
      } catch (v3Error) {
        throw v3Error;
      }
    }
  }
);

export const createOrGetExtendedField = webMethod(
  Permissions.Anyone,
  async (displayName: string, dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'URL' = 'TEXT') => {
    try {

      const result = await elevatedFindOrCreateExtendedField(displayName, dataType);
      return {
        success: true,
        isNewField: result.newField,
        message: result.newField
          ? `Successfully created new extended field: ${displayName}`
          : `Extended field already exists: ${displayName}`
      };
    } catch (error: any) {

      // Handle specific error cases
      if (error.statusCode === 429 || error.errorCode === 'FIELDS_QUOTA_EXCEEDED') {
        throw new Error('Custom fields quota exceeded (max 100 fields)');
      }

      throw new Error(`Failed to create extended field: ${error.message || 'Unknown error'}`);
    }
  }
);

export const getMemberDetails = webMethod(
  Permissions.Admin,
  async (memberId) => {
    try {
      // Use the 'FULL' fieldset to retrieve all member data, including contact details
      const options = {
        fieldsets: ['FULL']
      };

      const member = await elevatedGetMember(memberId, options);

      // Custom fields are located in member.contact.customFields
      // The key for the custom field is defined in the Contacts Extended Fields API
      const customFieldValue = member.contact.customFields['customer']?.value;

      return member;
    } catch (error) {
      throw error;
    }
  }
);

export const createCustomField = webMethod(
  Permissions.Anyone,
  async () => {
    const displayName = 'customer';
    const dataType = 'TEXT';
    try {
      const field = await elevatedFindOrCreateExtendedField(displayName, dataType);
      return field;
    } catch (error) {
      throw error;
    }
  }
);

export const createMemberCustomField = webMethod(Permissions.Anyone, async () => {
  const field = {
    name: "customer",
    fieldType: "TEXT"
  };

  try {
    const newCustomField = await customFields.createCustomField(field);
    return newCustomField;
  } catch (error) {
  }
})

export const updateContact = webMethod(
  Permissions.Anyone,
  async (contactId: string, revision: number, customerType: string) => {
    try {
      const customerFieldKey = await getCustomerFieldKey();

      const info = {
        extendedFields: {
          items: {
            [customerFieldKey]: customerType
          }
        }
      };

      // updateContact takes revision as second parameter, not in options
      const updatedContact = await elevatedUpdateContact(contactId, info, revision);

      return updatedContact;

    } catch (error) {
      throw error;
    }
  }
);

export const isContactWholesale = webMethod(
  Permissions.Anyone,
  async (contactId: string) => {
    try {
      return await isContactWholesaleApproved(contactId);
    } catch (error) {
      return false;
    }
  }
);

export async function ExtendedFields() {
  try {
    const queryResults = await elevatedQueryExtendedFields().find();

    const items = queryResults.items;
    return items;
  } catch (error) {
  }
}

export const getExtendedFieldsForMember = webMethod(Permissions.Anyone, async (contactId) => {
  try {
    const contact = await elevatedGetContact(contactId, {
      fieldsets: ['EXTENDED']
    });

    // List all extended field keys
    if (contact.info?.extendedFields?.items) {
      Object.entries(contact.info.extendedFields.items).forEach(([key, value]) => {
      });
    }

    return contact.info?.extendedFields?.items;
  } catch (error) {
  }
});

const elevatedQueryContacts = auth.elevate(contacts.queryContacts);
const elevatedCreateContact = auth.elevate(contacts.createContact);

/**
 * Single source of truth for the "customer" extended field key, used by both the
 * approval write (updateContact) and every wholesale read. Not cached: when the
 * field is recreated Wix issues a new suffixed key (custom.customer-xxxx), and a
 * stale cached key made approved contacts invisible to wholesale queries.
 */
async function getCustomerFieldKey(): Promise<string> {
  const fieldsResult = await elevatedQueryExtendedFields()
    .eq("namespace", "custom")
    .find();

  // Prefer the exact field createCustomField() makes; fall back to the key pattern.
  const customerField =
    fieldsResult.items.find(field => field.displayName === 'customer') ||
    fieldsResult.items.find(field => field.key?.startsWith('custom.customer'));

  if (!customerField || !customerField.key) {
    throw new Error('Customer type field not found');
  }

  return customerField.key;
}

/**
 * Centralized helper to execute contact queries with consistent pagination,
 * plain-text search, and safety guards.
 */
async function executeContactQuery(params: {
  filter?: any;
  search?: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  fieldsets?: ('BASIC' | 'COMMUNICATION_DETAILS' | 'EXTENDED' | 'FULL')[];
}) {
  const { filter, search, limit = 50, offset = 0, sortField, sortOrder, fieldsets = ['EXTENDED'] } = params;

  // queryContacts() returns a query builder, not results. Options are spread into
  // the request payload at runtime, so fieldsets/search are passed through here.
  const options: any = { fieldsets };
  const searchStr = String(search ?? '').trim();
  if (searchStr) options.search = searchStr;

  console.log('[executeContactQuery] request', JSON.stringify({ filter, options, limit, offset, sortField, sortOrder }));

  let query: any = await elevatedQueryContacts(options);
  console.log('[executeContactQuery] builder type', typeof query, 'has find:', typeof query?.find);

  for (const [field, condition] of Object.entries(filter || {})) {
    if (condition && typeof condition === 'object' && '$in' in (condition as any)) {
      query = query.in(field, (condition as any).$in);
    } else if (condition && typeof condition === 'object' && '$eq' in (condition as any)) {
      query = query.eq(field, (condition as any).$eq);
    } else {
      query = query.eq(field, condition);
    }
  }

  if (sortField) {
    query = sortOrder === 'DESC' ? query.descending(sortField) : query.ascending(sortField);
  }

  let result: any;
  try {
    result = await query.limit(Math.min(limit, 1000)).skip(offset).find();
  } catch (error: any) {
    // SDK errors reference themselves via `runtimeError`; a plain JSON.stringify
    // throws and masks the real error.
    console.error(
      '[executeContactQuery] find() failed',
      error?.message,
      error?.details ? safeStringify(error.details) : serializeError(error)
    );
    throw error;
  }

  console.log('[executeContactQuery] response', JSON.stringify({
    itemCount: result?.items?.length ?? 0,
    totalCount: result?.totalCount,
    resultKeys: result ? Object.keys(result) : null,
  }));

  return {
    contacts: result.items || [],
    pagingMetadata: { total: result.totalCount },
  };
}

/**
 * Centralized helper to fetch ALL contacts matching a query by automatically
 * handling pagination until all results are retrieved.
 */
async function fetchAllContacts(params: {
  filter?: any;
  search?: string;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  fieldsets?: ('BASIC' | 'COMMUNICATION_DETAILS' | 'EXTENDED' | 'FULL')[];
}) {
  const PAGE_SIZE = 1000;
  let allContacts: any[] = [];
  let offset = 0;
  let total = Infinity;

  while (allContacts.length < total) {
    const result = await executeContactQuery({
      ...params,
      limit: PAGE_SIZE,
      offset,
    });

    const page = result.contacts || [];
    allContacts = allContacts.concat(page);
    total = result.pagingMetadata?.total ?? allContacts.length;
    offset += page.length;

    if (page.length < PAGE_SIZE) break;
  }

  return allContacts;
}

export const getWholesaleContacts = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const CUSTOMER_FIELD_KEY = await getCustomerFieldKey();
      const allContacts = await fetchAllContacts({ fieldsets: ['EXTENDED'] });
      const wholesaleContacts = allContacts.filter((contact: any) => {
        const normalizedContact = contact?.contact || contact;
        const fields = normalizedContact?.info?.extendedFields?.items || normalizedContact?.extendedFields?.items || {};
        return String(fields[CUSTOMER_FIELD_KEY] ?? '') === 'wholesale';
      });
      return wholesaleContacts;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to fetch wholesale contacts');
    }
  }
);

/**
 * Search wholesale contacts using the API's native plain-text search.
 * `search` is matched against: info.name.first, info.name.last,
 *   info.emails.email, info.phones.phone
 * An empty search string returns all wholesale contacts.
 */
export const searchWholesaleContacts = webMethod(
  Permissions.Anyone,
  async (search: string, sortField?: string, sortOrder?: 'ASC' | 'DESC') => {
    try {
      const CUSTOMER_FIELD_KEY = await getCustomerFieldKey();
      const allContacts = await fetchAllContacts({
        search,
        sortField,
        sortOrder,
        fieldsets: ['EXTENDED']
      });
      const wholesaleContacts = allContacts.filter((contact: any) => {
        const normalizedContact = contact?.contact || contact;
        const fields = normalizedContact?.info?.extendedFields?.items || normalizedContact?.extendedFields?.items || {};
        return String(fields[CUSTOMER_FIELD_KEY] ?? '') === 'wholesale';
      });
      return wholesaleContacts;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to search wholesale contacts');
    }
  }
);

export const getAllContacts = webMethod(
  Permissions.Anyone,
  async (
    page: number = 1,
    limit: number = 50,
    search: string = '',
    sortField?: string,
    sortOrder?: 'ASC' | 'DESC'
  ) => {
    try {
      const offset = (page - 1) * limit;

      const result = await executeContactQuery({
        search,
        limit,
        offset,
        sortField,
        sortOrder,
        fieldsets: ['FULL']
      });

      const contacts = result.contacts || [];
      const total = result.pagingMetadata?.total ?? contacts.length;

      return {
        contacts,
        totalCount: total,
        page,
        limit,
      };
    } catch (error) {
      throw error;
    }
  }
);

export const getContactsByCustomerStatus = webMethod(
  Permissions.Anyone,
  async (status: string) => {
    try {
      const CUSTOMER_FIELD_KEY = await getCustomerFieldKey();
      const filter = { [`info.extendedFields.${CUSTOMER_FIELD_KEY}`]: status };

      const allContacts = await fetchAllContacts({ filter, fieldsets: ['EXTENDED'] });
      return allContacts;
    } catch (error) {
      throw error;
    }
  }
);

const elevatedListExtendedFields = auth.elevate(extendedFields.listExtendedFields);
// export const listAllExtendedFields = webMethod(
//   Permissions.Anyone,
//   async () => {
//     try {
//       const fields = await elevatedListExtendedFields();

//       if (!fields.extendedFields || fields.extendedFields.length === 0) {
//         return fields;
//       }

//       // Log each field with all details
//       fields.extendedFields.forEach((field: any) => {
//       });

//       return fields;
//     } catch (error) {
//       throw error;
//     }
//   }
// );


export const getContact = webMethod(
  Permissions.Anyone,
  async (id: string) => {
    try {
      const contact = await elevatedGetContact(id, {
        fieldsets: ['EXTENDED'] // Include extended fields in the response
      });
      return contact;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Resolve a Wix contact from the email captured on a wholesale application.
 * Applications created before contactId was persisted only contain the email,
 * so approval must not silently stop when that legacy shape is encountered.
 */
export const findContactByEmail = webMethod(
  Permissions.Anyone,
  async (email: string) => {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      throw new Error('A valid customer email is required to find the contact.');
    }

    // Contacts may store the email with its original casing, so try both forms.
    const candidates = Array.from(new Set([normalizedEmail, email.trim()]));
    console.log('[findContactByEmail] input', JSON.stringify({ email, candidates }));

    const result = await executeContactQuery({
      filter: { 'primaryInfo.email': { '$in': candidates } },
      limit: 10,
      fieldsets: ['EXTENDED'],
    });

    const contacts = (result as any)?.contacts || [];
    console.log('[findContactByEmail] matches', JSON.stringify(
      contacts.map((c: any) => ({ id: c?._id, email: c?.primaryInfo?.email, revision: c?.revision }))
    ));

    if (!contacts.length) {
      // Diagnostic: check whether the contact exists but is not matched by the email filter.
      try {
        const probe = await executeContactQuery({ search: normalizedEmail, limit: 10, fieldsets: ['BASIC'] });
        console.log('[findContactByEmail] search probe', JSON.stringify(
          (probe.contacts || []).map((c: any) => ({
            id: c?._id,
            primaryEmail: c?.primaryInfo?.email,
            emails: c?.info?.emails?.items?.map((e: any) => e?.email),
          }))
        ));
      } catch (probeError: any) {
        console.error('[findContactByEmail] search probe failed', probeError?.message);
      }
    }

    return contacts[0] || null;
  }
);

/**
 * Resolve the contact for a wholesale application, creating one when the
 * applicant has no contact yet (e.g. they applied while logged out). When they
 * later sign up with the same email, Wix links the new member to this contact,
 * so the wholesale status set on approval carries over.
 */
export const findOrCreateContactForApplication = webMethod(
  Permissions.Anyone,
  async (application: { email: string; contactName?: string; businessName?: string; phone?: string }) => {
    const rawEmail = typeof application?.email === 'string' ? application.email.trim() : '';
    const normalizedEmail = rawEmail.toLowerCase();
    if (!normalizedEmail) {
      throw new Error('A valid customer email is required to find or create the contact.');
    }

    const candidates = Array.from(new Set([normalizedEmail, rawEmail]));
    const existing = await executeContactQuery({
      filter: { 'primaryInfo.email': { '$in': candidates } },
      limit: 1,
      fieldsets: ['EXTENDED'],
    });
    if (existing.contacts.length) {
      console.log('[findOrCreateContactForApplication] found existing contact', existing.contacts[0]?._id);
      return { contact: existing.contacts[0], created: false };
    }

    const [first, ...rest] = String(application.contactName ?? '').trim().split(/\s+/).filter(Boolean);
    const info: any = {
      name: { first: first || undefined, last: rest.join(' ') || undefined },
      emails: { items: [{ tag: 'MAIN', email: normalizedEmail }] },
    };
    if (application.businessName?.trim()) info.company = application.businessName.trim();
    if (application.phone?.trim()) info.phones = { items: [{ tag: 'MAIN', phone: application.phone.trim() }] };

    const created = await elevatedCreateContact(info, { allowDuplicates: false });
    const createdId = created?.contact?._id;
    console.log('[findOrCreateContactForApplication] created contact', createdId);
    if (!createdId) {
      throw new Error(`Could not create a Wix contact for ${normalizedEmail}.`);
    }

    // Re-read with EXTENDED fields so the caller gets the same shape as getContact().
    const contact = await elevatedGetContact(createdId, { fieldsets: ['EXTENDED'] });
    return { contact, created: true };
  }
);

export const getAllMembers = webMethod(
  Permissions.Anyone,
  async () => {
    const allMembers: any[] = [];
    const pageSize = 1000;
    let offset = 0;

    try {
      while (true) {
        const options = {
          fieldsets: ["FULL" as const],
          paging: { limit: pageSize, offset },
          sort: { order: 'DESC' }
        };

        const currentPage = await elevatedListMembers(options);

        if (currentPage.members && currentPage.members.length > 0) {
          allMembers.push(...currentPage.members);
          offset += pageSize;
        } else {
          break;
        }
      }

      return allMembers;
    } catch (error) {
      throw error;
    }
  }
);

export const getMembersByIds = webMethod(
  Permissions.Anyone,
  async (memberIds: string[], limit?: number, offset: number = 0) => {
    if (!memberIds || memberIds.length === 0) return { members: [], total: 0 };
    try {
      const options = { fieldsets: ["FULL" as const] };
      const PAGE_SIZE = 50;
      const allMembers: any[] = [];
      let currentOffset = offset;

      // If a specific limit was requested, do a single paged fetch
      if (limit !== undefined) {
        const result = await elevatedQueryMembers(
          { filter: { "_id": { "$in": memberIds } }, paging: { limit, offset } },
          options
        );
        return {
          members: result.members || [],
          total: (result as any).pagingMetadata?.total || memberIds.length
        };
      }

      // No explicit limit — paginate until all members are fetched
      while (true) {
        const result = await elevatedQueryMembers(
          { filter: { "_id": { "$in": memberIds } }, paging: { limit: PAGE_SIZE, offset: currentOffset } },
          options
        );
        const page = result.members || [];
        allMembers.push(...page);
        if (page.length < PAGE_SIZE) break;
        currentOffset += PAGE_SIZE;
      }
      return { members: allMembers, total: allMembers.length };
    } catch (error) {
      throw error;
    }
  }
);

async function loadAllProductsV1() {
  const startedAt = Date.now();
  let allProducts: any[] = [];
  let hasMore = true;
  let skip = 0;
  const limit = 100;
  let page = 0;

  while (hasMore) {
    page += 1;
    const pageStartedAt = Date.now();
    const { items, totalCount } = await products.queryProducts()
      .limit(limit)
      .skip(skip)
      .find();

    allProducts = allProducts.concat(items);
    skip += limit;
    hasMore = allProducts.length < totalCount;
  }

  return allProducts;
}

async function loadAllProductsV3() {
  const startedAt = Date.now();
  let allProducts: any[] = [];
  const limit = 100;
  let page = 1;

  let result = await productsV3.queryProducts().limit(limit).find();
  allProducts = allProducts.concat(result.items);

  while (result.hasNext()) {
    page += 1;
    const pageStartedAt = Date.now();
    result = await result.next();
    allProducts = allProducts.concat(result.items);
  }

  return allProducts;
}

async function loadAllProductsCategoryV3() {
  const response = await productsV3.getAllProductsCategory();
  return response.categoryId;
}

async function loadAllProductsCategoryV1() {
  const elevatedQueryCollections = auth.elevate(collections.queryCollections);
  const response = await elevatedQueryCollections();
  return response;
}

async function resolveCatalogLogic() {
  const startedAt = Date.now();
  try {
    const elevatedGetCatalogVersion = auth.elevate(catalogVersioning.getCatalogVersion);
    const response = await elevatedGetCatalogVersion();

    if (response.catalogVersion === "V1_CATALOG") {
      const catalogProducts = await loadAllProductsV1();
      const collections = await loadAllProductsCategoryV1();
      return {
        products: catalogProducts,
        collections,
        catalogVersion: "V1_CATALOG"
      };
    } else if (response.catalogVersion === "V3_CATALOG") {
      const catalogProducts = await loadAllProductsV3();
      const collections = await loadAllProductsCategoryV3();
      return {
        products: catalogProducts,
        collections,
        catalogVersion: "V3_CATALOG"
      };
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

export const fetchAllProductsV1 = webMethod(
  Permissions.Anyone,
  async () => loadAllProductsV1()
);

export const fetchAllProductsV3 = webMethod(
  Permissions.Anyone,
  async () => loadAllProductsV3()
);

export const getAllProductsCategoryV3 = webMethod(
  Permissions.Anyone,
  async () => loadAllProductsCategoryV3()
);

export const checkCatalogVersion = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const elevatedGetCatalogVersion = auth.elevate(catalogVersioning.getCatalogVersion);
      const response = await elevatedGetCatalogVersion();
      await resolveCatalogLogic();

      return response.catalogVersion;
    } catch (error) {
      throw error;
    }
  }
);

export const handleCatalogLogic = webMethod(
  Permissions.Anyone,
  async () => resolveCatalogLogic()
);

export const getCategoryName = webMethod(
  Permissions.Anyone,
  async (categoryId: string) => {
    const elevatedGetCategory = auth.elevate(categories.getCategory);
    const treeReference = {
      appNamespace: '@wix/stores',
      treeKey: null
    };

    try {
      const response = await elevatedGetCategory("17195c06-ba0e-4007-afc6-109c31fe11f1", treeReference);
      return response.name;
    } catch (error) {
      throw error;
    }
  }
);

export const getAllProductsCategoryV1 = webMethod(
  Permissions.Anyone,
  async () => loadAllProductsCategoryV1()
);

export const getAppInstance = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const elevatedGetAppInstance = auth.elevate(appInstances.getAppInstance);
      const response = await elevatedGetAppInstance();

      return response;
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error))
        .replace(/https?:\/\/\S+/g, '[url]');
      console.error(`[AppInstance] getAppInstance failed | message=${message}`);
      throw new Error(`Unable to load app instance: ${message}`);
    }
  }
);

export const getUpgradeUrl = webMethod(
  Permissions.Anyone,
  async (productId, selectedPlan) => {
    try {
      const elevatedGetUrl = auth.elevate(billing.getUrl);
      const response = await elevatedGetUrl(productId, {
        billingCycle: selectedPlan
      });

      return response;
    } catch (error) {
      throw error;
    }
  }
);

export const saveConfiguration = webMethod(Permissions.Anyone, async (configData) => {
  try {
    if (!configData || !configData.notificationSettings) {
      throw new Error('Invalid configuration data');
    }

    const dataToSave = {
      notificationSettings: configData.notificationSettings,
      emailTemplates: configData.emailTemplates || undefined,
      updatedDate: new Date(),
    };

    return await items.save(CONFIGURATION_COLLECTION, dataToSave, {
      suppressHooks: false
    });

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
    throw new Error('Failed to save configuration: Unknown error');
  }
});

export const getConfiguration = webMethod(Permissions.Anyone, async () => {
  try {
    const results = await items.query(CONFIGURATION_COLLECTION)
      .limit(1)
      .descending('_updatedDate')
      .find();

    return results.items.length > 0 ? results.items[0] : null;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve configuration: ${error.message}`);
    }
    throw new Error('Failed to retrieve configuration: Unknown error');
  }
});

export const resetConfigurationToDefaults = webMethod(Permissions.Anyone, async () => {
  try {


    const defaultConfig = {
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      updatedDate: new Date(),
      updatedBy: 'system-reset'
    };

    return await items.save(CONFIGURATION_COLLECTION, defaultConfig, {
      suppressHooks: false
    });

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reset configuration: ${error.message}`);
    }
    throw new Error('Failed to reset configuration: Unknown error');
  }
});

export const getNotificationSetting = webMethod(Permissions.Anyone, async (settingKey) => {
  try {
    const config = await getConfiguration();

    const settings = config?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

    return settingKey in settings ? settings[settingKey] : false;

  } catch (error) {
    return false; // Fail-safe return
  }
});

export const updateNotificationSetting = webMethod(Permissions.Anyone, async (settingKey, value) => {
  try {
    let config = await getConfiguration();

    const updatedConfig: any = {
      notificationSettings: config?.notificationSettings || { ...DEFAULT_NOTIFICATION_SETTINGS },
      updatedDate: new Date(),
      updatedBy: 'system'
    };

    updatedConfig.notificationSettings[settingKey] = value;

    if (config && config._id) {
      updatedConfig._id = config._id;
    }

    return await items.save(CONFIGURATION_COLLECTION, updatedConfig, {
      suppressHooks: false
    });

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
    throw new Error('Failed to save configuration: Unknown error');
  }
});

export const getCurrentMember = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const member = await members.getCurrentMember({ fieldsets: ['FULL'] });
      return member;
    } catch (error) {
      // Handle the error
    }
  }
)

// Add or update members to an existing discount rule
export const addMembersToDiscountRule = webMethod(
  Permissions.Anyone,
  async (ruleId: string, memberIds: string[]) => {
    try {
      // 1. Get the current rule to retrieve the latest revision
      const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);
      const currentRule = await elevatedGetDiscountRule(ruleId);

      // 2. Update the rule with the new member IDs
      const updateData: any = {
        revision: currentRule.revision,
        trigger: {
          triggerType: 'CUSTOMER_ELIGIBILITY' as any,
          customerEligibility: {
            eligibilityType: 'INDIVIDUAL_MEMBERS',
            individualMembersInfo: {
              memberIds: memberIds // Array of member GUIDs
            }
          }
        }
      };

      const result = await discountRules.updateDiscountRule(ruleId, updateData);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      throw new Error(`Failed to add members to discount rule: ${(error as Error).message}`);
    }
  }
);

/**
 * Helper function to handle customer eligibility for discount rules.
 */
async function handleDiscountMemberEligibility(ruleId: string, memberIds: string[], isNew: boolean) {
  try {
    const elevatedUpdateDiscountRule = auth.elevate(discountRules.updateDiscountRule);
    const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);

    // If it's a new rule or we need the current revision, fetch it first
    // Note: Wix DiscountRules API requires the correct revision for updates
    const currentRule = await elevatedGetDiscountRule(ruleId);

    const updateData: any = {
      revision: currentRule.revision,
      trigger: {
        triggerType: 'CUSTOMER_ELIGIBILITY' as any,
        customerEligibility: {
          eligibilityType: 'INDIVIDUAL_MEMBERS',
          individualMembersInfo: {
            memberIds: memberIds
          }
        }
      }
    };
    return await elevatedUpdateDiscountRule(ruleId, updateData);
  } catch (error: any) {
    throw new Error(`Failed to update member eligibility: ${error.message}`);
  }
}

export const createUnifiedRule = webMethod(
  Permissions.Admin,
  async (ruleData: CreateUnifiedRuleInput): Promise<CreateRuleResponse> => {
    try {
      const {
        name,
        type = 'global',
        discountType = 'percentage',
        discountValue: ruleDiscountValue,
        percentage: rulePercentage,
        fixedAmount,
        fixedPrice,
        categoryIds,
        productIds,
        catalogAppId: ruleCatalogAppId,
        triggerId,
        triggerAppId,
        memberIds,
        isActive = true,
        startDate,
        endDate
      } = ruleData;

      const catalogAppId = ruleCatalogAppId || "215238eb-22a5-4c36-9e7b-e7c08025e04e";
      const percentage = rulePercentage !== undefined ? rulePercentage : ruleDiscountValue;
      const response = await getAppInstance();

      if (!dev_mode && response?.instance?.isFree) {
        const { _items } = await queryAllRules();
        if (_items && _items.length >= 1) {
          throw new Error('Please upgrade your plan first.');
        }
      }

      if (!name) {
        throw new Error('Name is required');
      }

      if (discountType === 'percentage' && (!percentage || percentage < 0.1 || percentage > 100)) {
        throw new Error('Percentage must be between 0.1 and 100');
      }
      if (discountType === 'fixed_amount' && (!fixedAmount || parseFloat(fixedAmount) <= 0)) {
        throw new Error('Fixed amount must be greater than 0');
      }
      if (discountType === 'fixed_price' && (!fixedPrice || parseFloat(fixedPrice) <= 0)) {
        throw new Error('Fixed price must be greater than 0');
      }

      if (type === 'category' && (!categoryIds || categoryIds.length === 0)) {
        throw new Error('Category IDs are required for category rules');
      }
      if (type === 'product' && (!productIds || productIds.length === 0)) {
        throw new Error('Product IDs are required for product rules');
      }
      if (type === 'global' && !catalogAppId) {
        throw new Error('catalogAppId is required for global rules');
      }

      const discountValue: any = {
        discountType: 'PERCENTAGE'
      };

      if (discountType === 'percentage') {
        discountValue.discountType = 'PERCENTAGE';
        discountValue.percentage = Math.max(0.1, percentage || 0.1);
      } else if (discountType === 'fixed_amount') {
        discountValue.discountType = 'FIXED_AMOUNT';
        discountValue.fixedAmount = fixedAmount!;
      } else if (discountType === 'fixed_price') {
        discountValue.discountType = 'FIXED_PRICE';
        discountValue.fixedPrice = fixedPrice!;
      } else {
        discountValue.discountType = 'PERCENTAGE';
        discountValue.percentage = 0.1;
      }

      if (type === 'category') {
        discountValue.targetType = 'SPECIFIC_ITEMS';
        discountValue.specificItemsInfo = {
          scopes: [{
            id: `collections_${catalogAppId}`,
            type: 'CUSTOM_FILTER',
            customFilter: {
              appId: catalogAppId || "215238eb-22a5-4c36-9e7b-e7c08025e04e",
              params: { collectionIds: categoryIds }
            }
          }]
        };
      } else if (type === 'product') {
        discountValue.targetType = 'SPECIFIC_ITEMS';
        discountValue.specificItemsInfo = {
          scopes: productIds!.map(productId => ({
            id: `specific_${productId}`,
            type: 'CATALOG_ITEM',
            catalogItemFilter: {
              catalogAppId: catalogAppId!,
              catalogItemIds: [productId]
            }
          }))
        };
      } else if (type === 'global') {
        discountValue.targetType = 'SPECIFIC_ITEMS';
        discountValue.specificItemsInfo = {
          scopes: [
            {
              _id: `all_${catalogAppId}`,
              type: 'CATALOG_ITEM',
              catalogItemFilter: {
                catalogAppId: catalogAppId!,
                catalogItemIds: []
              }
            }
          ]
        };
      }


      const discountRule: any = {
        name: name!,
        active: isActive,
        discounts: {
          values: [discountValue]
        }
      };

      // Handle date fields - this is the key addition!
      if (startDate || endDate) {
        discountRule.activeTimeInfo = {};

        if (startDate) {
          // Convert string to Date if needed
          const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
          discountRule.activeTimeInfo.start = startDateObj;
        }

        if (endDate) {
          // Convert string to Date if needed
          const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
          discountRule.activeTimeInfo.end = endDateObj;
        }
      }

      const isValidGuid = (guid: string) => {
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return guidRegex.test(guid);
      };

      // Build an array of individual triggers, then combine with AND if needed
      const triggers: any[] = [];

      // Define trigger scopes based on rule type
      const triggerScopes: any[] = [];
      if (type === 'category' && categoryIds && categoryIds.length > 0) {
        triggerScopes.push({
          id: `collections_${catalogAppId}`,
          type: 'CUSTOM_FILTER',
          customFilter: {
            appId: catalogAppId || "215238eb-22a5-4c36-9e7b-e7c08025e04e",
            params: { collectionIds: categoryIds }
          }
        });
      } else if (type === 'product' && productIds) {
        triggerScopes.push(...productIds.map(id => ({
          id: `specific_${id}`,
          type: 'CATALOG_ITEM',
          catalogItemFilter: { catalogAppId, catalogItemIds: [id] }
        })));
      } else {
        // Global scope
        triggerScopes.push({
          id: `all_${catalogAppId}`,
          type: 'CATALOG_ITEM',
          catalogItemFilter: { catalogAppId, catalogItemIds: [] }
        });
      }

      if (memberIds && memberIds.length > 0) {
        triggers.push({
          triggerType: 'CUSTOMER_ELIGIBILITY',
          customerEligibility: {
            eligibilityType: 'INDIVIDUAL_MEMBERS',
            individualMembersInfo: { memberIds }
          }
        });
      }

      const minQty = ruleData.minimumQuantity || ruleData.minQuantity;
      const maxQty = ruleData.maximumQuantity || ruleData.maxQuantity;
      if (minQty || maxQty) {
        triggers.push({
          triggerType: 'ITEM_QUANTITY_RANGE',
          itemQuantityRange: {
            from: minQty || undefined,
            to: maxQty || undefined,
            scopes: triggerScopes
          }
        });
      }

      if (ruleData.minimumOrder || ruleData.maximumOrder) {
        triggers.push({
          triggerType: 'SUBTOTAL_RANGE',
          subtotalRange: {
            from: ruleData.minimumOrder ? ruleData.minimumOrder.toString() : undefined,
            to: ruleData.maximumOrder ? ruleData.maximumOrder.toString() : undefined,
            scopes: triggerScopes
          }
        });
      }

      if (triggers.length === 0 && triggerId && triggerAppId) {
        if (!isValidGuid(triggerAppId)) {
          throw new Error(`triggerAppId must be a valid GUID format (e.g., "12345678-1234-1234-1234-123456789abc"), received: ${triggerAppId}`);
        }
        discountRule.trigger = {
          triggerType: 'CUSTOM',
          customTrigger: { _id: triggerId, appId: triggerAppId }
        };
      } else if (triggers.length === 1) {
        discountRule.trigger = triggers[0];
      } else if (triggers.length > 1) {
        discountRule.trigger = {
          triggerType: 'AND',
          and: { triggers }
        };
      }

      try {
        const elevatedCreateRule = auth.elevate(discountRules.createDiscountRule);

        if (memberIds && memberIds.length > MEMBER_BATCH_SIZE) {
          const chunks = chunkArray(memberIds, MEMBER_BATCH_SIZE);
          const otherTriggers = triggers.filter(t => t.triggerType !== 'CUSTOMER_ELIGIBILITY');
          let firstCreatedRule: any = null;

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const batchRule = { ...discountRule };
            const memberTrigger = {
              triggerType: 'CUSTOMER_ELIGIBILITY',
              customerEligibility: {
                eligibilityType: 'INDIVIDUAL_MEMBERS',
                individualMembersInfo: { memberIds: chunk }
              }
            };

            if (otherTriggers.length === 0) {
              batchRule.trigger = memberTrigger;
            } else {
              batchRule.trigger = {
                triggerType: 'AND',
                and: { triggers: [memberTrigger, ...otherTriggers] }
              };
            }

            const result = await elevatedCreateRule(batchRule);
            const createdRule = (result as any).discountRule || result;
            await mirrorRuleSave(createdRule);
            if (!firstCreatedRule) firstCreatedRule = createdRule;
          }
          return { success: true, data: firstCreatedRule } as CreateRuleResponse;
        }

        const result = await elevatedCreateRule(discountRule);

        const createdRule = (result as any).discountRule || result;

        await mirrorRuleSave(createdRule);

        return {
          success: true,
          data: createdRule
        } as CreateRuleResponse;
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to create rule: ${(error as Error).message}`);
    }
  }
);

/**
 * Creates multiple discount rules from a bulk CSV mapping.
 * Since Wix enforces 1 discount value (1 price) per rule, this iterates
 * through the CSV payload and generates distinct rules.
 */
export const createBulkCsvRules = webMethod(
  Permissions.Admin,
  async (ruleData: CreateUnifiedRuleInput): Promise<{ success: boolean; createdCount: number }> => {
    try {
      const {
        name,
        catalogAppId,
        memberIds,
        triggerId,
        triggerAppId,
        minimumQuantity,
        maximumQuantity,
        minimumOrder,
        maximumOrder,
        isActive = true,
        startDate,
        endDate,
        bulkCsvItems
      } = ruleData;

      const response = await getAppInstance();
      if (!dev_mode && response?.instance?.isFree) {
        throw new Error('Please upgrade your plan to use bulk creation.');
      }

      if (!bulkCsvItems || bulkCsvItems.length === 0) {
        throw new Error('No items provided for bulk creation');
      }

      const elevatedCreateRule = auth.elevate(discountRules.createDiscountRule);
      let createdCount = 0;

      for (const item of bulkCsvItems) {

        const discountValue: any = {
          discountType: 'FIXED_PRICE',
          fixedPrice: item.price.toString(),
          targetType: 'SPECIFIC_ITEMS',
          specificItemsInfo: {
            scopes: [
              {
                _id: `bulk_${item.productId}`,
                type: 'CATALOG_ITEM',
                catalogItemFilter: {
                  catalogAppId: catalogAppId || '215238eb-22a5-4c36-9e7b-e7c08025e04e',
                  catalogItemIds: [item.productId]
                }
              }
            ]
          }
        };

        const discountRule: any = {
          name: `${name} - ${item.sku}`,
          active: isActive,
          discounts: {
            values: [discountValue]
          }
        };

        if (startDate || endDate) {
          discountRule.activeTimeInfo = {};
          if (startDate) {
            discountRule.activeTimeInfo.start = typeof startDate === 'string' ? new Date(startDate) : startDate;
          }
          if (endDate) {
            discountRule.activeTimeInfo.end = typeof endDate === 'string' ? new Date(endDate) : endDate;
          }
        }

        const triggerScopes = [{
          _id: `bulk_${item.productId}`,
          type: 'CATALOG_ITEM',
          catalogItemFilter: {
            catalogAppId: catalogAppId || '215238eb-22a5-4c36-9e7b-e7c08025e04e',
            catalogItemIds: [item.productId]
          }
        }];

        const triggers: any[] = [];

        if (memberIds && memberIds.length > 0) {
          triggers.push({
            triggerType: 'CUSTOMER_ELIGIBILITY',
            customerEligibility: {
              eligibilityType: 'INDIVIDUAL_MEMBERS',
              individualMembersInfo: { memberIds }
            }
          });
        }

        const minQty = minimumQuantity || (ruleData as any).minQuantity;
        const maxQty = maximumQuantity || (ruleData as any).maxQuantity;
        if (minQty || maxQty) {
          triggers.push({
            triggerType: 'ITEM_QUANTITY_RANGE',
            itemQuantityRange: {
              from: minQty || undefined,
              to: maxQty || undefined,
              scopes: triggerScopes
            }
          });
        }

        if (minimumOrder || maximumOrder) {
          triggers.push({
            triggerType: 'SUBTOTAL_RANGE',
            subtotalRange: {
              from: minimumOrder ? minimumOrder.toString() : undefined,
              to: maximumOrder ? maximumOrder.toString() : undefined,
              scopes: triggerScopes
            }
          });
        }

        if (triggers.length === 0 && triggerId && triggerAppId) {
          discountRule.trigger = {
            triggerType: 'CUSTOM',
            customTrigger: { _id: triggerId, appId: triggerAppId }
          };
        } else if (triggers.length === 1) {
          discountRule.trigger = triggers[0];
        } else if (triggers.length > 1) {
          discountRule.trigger = {
            triggerType: 'AND',
            and: { triggers }
          };
        } else {
        }

        try {
          const result = await elevatedCreateRule(discountRule);
          const bulkCreatedRule = (result as any).discountRule || result;
          await mirrorRuleSave(bulkCreatedRule);
          createdCount++;
        } catch (itemError: any) {
          throw itemError;
        }
      }

      return { success: true, createdCount };
    } catch (error) {
      throw new Error(`Failed to create bulk rules: ${(error as Error).message}`);
    }
  }
);

export const processBulkCsvData = webMethod(
  Permissions.Admin,
  async (csvData: Array<{ sku: string, quantity: number, price: number }>) => {
    try {
      const catalog = await resolveCatalogLogic();
      const catalogProducts: any[] = (catalog as any)?.products ?? [];
      const catalogVersion: string = (catalog as any)?.catalogVersion ?? "V3_CATALOG";
      const skuMap = buildSkuMap(catalogProducts, catalogVersion);

      const validItems = [];
      const unfoundSkus = [];

      for (const item of csvData) {
        const productId = skuMap.get(item.sku) ?? null;
        if (productId) {
          validItems.push({
            ...item,
            productId
          });
        } else {
          unfoundSkus.push(item.sku);
        }
      }

      return {
        success: true,
        count: validItems.length,
        items: validItems,
        unfoundSkus: unfoundSkus,
        debugData: csvData.slice(0, 3) // Return first 3 parsed items for sanity checking
      };
    } catch (error) {
      throw new Error(`Failed to process CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Query all discount rules
export const queryAllRules = webMethod(
  Permissions.Anyone,
  async (filters: RuleFilters = {}) => {
    try {
      const res = await getAppInstance();


      const { active } = filters;

      let query = discountRules.queryDiscountRules().descending('_createdDate');

      if (active !== undefined) {
        query = query.eq('active', active);
      }

      const PAGE_SIZE = 100;
      let allItems: any[] = [];
      let pageCount = 0;

      let result: any = await query.limit(PAGE_SIZE).find();
      pageCount++;
      allItems = allItems.concat(result.items);

      while (result._nextCursor) {
        result = await result._fetchNextPage();
        pageCount++;
        allItems = allItems.concat(result.items);
      }
      return { _items: allItems };

    } catch (error) {
      throw new Error(`Failed to query rules: ${(error as Error).message}`);
    }
  }
);


export const updateUnifiedRule = webMethod(
  Permissions.Admin,
  async (ruleId: string, ruleData: UpdateRuleInput): Promise<UpdateRuleResponse> => {
    try {
      // Fetch current rule only to get name/active fallbacks
      const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);
      const currentRule = await elevatedGetDiscountRule(ruleId);

      // Build discount value
      const currentDiscount = currentRule.discounts?.values?.[0] || {};
      const discountValue: any = {
        targetType: currentDiscount.targetType || 'SPECIFIC_ITEMS'
      };

      const finalDiscountType = ruleData.discountType || (currentDiscount.discountType === 'PERCENTAGE' ? 'percentage' : (currentDiscount.discountType === 'FIXED_PRICE' ? 'fixed_price' : 'fixed'));
      const finalDiscountValue = ruleData.discountValue !== undefined ? ruleData.discountValue : (currentDiscount.percentage || parseFloat(currentDiscount.fixedAmount || '0') || parseFloat(currentDiscount.fixedPrice || '0') || 0);

      if (finalDiscountType === 'percentage') {
        discountValue.discountType = 'PERCENTAGE';
        discountValue.percentage = Math.max(0.1, finalDiscountValue);
      } else if (finalDiscountType === 'fixed' || (finalDiscountType as string) === 'fixed_amount') {
        discountValue.discountType = 'FIXED_AMOUNT';
        discountValue.fixedAmount = finalDiscountValue.toString();
      } else if (finalDiscountType === 'fixed_price') {
        discountValue.discountType = 'FIXED_PRICE';
        discountValue.fixedPrice = finalDiscountValue.toString();
      } else {
        // Fail before deleting the existing rule below
        throw new Error(`Unsupported discount type: ${finalDiscountType}`);
      }

      // Determine rule type and target
      const firstScope = currentDiscount.specificItemsInfo?.scopes?.[0];
      const isCurrentCategory = firstScope?.type === 'CUSTOM_FILTER' && !!firstScope.customFilter?.params?.collectionIds;

      const currentTargetIds = isCurrentCategory
        ? (firstScope.customFilter?.params?.collectionIds || [])
        : (firstScope?.catalogItemFilter?.catalogItemIds || []);

      const currentType = isCurrentCategory ? 'category' : (currentTargetIds.length > 0 ? 'product' : 'global');

      const finalType = ruleData.type || currentType;

      const finalCategoryIds = ruleData.categoryIds || (finalType === 'category' && ruleData.targetId ? [ruleData.targetId] : (isCurrentCategory ? currentTargetIds : []));
      const finalProductIds = ruleData.productIds || (finalType === 'product' && ruleData.targetId ? [ruleData.targetId] : (!isCurrentCategory && currentType !== 'global' ? currentTargetIds : []));

      const catalogAppId = "215238eb-22a5-4c36-9e7b-e7c08025e04e"; // Wix Stores

      if (finalType === 'category' && finalCategoryIds.length > 0) {
        discountValue.specificItemsInfo = {
          scopes: [{
            id: `collections_${catalogAppId}`,
            type: 'CUSTOM_FILTER',
            customFilter: {
              appId: "215238eb-22a5-4c36-9e7b-e7c08025e04e",
              params: { collectionIds: finalCategoryIds }
            }
          }]
        };
      } else if (finalType === 'product' && finalProductIds.length > 0) {
        discountValue.specificItemsInfo = {
          scopes: finalProductIds.map((id: string) => ({
            id: `product_${id}`,
            type: 'CATALOG_ITEM',
            catalogItemFilter: {
              catalogAppId: "215238eb-22a5-4c36-9e7b-e7c08025e04e",
              catalogItemIds: [id]
            }
          }))
        };
      } else {
        discountValue.specificItemsInfo = {
          scopes: [{
            id: "global_all_products",
            type: 'CATALOG_ITEM',
            catalogItemFilter: {
              catalogAppId: "215238eb-22a5-4c36-9e7b-e7c08025e04e",
              catalogItemIds: []
            }
          }]
        };
      }

      // Build new rule payload (same structure as createUnifiedRule)
      const newRule: any = {
        name: ruleData.name !== undefined ? ruleData.name : currentRule.name,
        offer: ruleData.description !== undefined ? ruleData.description : currentRule.offer,
        active: ruleData.active !== undefined ? ruleData.active : currentRule.active,
        discounts: {
          values: [discountValue]
        }
      };

      const finalStartDate = ruleData.startDate || currentRule.activeTimeInfo?.start;
      const finalEndDate = ruleData.endDate || currentRule.activeTimeInfo?.end;

      if (finalStartDate || finalEndDate) {
        newRule.activeTimeInfo = {};
        if (finalStartDate) {
          newRule.activeTimeInfo.start = typeof finalStartDate === 'string' ? new Date(finalStartDate) : finalStartDate;
        }
        if (finalEndDate) {
          newRule.activeTimeInfo.end = typeof finalEndDate === 'string' ? new Date(finalEndDate) : finalEndDate;
        }
      }

      // Build triggers with AND-chaining (same logic as createUnifiedRule)
      const triggers: any[] = [];

      // Define trigger scopes based on rule type
      const triggerScopes: any[] = [];

      if (finalType === 'category' && finalCategoryIds.length > 0) {
        triggerScopes.push({
          id: `collections_${catalogAppId}`,
          type: 'CUSTOM_FILTER',
          customFilter: {
            appId: catalogAppId,
            params: { collectionIds: finalCategoryIds }
          }
        });
      } else if (finalType === 'product' && finalProductIds.length > 0) {
        triggerScopes.push(...finalProductIds.map((id: string) => ({
          id: `specific_${id}`,
          type: 'CATALOG_ITEM',
          catalogItemFilter: { catalogAppId, catalogItemIds: [id] }
        })));
      } else {
        // Global scope
        triggerScopes.push({
          id: `all_${catalogAppId}`,
          type: 'CATALOG_ITEM',
          catalogItemFilter: { catalogAppId, catalogItemIds: [] }
        });
      }

      // Extract current trigger info if not provided
      const currentTrigger = currentRule.trigger || {};
      const currentIndividualMembers = currentTrigger.customerEligibility?.individualMembersInfo?.memberIds || [];
      const currentMinQty = (currentTrigger.itemQuantityRange?.from || undefined) as number | undefined;
      const currentMaxQty = (currentTrigger.itemQuantityRange?.to || undefined) as number | undefined;
      const currentMinOrder = currentTrigger.subtotalRange?.from ? parseFloat(currentTrigger.subtotalRange.from) : undefined;
      const currentMaxOrder = currentTrigger.subtotalRange?.to ? parseFloat(currentTrigger.subtotalRange.to) : undefined;

      const finalMemberIds = ruleData.memberIds !== undefined ? ruleData.memberIds : currentIndividualMembers;
      const finalMinQty = ruleData.minQuantity !== undefined ? ruleData.minQuantity : currentMinQty;
      const finalMaxQty = ruleData.maxQuantity !== undefined ? ruleData.maxQuantity : currentMaxQty;
      const finalMinOrder = ruleData.minimumOrder !== undefined ? ruleData.minimumOrder : currentMinOrder;
      const finalMaxOrder = ruleData.maximumOrder !== undefined ? ruleData.maximumOrder : currentMaxOrder;

      if (finalMemberIds && finalMemberIds.length > 0) {
        triggers.push({
          triggerType: 'CUSTOMER_ELIGIBILITY',
          customerEligibility: {
            eligibilityType: 'INDIVIDUAL_MEMBERS',
            individualMembersInfo: { memberIds: finalMemberIds }
          }
        });
      }

      if (ruleData.minQuantity || ruleData.maxQuantity) {
        triggers.push({
          triggerType: 'ITEM_QUANTITY_RANGE',
          itemQuantityRange: {
            from: ruleData.minQuantity || undefined,
            to: ruleData.maxQuantity || undefined,
            scopes: triggerScopes
          }
        });
      }

      if (ruleData.minimumOrder || ruleData.maximumOrder) {
        triggers.push({
          triggerType: 'SUBTOTAL_RANGE',
          subtotalRange: {
            from: ruleData.minimumOrder ? ruleData.minimumOrder.toString() : undefined,
            to: ruleData.maximumOrder ? ruleData.maximumOrder.toString() : undefined,
            scopes: triggerScopes
          }
        });
      }

      if (triggers.length === 1) {
        newRule.trigger = triggers[0];
      } else if (triggers.length > 1) {
        newRule.trigger = { triggerType: 'AND', and: { triggers } };
      }

      // Delete the old rule then recreate — avoids Wix PATCH field mask restrictions
      // (discounts.values and trigger.triggerType are not patchable via updateDiscountRule)
      const elevatedDeleteRule = auth.elevate(discountRules.deleteDiscountRule);
      await elevatedDeleteRule(ruleId);

      const elevatedCreateRule = auth.elevate(discountRules.createDiscountRule);

      if (finalMemberIds && finalMemberIds.length > MEMBER_BATCH_SIZE) {
        const chunks = chunkArray(finalMemberIds, MEMBER_BATCH_SIZE);
        const otherTriggers = triggers.filter(t => t.triggerType !== 'CUSTOMER_ELIGIBILITY');
        let firstCreatedRule: any = null;

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const batchRule = { ...newRule };
          const memberTrigger = {
            triggerType: 'CUSTOMER_ELIGIBILITY',
            customerEligibility: {
              eligibilityType: 'INDIVIDUAL_MEMBERS',
              individualMembersInfo: { memberIds: chunk }
            }
          };

          batchRule.trigger = otherTriggers.length === 0
            ? memberTrigger
            : { triggerType: 'AND', and: { triggers: [memberTrigger, ...otherTriggers] } };

          const result = await elevatedCreateRule(batchRule);
          const createdRule = (result as any).discountRule || result;
          if (!firstCreatedRule) {
            await mirrorRuleReplace(ruleId, createdRule);
            firstCreatedRule = createdRule;
          } else {
            await mirrorRuleSave(createdRule);
          }
        }
        return { success: true, data: firstCreatedRule };
      }

      const result = await elevatedCreateRule(newRule);

      const createdRule = (result as any).discountRule || result;

      await mirrorRuleReplace(ruleId, createdRule);

      return { success: true, data: createdRule };

    } catch (error) {
      throw new Error(`Failed to update rule: ${(error as Error).message}`);
    }
  }
);

// Delete discount rule
export const deleteUnifiedRule = webMethod(
  Permissions.Admin,
  async (ruleId: string): Promise<DeleteRuleResponse> => {
    try {

      await discountRules.deleteDiscountRule(ruleId);
      await mirrorRuleDelete(ruleId);

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete rule: ${(error as Error).message}`);
    }
  }
);

export const getUnifiedRule = webMethod(
  Permissions.Anyone,
  async (ruleId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {

      const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);
      const response = await elevatedGetDiscountRule("a0353110-7b6f-4906-a2c3-e6d4d654b63a");

      return { success: true, data: response };

    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
);

export const getMembersFromDiscountRule = webMethod(
  Permissions.Anyone,
  async (ruleId: string) => {
    try {
      const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);
      const rule = await elevatedGetDiscountRule(ruleId);

      // Extract member IDs — check direct CUSTOMER_ELIGIBILITY or nested inside AND trigger
      let memberIds: string[] = [];
      const trigger = rule.trigger as any;
      if (trigger?.triggerType === 'CUSTOMER_ELIGIBILITY') {
        memberIds = trigger.customerEligibility?.individualMembersInfo?.memberIds || [];
      } else if (trigger?.triggerType === 'AND') {
        const eligibilityTrigger = trigger.and?.triggers?.find(
          (t: any) => t.triggerType === 'CUSTOMER_ELIGIBILITY'
        );
        memberIds = eligibilityTrigger?.customerEligibility?.individualMembersInfo?.memberIds || [];
      }

      return {
        success: true,
        memberIds: memberIds,
        ruleId: rule._id,
        ruleName: rule.name
      };
    } catch (error) {
      throw new Error(`Failed to get members from discount rule: ${(error as Error).message}`);
    }
  }
);

export const removeMembersFromDiscountRule = webMethod(
  Permissions.Anyone,
  async (ruleId: string, memberIdsToRemove: string[]) => {
    try {
      const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);
      const currentRule = await elevatedGetDiscountRule(ruleId);

      // Get current member IDs
      const currentMemberIds = currentRule.trigger?.customerEligibility?.individualMembersInfo?.memberIds || [];

      // Filter out the members to remove
      const updatedMemberIds = currentMemberIds.filter(
        memberId => !memberIdsToRemove.includes(memberId)
      );

      let updateData: any = {
        name: currentRule.name,
        active: currentRule.active,
        discounts: currentRule.discounts,
      };

      if (currentRule.activeTimeInfo) {
        updateData.activeTimeInfo = currentRule.activeTimeInfo;
      }

      if (updatedMemberIds.length > 0) {
        updateData.trigger = {
          triggerType: 'CUSTOMER_ELIGIBILITY',
          customerEligibility: {
            eligibilityType: 'INDIVIDUAL_MEMBERS',
            individualMembersInfo: {
              memberIds: updatedMemberIds
            }
          }
        };
      }

      await discountRules.deleteDiscountRule(ruleId);
      const result = await discountRules.createDiscountRule(updateData);

      return {
        success: true,
        data: result,
        removedCount: currentMemberIds.length - updatedMemberIds.length,
        remainingCount: updatedMemberIds.length
      };
    } catch (error) {
      throw new Error(`Failed to remove members from discount rule: ${(error as Error).message}`);
    }
  }
);

const ACCESS_GROUPS_COLLECTION = '@wd-strategies/wholesale-appllication/Accessgroup';

function extractMemberIdsFromDiscountTrigger(trigger: any): string[] {
  return flattenTriggers(trigger)
    .filter((item) => item?.triggerType === 'CUSTOMER_ELIGIBILITY')
    .flatMap((item) => item?.customerEligibility?.individualMembersInfo?.memberIds || []);
}

async function removeMemberFromAccessGroupsInternal(memberId: string): Promise<number> {
  const elevatedUpdateItem = auth.elevate(items.update);
  let result: any = await elevatedQueryItems(ACCESS_GROUPS_COLLECTION).limit(100).find();
  const allGroups: any[] = [...(result.items || [])];

  while (result.hasNext && result.hasNext()) {
    result = await result.next();
    allGroups.push(...(result.items || []));
  }

  let updatedGroups = 0;
  for (const group of allGroups) {
    const members: any[] = Array.isArray(group.members) ? group.members : [];
    const storedMemberIds = members.map((member: any) =>
      typeof member === 'string' ? member : member?.id || member?._id || member?.memberId || 'unknown',
    );
    const hasMember = storedMemberIds.includes(memberId);
    const nextMembers = members.filter((member) => {
      const id = typeof member === 'string' ? member : member?.id || member?._id || member?.memberId;
      return id !== memberId;
    });

    if (nextMembers.length === members.length) {
      continue;
    }

    await elevatedUpdateItem(ACCESS_GROUPS_COLLECTION, {
      ...group,
      _id: group._id,
      members: nextMembers,
    });
    updatedGroups += 1;
  }

  return updatedGroups;
}

async function removeMemberFromDiscountRulesInternal(memberId: string): Promise<number> {
  const elevatedDeleteRule = auth.elevate(discountRules.deleteDiscountRule);
  const elevatedCreateRule = auth.elevate(discountRules.createDiscountRule);
  const liveRulesResponse = await queryAllRules();
  const liveRules = (liveRulesResponse as any)?._items || (liveRulesResponse as any)?.items || [];
  let updatedRules = 0;

  for (const currentRule of liveRules) {
    const ruleId = currentRule?._id;
    if (!ruleId) continue;

    try {
      const currentMemberIds = extractMemberIdsFromDiscountTrigger(currentRule.trigger);
      const hasMember = currentMemberIds.includes(memberId);
      if (!hasMember) continue;

      const updatedMemberIds = currentMemberIds.filter((id) => id !== memberId);
      if (updatedMemberIds.length === 0) {
        await elevatedDeleteRule(ruleId);
        await mirrorRuleDelete(ruleId);
        updatedRules += 1;
        continue;
      }

      const updateData: any = {
        name: currentRule.name,
        active: currentRule.active,
        discounts: currentRule.discounts,
      };

      if (currentRule.activeTimeInfo) {
        updateData.activeTimeInfo = currentRule.activeTimeInfo;
      }

      const trigger = currentRule.trigger as any;
      if (trigger?.triggerType === 'AND') {
        const remainingTriggers = (trigger.and?.triggers || []).map((t: any) => {
          if (t.triggerType !== 'CUSTOMER_ELIGIBILITY') {
            return t;
          }
          return {
            ...t,
            customerEligibility: {
              ...t.customerEligibility,
              eligibilityType: 'INDIVIDUAL_MEMBERS',
              individualMembersInfo: { memberIds: updatedMemberIds },
            },
          };
        });
        updateData.trigger = {
          triggerType: 'AND',
          and: { triggers: remainingTriggers },
        };
      } else {
        updateData.trigger = {
          triggerType: 'CUSTOMER_ELIGIBILITY',
          customerEligibility: {
            eligibilityType: 'INDIVIDUAL_MEMBERS',
            individualMembersInfo: { memberIds: updatedMemberIds },
          },
        };
      }

      await elevatedDeleteRule(ruleId);
      const created = await elevatedCreateRule(updateData);
      const createdRule = (created as any)?.discountRule || created;
      await mirrorRuleReplace(ruleId, createdRule);
      updatedRules += 1;
    } catch (error) {
      throw error;
    }
  }

  return updatedRules;
}

/**
 * Strip a member from access groups and pricing rules after reject/revoke.
 * Contact customer field should already be cleared by the caller.
 */
export const revokeWholesaleAccess = webMethod(
  Permissions.Admin,
  async (memberId: string) => {
    const normalizedMemberId = typeof memberId === 'string' ? memberId.trim() : '';
    if (!normalizedMemberId) {
      return {
        success: false,
        error: 'memberId is required',
        accessGroupsUpdated: 0,
        rulesUpdated: 0,
      };
    }

    try {
      const accessGroupsUpdated = await removeMemberFromAccessGroupsInternal(normalizedMemberId);
      const rulesUpdated = await removeMemberFromDiscountRulesInternal(normalizedMemberId);
      return {
        success: true,
        memberId: normalizedMemberId,
        accessGroupsUpdated,
        rulesUpdated,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error)?.message || String(error),
        accessGroupsUpdated: 0,
        rulesUpdated: 0,
      };
    }
  }
);

export const appendMembersToDiscountRule = webMethod(
  Permissions.Anyone,
  async (ruleId: string, newMemberIds: string[]) => {
    try {
      const elevatedGetDiscountRule = auth.elevate(discountRules.getDiscountRule);
      const currentRule = await elevatedGetDiscountRule(ruleId);

      // Get current member IDs
      const currentMemberIds = currentRule.trigger?.customerEligibility?.individualMembersInfo?.memberIds || [];

      // Merge and deduplicate
      const allMemberIds = [...new Set([...currentMemberIds, ...newMemberIds])];

      // Create replacement rule data
      const updateData: any = {
        name: currentRule.name,
        active: currentRule.active,
        discounts: currentRule.discounts,
      };

      if (currentRule.activeTimeInfo) {
        updateData.activeTimeInfo = currentRule.activeTimeInfo;
      }
      await discountRules.deleteDiscountRule(ruleId);

      if (allMemberIds.length === 0) {
        const result = await discountRules.createDiscountRule(updateData);
        return {
          success: true,
          data: result,
          previousCount: currentMemberIds.length,
          newCount: 0,
          addedCount: 0
        };
      }

      const chunks = chunkArray(allMemberIds, MEMBER_BATCH_SIZE);
      if (chunks.length > 1) {
      }
      let firstResult: any = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batchData = {
          ...updateData,
          trigger: {
            triggerType: 'CUSTOMER_ELIGIBILITY',
            customerEligibility: {
              eligibilityType: 'INDIVIDUAL_MEMBERS',
              individualMembersInfo: { memberIds: chunk }
            }
          }
        };
        const result = await discountRules.createDiscountRule(batchData);
        if (!firstResult) firstResult = result;
      }

      return {
        success: true,
        data: firstResult,
        previousCount: currentMemberIds.length,
        newCount: allMemberIds.length,
        addedCount: allMemberIds.length - currentMemberIds.length
      };
    } catch (error) {
      throw new Error(`Failed to append members to discount rule: ${(error as Error).message}`);
    }
  }
);

// Apply a discount rule to all members in an access group
export const applyDiscountRuleToAccessGroup = webMethod(
  Permissions.Anyone,
  async (ruleId: string, accessGroupId: string) => {
    try {
      // Look up the access group by ID using the current Wix Data SDK API.
      const accessGroup: any = await elevatedGetDataItem(
        ACCESS_GROUPS_COLLECTION,
        accessGroupId,
        { consistentRead: true },
      );

      if (!accessGroup) {
        throw new Error(`Access group not found: ${accessGroupId}`);
      }

      const memberIds = accessGroup.members || [];

      if (memberIds.length === 0) {
        return {
          success: true,
          message: 'No members in this access group',
          memberCount: 0
        };
      }

      // Add all members to the discount rule
      const result = await appendMembersToDiscountRule(ruleId, memberIds);

      return {
        success: true,
        accessGroupName: accessGroup.name,
        memberCount: memberIds.length,
        discountRuleUpdate: result
      };
    } catch (error) {
      throw new Error(`Failed to apply discount rule to access group: ${(error as Error).message}`);
    }
  }
);

export const getAppPlanIds = webMethod(
  Permissions.Anyone,
  async (appId: string) => {
    try {
      const elevatedListAppPlansByAppId = auth.elevate(appPlans.listAppPlansByAppId);
      const response = await elevatedListAppPlansByAppId([appId]);

      const planIds =
        response.appPlans?.map(appPlan =>
          (appPlan.plans ?? []).map(plan => plan._id)
        ) || [];


      return planIds.flat();
    } catch (error) {
      throw error;
    }
  }
);

const getApprovalEmailHTML = (bodyText?: string): string => {
  const isHtml = bodyText && bodyText.trim().startsWith('<');
  const bodyLines = bodyText
    ? isHtml
      ? bodyText
      : bodyText.split('\n').filter(l => l.trim()).map(l => `<p style="margin: 0 0 15px 0;">${l}</p>`).join('')
    : `<p style="margin: 0 0 15px 0;">Your wholesale application has been approved.</p>
      <p style="margin: 0 0 25px 0;">You now have access to wholesale pricing when you log into your account.</p>`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333333; line-height: 1.6;">
      <div style="background-color: #10b981; color: white; padding: 15px; text-align: center; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 22px;">Wholesale Application Approved</h2>
      </div>
      <p style="margin: 0 0 15px 0;">Hello,</p>
      ${bodyLines}
      <p style="margin: 25px 0 0 0;">Best regards,<br>The Team</p>
    </div>
  `;
};

const getRejectionEmailHTML = (bodyText?: string): string => {
  const isHtml = bodyText && bodyText.trim().startsWith('<');
  const bodyLines = bodyText
    ? isHtml
      ? bodyText
      : bodyText.split('\n').filter(l => l.trim()).map(l => `<p style="margin: 0 0 15px 0;">${l}</p>`).join('')
    : `<p style="margin: 0 0 15px 0;">Thank you for your interest in our wholesale program.</p>
      <p style="margin: 0 0 15px 0;">We are unable to approve your application at this time.</p>
      <p style="margin: 0 0 25px 0;">You can continue shopping at regular retail prices, and you're welcome to reapply in the future.</p>`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333333; line-height: 1.6;">
      <div style="background-color: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 22px;">Wholesale Application Update</h2>
      </div>
      <p style="margin: 0 0 15px 0;">Hello,</p>
      ${bodyLines}
      <p style="margin: 25px 0 0 0;">Best regards,<br>The Team</p>
    </div>
  `;
};

export const sendWholesaleApprovalEmail = webMethod(
  Permissions.Anyone,
  async (recipientEmail: string) => {
    const config = await getConfiguration();
    const template = (config as any)?.emailTemplates?.approval;
    const subject = template?.subject || 'Wholesale Application Approved';
    const htmlContent = getApprovalEmailHTML(template?.bodyText);

    try {
      const response = await fetch(PROTON_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `${recipientEmail}`,
          subject,
          data: {
            emailTemplate: htmlContent,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.messageId || 'sent',
        recipientEmail,
        subject,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unknown error',
        recipientEmail,
        subject,
      };
    }
  }
);

export const sendWholesaleRejectionEmail = webMethod(
  Permissions.Anyone,
  async (recipientEmail: string) => {
    const config = await getConfiguration();
    const template = (config as any)?.emailTemplates?.rejection;
    const subject = template?.subject || 'Wholesale Application Status';
    const htmlContent = getRejectionEmailHTML(template?.bodyText);


    try {
      const response = await fetch(PROTON_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `${recipientEmail}`,
          subject,
          data: {
            emailTemplate: htmlContent,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.messageId || 'sent',
        recipientEmail,
        subject,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unknown error',
        recipientEmail,
        subject,
      };
    }
  }
);

export const verifySiteId = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const instance = await getAppInstance()
      const siteId = instance?.site?.siteId
      const url = 'https://www.wixcustomsolutions.com/_functions/siteverify';
      const data = {
        "siteId": `${siteId}`
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });


      const myData = await response.json()
      return myData
    } catch (error) {
      return {
        status: 500,
        showBanner: false,

      };
    }
  }
)

const getNewApplicationEmailHTML = (applicationData: any, bodyText?: string): string => {
  const isHtml = bodyText && bodyText.trim().startsWith('<');
  const introContent = bodyText
    ? isHtml
      ? bodyText
      : bodyText.split('\n').filter(l => l.trim()).map(l => `<p style="margin: 0 0 15px 0;">${l}</p>`).join('')
    : `<p style="margin: 0 0 15px 0;">You have received a new wholesale partner application:</p>`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333333; line-height: 1.6;">
      <div style="background-color: #3b82f6; color: white; padding: 15px; text-align: center; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 22px;">New Wholesale Application Received</h2>
      </div>
      ${introContent}

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="margin: 0 0 10px 0;"><strong>Contact Name:</strong> ${applicationData.contactName || 'N/A'}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
        <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${applicationData.phone || 'N/A'}</p>
        <p style="margin: 0 0 10px 0;"><strong>Business Name:</strong> ${applicationData.businessName || 'N/A'}</p>
        <p style="margin: 0 0 10px 0;"><strong>Business Type:</strong> ${applicationData.businessType || 'N/A'}</p>
        <p style="margin: 0;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <p style="margin: 25px 0 0 0;">Please log into your dashboard to review and approve or reject this application.</p>
      <p style="margin: 25px 0 0 0;">Best regards,<br>Wholesale Application System</p>
    </div>
  `;
};

export const sendNewApplicationNotificationToOwner = webMethod(
  Permissions.Anyone,
  async (applicationData: any) => {
    try {
      const appInstance = await getAppInstance();
      const ownerEmail = appInstance?.site?.ownerInfo?.email

      if (!ownerEmail) {
        throw new Error('Owner email not found');
      }

      const config = await getConfiguration();
      const template = (config as any)?.emailTemplates?.customerRegistration;
      const subject = template?.subject || `New Wholesale Application from ${applicationData.contactName}`;
      const htmlContent = getNewApplicationEmailHTML(applicationData, template?.bodyText);

      const response = await fetch(PROTON_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: ownerEmail,
          subject,
          data: {
            emailTemplate: htmlContent,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.messageId || 'sent',
        recipientEmail: ownerEmail,
        subject,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Unknown error',
        subject: 'New Wholesale Application Notification',
      };
    }
  }
);


/**
 * Retrieves a Product ID based on a given SKU.
 * @param {string} sku - The SKU of the product to find.
 * @returns {Promise<string|null>} The Product ID (_id) or null if not found.
 */
export const getAllStoreCategories = webMethod(
  Permissions.Anyone,
  async () => {
    try {
      const elevatedGetCatalogVersion = auth.elevate(catalogVersioning.getCatalogVersion);
      const catalogVersionResponse = await elevatedGetCatalogVersion();

      if (catalogVersionResponse.catalogVersion === 'V3_CATALOG') {
        try {
          const result = await categories.searchCategories({}, {
            treeReference: { appNamespace: "@wix/stores" }
          });
          const flat: any[] = (result as any).categories ?? [];

          const normalise = (cat: any) => ({
            _id: typeof cat._id === 'object' ? cat._id.value || cat._id._id : cat._id,
            name: typeof cat.name === 'object' ? cat.name.value || cat.name.name : cat.name,
            slug: typeof cat.slug === 'object' ? cat.slug.value || cat.slug.slug : cat.slug,
            visible: cat.visible,
            numberOfProducts: cat.numberOfProducts || 0,
            parentCategory: cat.parentCategory,
            subcategories: [] as any[],
          });

          const byId: Record<string, any> = {};
          flat.forEach(cat => { byId[cat._id] = normalise(cat); });

          const roots: any[] = [];
          flat.forEach(cat => {
            const parentId = cat.parentCategory?._id;
            if (parentId && byId[parentId]) {
              byId[parentId].subcategories.push(byId[cat._id]);
            } else {
              roots.push(byId[cat._id]);
            }
          });

          return roots;
        } catch (err) {
          return [];
        }
      } else {
        const elevatedQueryCollections = auth.elevate(collections.queryCollections);
        const response = await elevatedQueryCollections().find();

        const collectionsWithCounts = await Promise.all(
          response.items.map(async (collection) => {
            try {
              if (collection._id) {
                const elevatedQueryProducts = auth.elevate(products.queryProducts);

                let allProducts: any[] = [];
                let resultsV1 = await elevatedQueryProducts().limit(100).find();
                allProducts = allProducts.concat(resultsV1.items);

                while (resultsV1.hasNext()) {
                  resultsV1 = await resultsV1.next();
                  allProducts = allProducts.concat(resultsV1.items);
                }

                const filteredProducts = allProducts.filter((product: any) =>
                  product.collectionIds?.includes(collection._id)
                );

                return { ...collection, numberOfProducts: filteredProducts.length };
              }
              return collection;
            } catch (error) {
              return collection;
            }
          })
        );

        return collectionsWithCounts;
      }
    } catch (error) {
      return [];
    }
  }
);

function buildSkuMap(products: any[], catalogVersion: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const product of products) {
    const id = product._id;
    if (product.sku) map.set(product.sku, id);
    const variants: any[] = product.variants ?? [];
    for (const v of variants) {
      // V1: variants[].variant.sku  |  V3: variants[].sku
      const sku = catalogVersion === "V1_CATALOG" ? v?.variant?.sku : v?.sku;
      if (sku) map.set(sku, id);
    }
  }
  return map;
}

export async function getProductIdBySkuData(sku: string) {
  // Try V1 first — if the query succeeds (even with 0 results) the site is on V1,
  // so return immediately and never call V3 APIs.
  try {
    const results = await items.query("Stores/Products")
      .eq("sku", sku)
      .limit(1)
      .find();

    return results.items.length > 0 ? results.items[0]._id : null;
  } catch (_) {
    // V1 collection unavailable — site is on Catalog V3
  }

  // V3 fallback — SKU is not a filterable field, so paginate and match in-memory.
  try {
    let result = await productsV3.queryProducts().limit(100).find();

    while (true) {
      for (const product of result.items) {
        const variants: any[] = (product as any).variants ?? [];
        if (variants.some((v: any) => v.sku === sku) || (product as any).sku === sku) {
          return product._id;
        }
      }

      if (!result.hasNext()) break;
      result = await result.next();
    }

    return null;
  } catch (error) {
    throw error;
  }
}
