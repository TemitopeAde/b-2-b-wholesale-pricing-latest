import React, { type FC, useEffect, useState } from 'react';
import ReactDOMClient from 'react-dom/client';
import reactToWebComponent from 'react-to-webcomponent';
import { members } from '@wix/members';
import { getCurrentMember, getWholesalePricesBySlugs } from '../../../../backend/pricing.client';
import type { ProductWholesalePriceResponse } from '../../../../backend/types';
import { useSiteCurrency } from '../../../../utils/currency';
import { logPriceDiagnostics } from '../../../../utils/priceDiagnostics';
import styles from './gallery-page.module.css';

const PRODUCT_ITEM_SELECTOR = '[data-hook="product-item-root"]';
const PRICE_CONTAINER_SELECTOR = '[data-hook="prices-container"]';
const PRODUCT_LINK_SELECTOR = '[data-hook="product-item-product-details-link"]';
const RETAIL_PRICE_SELECTOR = '[data-hook="product-item-price-to-pay"]';
const INJECTED_PRICE_CLASS = 'wd-wholesale-gallery-price';

type NativePriceMode = 'strike' | 'hide';

type Props = {
  nativePriceMode?: string;
  priceColor?: string;
  priceFont?: string;
};

const DEFAULT_NATIVE_PRICE_MODE: NativePriceMode = 'strike';

function normalizeNativePriceMode(value?: string): NativePriceMode {
  return value === 'hide' ? 'hide' : DEFAULT_NATIVE_PRICE_MODE;
}

function getSlugFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    return pathSegments[pathSegments.length - 1] || null;
  } catch {
    return null;
  }
}

function removeInjectedPrices() {
  document.querySelectorAll(`.${INJECTED_PRICE_CLASS}`).forEach((node) => node.remove());
}

function getRetailPriceNode(priceContainer: HTMLElement): HTMLElement | null {
  return priceContainer.querySelector(RETAIL_PRICE_SELECTOR) as HTMLElement | null;
}

function restoreRetailPriceState(priceContainer: HTMLElement) {
  const retailPriceNode = getRetailPriceNode(priceContainer);

  if (!retailPriceNode) {
    return;
  }

  retailPriceNode.classList.remove(styles.retailPriceStrike, styles.hidden);
  retailPriceNode.style.display = '';

  if (retailPriceNode.dataset.originalPriceText !== undefined) {
    retailPriceNode.textContent = retailPriceNode.dataset.originalPriceText || '';
  }
}

function applyRetailPriceMode(priceContainer: HTMLElement, nativePriceMode: NativePriceMode) {
  const retailPriceNode = getRetailPriceNode(priceContainer);

  if (!retailPriceNode) {
    return;
  }

  if (!retailPriceNode.dataset.originalPriceText) {
    retailPriceNode.dataset.originalPriceText = retailPriceNode.textContent || '';
  }

  retailPriceNode.textContent = retailPriceNode.dataset.originalPriceText || '';
  retailPriceNode.classList.remove(styles.retailPriceStrike, styles.hidden);
  retailPriceNode.style.display = '';

  if (nativePriceMode === 'hide') {
    retailPriceNode.classList.add(styles.hidden);
    retailPriceNode.style.display = 'none';
    return;
  }

  retailPriceNode.classList.add(styles.retailPriceStrike);
}

function createLoaderElement(): HTMLSpanElement {
  const wrapper = document.createElement('span');
  wrapper.className = styles.loaderWrapper;
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `
    <svg class="${styles.loader}" fill="hsl(228, 97%, 42%)" viewBox="0 -10 40 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="12" r="3" class="${styles.loaderDotFirst}"></circle>
      <circle cx="16" cy="12" r="3"></circle>
      <circle cx="24" cy="12" r="3"></circle>
      <circle cx="32" cy="12" r="3" class="${styles.loaderDotSecond}"></circle>
    </svg>
  `;
  return wrapper;
}

function normalizeFontFamily(fontValue?: string): string {
  if (!fontValue) {
    return '';
  }

  const quoteMatches = fontValue.match(/"[^"]+"/g);
  if (quoteMatches && quoteMatches.length > 0) {
    return quoteMatches.join(',');
  }

  const familyStart = fontValue.search(/["']/);
  if (familyStart >= 0) {
    return fontValue.slice(familyStart).trim();
  }

  const parts = fontValue.trim().split(/\s+/);
  if (parts.length <= 1) {
    return fontValue.trim();
  }

  const familyTokens = parts.filter((part) => {
    const normalizedPart = part.toLowerCase();
    return !(
      normalizedPart === 'normal' ||
      normalizedPart === 'italic' ||
      normalizedPart === 'oblique' ||
      normalizedPart === 'bold' ||
      normalizedPart === 'bolder' ||
      normalizedPart === 'lighter' ||
      /^\d+$/.test(normalizedPart) ||
      /^\d+px$/.test(normalizedPart) ||
      /^\d+rem$/.test(normalizedPart) ||
      /^\d+em$/.test(normalizedPart) ||
      normalizedPart.includes('/')
    );
  });

  return familyTokens.join(' ').trim();
}

function applyInjectedPriceStyles(priceNode: HTMLElement, priceColor?: string, priceFont?: string) {
  const normalizedFontFamily = normalizeFontFamily(priceFont);
  priceNode.style.color = priceColor || '';
  priceNode.style.fontFamily = normalizedFontFamily;
}

type ResolvedHostConfig = {
  nativePriceMode?: string;
  priceColor?: string;
  priceFont?: string;
};

function findClosestCustomElementHost(probeNode?: Node | null): HTMLElement | null {
  const sourceElement =
    probeNode instanceof HTMLElement
      ? probeNode
      : document.querySelector(`.${styles.root}`)?.parentElement;

  return (
    sourceElement?.closest(
      '[pricefont],[price-font],[pricecolor],[price-color],[nativepricemode],[native-price-mode]'
    ) || null
  );
}

function readHostConfig(host: HTMLElement | null): ResolvedHostConfig {
  if (!host) {
    return {};
  }

  return {
    nativePriceMode:
      host.getAttribute('nativepricemode') ||
      host.getAttribute('native-price-mode') ||
      undefined,
    priceColor:
      host.getAttribute('pricecolor') ||
      host.getAttribute('price-color') ||
      undefined,
    priceFont:
      host.getAttribute('pricefont') ||
      host.getAttribute('price-font') ||
      undefined,
  };
}

function ensureInjectedPriceNode(priceContainer: HTMLElement, slug: string, priceColor?: string, priceFont?: string): HTMLDivElement {
  const existing = priceContainer.querySelector(
    `.${INJECTED_PRICE_CLASS}[data-wholesale-slug="${slug}"]`
  ) as HTMLDivElement | null;

  if (existing) {
    return existing;
  }

  const retailPriceNode = getRetailPriceNode(priceContainer);
  const injectedRow = document.createElement('div');
  injectedRow.className = `${INJECTED_PRICE_CLASS} ${styles.injectedPriceRow}`.trim();
  injectedRow.setAttribute('data-wholesale-slug', slug);

  const injectedPrice = retailPriceNode
    ? (retailPriceNode.cloneNode(true) as HTMLElement)
    : document.createElement('span');

  injectedPrice.removeAttribute('data-hook');
  injectedPrice.removeAttribute('data-wix-price');
  injectedPrice.classList.remove(styles.retailPriceStrike, styles.hidden);
  injectedPrice.style.display = '';
  injectedPrice.classList.add(styles.injectedPriceValue);
  applyInjectedPriceStyles(injectedPrice, priceColor, priceFont);
  injectedPrice.replaceChildren(createLoaderElement());

  injectedRow.appendChild(injectedPrice);
  priceContainer.appendChild(injectedRow);

  return injectedRow;
}

const LOG_PREFIX = '[gallery-products plugin]';

/** Share in-flight slug fetches across remounts so DOM churn doesn't spam the backend. */
const inFlightPricesBySignature = new Map<
  string,
  Promise<Record<string, ProductWholesalePriceResponse>>
>();

function formatLogDetails(details?: Record<string, unknown>): string {
  if (!details) {
    return '';
  }

  return Object.entries(details)
    .map(([key, value]) => {
      if (value === undefined) {
        return `${key}=none`;
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `${key}=${value}`;
      }

      try {
        return `${key}=${JSON.stringify(value)}`;
      } catch {
        return `${key}=${String(value)}`;
      }
    })
    .join(' | ')
    .replace(/^/, ' | ');
}

function logInfo(message: string, details?: Record<string, unknown>) {
  console.info(`${LOG_PREFIX} ${message}${formatLogDetails(details)}`);
}

function logWarn(message: string, details?: Record<string, unknown>) {
  console.warn(`${LOG_PREFIX} ${message}${formatLogDetails(details)}`);
}

function logError(message: string, details?: Record<string, unknown>) {
  console.error(`${LOG_PREFIX} ${message}${formatLogDetails(details)}`);
}

function extractMemberId(currentMember: unknown): string | undefined {
  return (
    (currentMember as any)?.member?.id ||
    (currentMember as any)?.member?._id ||
    (currentMember as any)?.id ||
    (currentMember as any)?._id ||
    (currentMember as any)?.member?.contactId ||
    undefined
  );
}

async function resolveClientMemberId(): Promise<{ memberId?: string; source: string }> {
  try {
    const frontendMember = await members.getCurrentMember({ fieldsets: ['FULL'] } as any);
    const frontendMemberId = extractMemberId(frontendMember);
    if (frontendMemberId) {
      return { memberId: frontendMemberId, source: 'frontend_members_sdk' };
    }
  } catch (error) {
    logWarn('Frontend members.getCurrentMember failed', { error: String(error) });
  }

  try {
    const backendMember = await getCurrentMember();
    const backendMemberId = extractMemberId(backendMember);
    if (backendMemberId) {
      return { memberId: backendMemberId, source: 'backend_getCurrentMember' };
    }
  } catch (error) {
    logWarn('Backend getCurrentMember failed', { error: String(error) });
  }

  return { memberId: undefined, source: 'none' };
}

function normalizePricesBySlugResponse(
  response: unknown
): Record<string, ProductWholesalePriceResponse> {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const maybeWrapped = response as { result?: Record<string, ProductWholesalePriceResponse> };
  if (maybeWrapped.result && typeof maybeWrapped.result === 'object' && !Array.isArray(maybeWrapped.result)) {
    const resultKeys = Object.keys(maybeWrapped.result);
    const looksLikeSlugMap = resultKeys.some((key) => key !== 'eligible' && key !== 'hasWholesalePrice');
    if (looksLikeSlugMap) {
      logInfo('Unwrapped response.result envelope', { keyCount: resultKeys.length });
      return maybeWrapped.result;
    }
  }

  return response as Record<string, ProductWholesalePriceResponse>;
}

const CustomElement: FC<Props> = ({ nativePriceMode, priceColor, priceFont }) => {
  const { currency, isLoading: isCurrencyLoading, error: currencyError } = useSiteCurrency();
  const [resolvedHostConfig, setResolvedHostConfig] = useState<ResolvedHostConfig>({});
  const resolvedNativePriceModeProp = nativePriceMode || resolvedHostConfig.nativePriceMode;
  const resolvedPriceColor = priceColor || resolvedHostConfig.priceColor;
  const resolvedPriceFont = priceFont || resolvedHostConfig.priceFont;

  useEffect(() => {
    logInfo('Plugin mounted', {
      href: typeof window !== 'undefined' ? window.location.href : 'none',
      propNativePriceMode: nativePriceMode || 'none',
      propPriceColor: priceColor || 'none',
      propPriceFont: priceFont || 'none',
    });

    const host = findClosestCustomElementHost();
    logInfo('Host element resolved', {
      found: Boolean(host),
      tagName: host?.tagName || 'none',
    });

    const syncHostConfig = () => {
      const nextHostConfig = readHostConfig(host);
      setResolvedHostConfig(nextHostConfig);
      logInfo('Host config synced', {
        nativePriceMode: nextHostConfig.nativePriceMode || 'none',
        priceColor: nextHostConfig.priceColor || 'none',
        priceFont: nextHostConfig.priceFont || 'none',
      });
    };

    syncHostConfig();

    if (!host) {
      logWarn('No host custom element found for config attributes');
      return;
    }

    const observer = new MutationObserver(() => {
      syncHostConfig();
    });

    observer.observe(host, {
      attributes: true,
      attributeFilter: ['nativepricemode', 'native-price-mode', 'pricecolor', 'price-color', 'pricefont', 'price-font'],
    });

    return () => {
      logInfo('Host config observer disposed');
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let isDisposed = false;
    let refreshToken = 0;
    let scheduledFrame = 0;
    let isSyncInFlight = false;
    let resyncRequested = false;
    let lastRequestedSlugSignature = '';
    let lastAppliedSlugSignature = '';
    const resolvedNativePriceMode = normalizeNativePriceMode(resolvedNativePriceModeProp);

    logInfo('Price sync effect started', {
      nativePriceMode: resolvedNativePriceMode,
      priceColor: resolvedPriceColor || 'none',
      priceFont: resolvedPriceFont || 'none',
    });

    const collectProductEntries = () => {
      const productItems = Array.from(document.querySelectorAll(PRODUCT_ITEM_SELECTOR)) as HTMLElement[];
      const skipped: Array<{ reason: string; href?: string }> = [];
      const slugEntries = productItems
        .map((productItem) => {
          const productLink = productItem.querySelector(PRODUCT_LINK_SELECTOR) as HTMLAnchorElement | null;
          const priceContainer = productItem.querySelector(PRICE_CONTAINER_SELECTOR) as HTMLElement | null;
          const slug = getSlugFromUrl(productLink?.href);

          if (!priceContainer || !slug) {
            skipped.push({
              reason: !priceContainer ? 'missing-price-container' : 'missing-slug',
              href: productLink?.href || 'none',
            });
            return null;
          }

          return {
            slug,
            priceContainer,
          };
        })
        .filter((entry): entry is { slug: string; priceContainer: HTMLElement } => Boolean(entry));

      const uniqueSlugs = Array.from(new Set(slugEntries.map((entry) => entry.slug))).sort();
      const slugSignature = uniqueSlugs.join('|');

      logInfo('Collected gallery product entries', {
        productItemsCount: productItems.length,
        slugEntriesCount: slugEntries.length,
        uniqueSlugs,
        slugSignature: slugSignature || 'none',
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 5),
      });

      return {
        productItemsCount: productItems.length,
        slugEntries,
        uniqueSlugs,
        slugSignature,
      };
    };

    const syncWholesalePrices = async () => {
      if (isCurrencyLoading || !currency) {
        if (currencyError) {
          logError('Site currency unavailable', { error: String(currencyError) });
        } else {
          logInfo('Waiting for site currency before syncing prices', {
            isCurrencyLoading,
            currency: currency || 'none',
          });
        }
        return;
      }
      const currentToken = ++refreshToken;
      const { productItemsCount, slugEntries, uniqueSlugs, slugSignature } = collectProductEntries();

      if (productItemsCount === 0 || uniqueSlugs.length === 0) {
        logWarn('Skipping sync — no gallery products/slugs found', {
          productItemsCount,
          uniqueSlugsCount: uniqueSlugs.length,
        });
        lastRequestedSlugSignature = '';
        lastAppliedSlugSignature = '';
        return;
      }

      if (slugSignature === lastAppliedSlugSignature || slugSignature === lastRequestedSlugSignature) {
        logInfo('Skipping sync — slug signature unchanged', {
          slugSignature,
          lastAppliedSlugSignature: lastAppliedSlugSignature || 'none',
          lastRequestedSlugSignature: lastRequestedSlugSignature || 'none',
        });
        return;
      }

      logInfo('Hydrating loader rows before fetch', {
        slugCount: uniqueSlugs.length,
        token: currentToken,
      });

      const hydratedEntries = slugEntries.map(({ slug, priceContainer }) => {
        const injectedRow = ensureInjectedPriceNode(priceContainer, slug, resolvedPriceColor, resolvedPriceFont);
        const injectedValue = injectedRow.firstElementChild as HTMLElement | null;
        restoreRetailPriceState(priceContainer);
        if (injectedValue) {
          applyInjectedPriceStyles(injectedValue, resolvedPriceColor, resolvedPriceFont);
          injectedValue.replaceChildren(createLoaderElement());
        }

        return {
          slug,
          priceContainer,
          injectedValue,
        };
      });

      lastRequestedSlugSignature = slugSignature;
      isSyncInFlight = true;

      try {
        const clientMember = await resolveClientMemberId();
        logInfo('Client member resolved before price fetch', {
          memberId: clientMember.memberId || 'none',
          memberSource: clientMember.source,
          token: currentToken,
        });

        logInfo('Calling getWholesalePricesBySlugs', {
          uniqueSlugs: JSON.stringify(uniqueSlugs),
          slugCount: uniqueSlugs.length,
          memberId: clientMember.memberId || 'none',
          memberSource: clientMember.source,
          token: currentToken,
        });
        const startedAt = performance.now();

        let pricePromise = inFlightPricesBySignature.get(slugSignature);
        if (pricePromise) {
          logInfo('Reusing in-flight getWholesalePricesBySlugs request', {
            slugSignature,
            token: currentToken,
          });
        } else {
          pricePromise = (async () => {
            const rawResponse = await getWholesalePricesBySlugs(uniqueSlugs, currency, clientMember.memberId);
            return normalizePricesBySlugResponse(rawResponse);
          })().finally(() => {
            inFlightPricesBySignature.delete(slugSignature);
          });
          inFlightPricesBySignature.set(slugSignature, pricePromise);
        }

        const response = await pricePromise;
        const elapsedMs = Math.round(performance.now() - startedAt);
        isSyncInFlight = false;

        logInfo('getWholesalePricesBySlugs response received', {
          elapsedMs,
          token: currentToken,
          responseKeys: JSON.stringify(Object.keys(response)),
          response: JSON.stringify(response),
          isEmptyResult: Object.keys(response).length === 0,
        });

        logPriceDiagnostics(LOG_PREFIX, uniqueSlugs, response);

        // Remounts dispose the previous effect; don't apply onto cleaned-up nodes.
        if (isDisposed || currentToken !== refreshToken) {
          logWarn('Discarding stale response', {
            isDisposed,
            currentToken,
            refreshToken,
          });
          return;
        }

        let appliedCount = 0;
        let removedCount = 0;

        hydratedEntries.forEach(({ slug, priceContainer, injectedValue }) => {
          if (!injectedValue) {
            logWarn('Missing injected value node', { slug });
            return;
          }

          const priceData = response?.[slug];
          const canApply =
            Boolean(priceData?.eligible) &&
            Boolean(priceData?.hasWholesalePrice) &&
            Boolean(priceData?.formattedWholesalePrice);

          logInfo('Per-slug price decision', {
            slug,
            hasPriceData: Boolean(priceData),
            eligible: priceData?.eligible === true,
            hasWholesalePrice: priceData?.hasWholesalePrice === true,
            formattedWholesalePrice: priceData?.formattedWholesalePrice || 'none',
            ruleName: priceData?.ruleName || 'none',
            reason: priceData?.reason || 'none',
            catalogVersion: priceData?.catalogVersion || 'none',
            lookupError: priceData?.lookupError || 'none',
            canApply,
            priceData: JSON.stringify(priceData || null),
          });

          if (canApply && priceData?.formattedWholesalePrice) {
            injectedValue.textContent = priceData.formattedWholesalePrice;
            injectedValue.classList.remove(styles.hidden);
            applyRetailPriceMode(priceContainer, resolvedNativePriceMode);
            appliedCount += 1;
            return;
          }

          restoreRetailPriceState(priceContainer);
          const injectedRow = injectedValue.closest(`.${INJECTED_PRICE_CLASS}`) as HTMLElement | null;
          injectedRow?.remove();
          removedCount += 1;
        });

        lastAppliedSlugSignature = slugSignature;
        logInfo('Sync complete', {
          slugSignature,
          appliedCount,
          removedCount,
          total: hydratedEntries.length,
        });

        if (resyncRequested && !isDisposed) {
          resyncRequested = false;
          logInfo('Running deferred resync after gallery changed during fetch');
          scheduleSync();
        }
      } catch (error) {
        isSyncInFlight = false;
        logError('Failed to fetch wholesale prices', {
          error: JSON.stringify(
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : String(error)
          ),
          uniqueSlugs: JSON.stringify(uniqueSlugs),
          token: currentToken,
        });

        if (isDisposed || currentToken !== refreshToken) {
          return;
        }

        hydratedEntries.forEach(({ priceContainer, injectedValue }) => {
          restoreRetailPriceState(priceContainer);
          const injectedRow = injectedValue?.closest(`.${INJECTED_PRICE_CLASS}`) as HTMLElement | null;
          injectedRow?.remove();
        });

        lastRequestedSlugSignature = '';

        if (resyncRequested && !isDisposed) {
          resyncRequested = false;
          logInfo('Running deferred resync after failed fetch');
          scheduleSync();
        }
      }
    };

    const scheduleSync = () => {
      if (isDisposed) {
        return;
      }

      if (scheduledFrame) {
        window.cancelAnimationFrame(scheduledFrame);
      }

      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        if (isSyncInFlight) {
          logInfo('Deferred schedule skipped — sync already in flight');
          return;
        }

        if (!isDisposed) {
          void syncWholesalePrices();
        }
      });
    };

    scheduleSync();

    observer = new MutationObserver(() => {
      const { slugSignature } = collectProductEntries();
      if (!slugSignature) {
        return;
      }

      if (slugSignature === lastAppliedSlugSignature || slugSignature === lastRequestedSlugSignature) {
        return;
      }

      if (isSyncInFlight) {
        resyncRequested = true;
        logInfo('Gallery changed during fetch; deferring resync', { slugSignature });
        return;
      }

      logInfo('DOM mutation triggered resync', { slugSignature });
      scheduleSync();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      logInfo('Price sync effect disposed');
      isDisposed = true;
      observer?.disconnect();
      if (scheduledFrame) {
        window.cancelAnimationFrame(scheduledFrame);
      }
      document.querySelectorAll(PRICE_CONTAINER_SELECTOR).forEach((node) => {
        restoreRetailPriceState(node as HTMLElement);
      });
      removeInjectedPrices();
    };
  }, [resolvedNativePriceModeProp, resolvedPriceColor, resolvedPriceFont, currency, isCurrencyLoading, currencyError]);

  return (
    <div
      className={styles.root}
      aria-hidden="true"
    />
  );
};

const customElement = reactToWebComponent(
  CustomElement,
  React,
  ReactDOMClient,
  {
    props: {
      nativePriceMode: 'string',
      priceColor: 'string',
      priceFont: 'string',
    },
  }
);

export default customElement;
