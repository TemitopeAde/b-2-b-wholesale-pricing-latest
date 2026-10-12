import React, { type FC, useEffect, useRef, useState } from 'react';
import ReactDOMClient from 'react-dom/client';
import reactToWebComponent from 'react-to-webcomponent';
import { getProductWholesalePrice } from '../../../../backend/pricing.client';
import type { ProductWholesalePriceResponse } from '../../../../backend/types';
import { useSiteCurrency } from '../../../../utils/currency';
import styles from './product-page.module.css';

type Props = {
  productId?: string;
  priceColor?: string;
  priceFont?: string;
  /** "true" shows the retail price to visitors without a wholesale price (panel toggle, off by default). */
  showRetailPrice?: string;
};

const emptyState: ProductWholesalePriceResponse = {
  eligible: false,
  hasWholesalePrice: false,
};

const AnimatedDotsLoader: FC = () => (
  <svg
    className={styles.loader}
    fill="#ffffff"
    viewBox="0 -10 40 28"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="8" cy="12" r="3" className={styles.loaderDotFirst} />
    <circle cx="16" cy="12" r="3" />
    <circle cx="24" cy="12" r="3" />
    <circle cx="32" cy="12" r="3" className={styles.loaderDotSecond} />
  </svg>
);

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

type ResolvedHostConfig = {
  productId?: string;
  priceColor?: string;
  priceFont?: string;
  showRetailPrice?: string;
};

function findClosestCustomElementHost(probeNode?: HTMLElement | null): HTMLElement | null {
  return (
    probeNode?.parentElement?.closest(
      '[productid],[product-id],[pricefont],[price-font],[pricecolor],[price-color],[showretailprice],[show-retail-price]'
    ) ||
    document.querySelector(`.${styles.root}`)?.parentElement?.closest(
      '[productid],[product-id],[pricefont],[price-font],[pricecolor],[price-color],[showretailprice],[show-retail-price]'
    ) ||
    null
  );
}

function readHostConfig(host: HTMLElement | null): ResolvedHostConfig {
  if (!host) {
    return {};
  }

  return {
    productId:
      host.getAttribute('productid') ||
      host.getAttribute('product-id') ||
      undefined,
    priceColor:
      host.getAttribute('pricecolor') ||
      host.getAttribute('price-color') ||
      undefined,
    priceFont:
      host.getAttribute('pricefont') ||
      host.getAttribute('price-font') ||
      undefined,
    showRetailPrice:
      host.getAttribute('showretailprice') ||
      host.getAttribute('show-retail-price') ||
      undefined,
  };
}

const CustomElement: FC<Props> = ({ productId, priceColor, priceFont, showRetailPrice }) => {
  const [state, setState] = useState<ProductWholesalePriceResponse>(emptyState);
  const [isLoading, setIsLoading] = useState(false);
  const { currency, isLoading: isCurrencyLoading, error: currencyError } = useSiteCurrency();
  const [resolvedHostConfig, setResolvedHostConfig] = useState<ResolvedHostConfig>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const resolvedProductId = productId || resolvedHostConfig.productId;
  const resolvedPriceColor = priceColor || resolvedHostConfig.priceColor;
  const resolvedPriceFont = priceFont || resolvedHostConfig.priceFont;
  const shouldShowRetailPrice = (showRetailPrice || resolvedHostConfig.showRetailPrice) === 'true';
  const normalizedFontFamily = normalizeFontFamily(resolvedPriceFont);

  useEffect(() => {
    const host = findClosestCustomElementHost(rootRef.current);
    const syncHostConfig = () => {
      const nextHostConfig = readHostConfig(host);
      setResolvedHostConfig(nextHostConfig);
    };

    syncHostConfig();

    if (!host) {
      return;
    }

    const observer = new MutationObserver(() => {
      syncHostConfig();
    });

    observer.observe(host, {
      attributes: true,
      attributeFilter: ['productid', 'product-id', 'pricecolor', 'price-color', 'pricefont', 'price-font', 'showretailprice', 'show-retail-price'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!resolvedProductId || isCurrencyLoading || !currency) {
      setState(emptyState);
      setIsLoading(isCurrencyLoading);
      return;
    }

    if (currencyError) {
      setState(emptyState);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);

    getProductWholesalePrice(resolvedProductId, currency, null, shouldShowRetailPrice)
      .then((response) => {
        if (isActive) {
          setState(response || emptyState);
        }
      })
      .catch(() => {
        if (isActive) {
          setState(emptyState);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [resolvedProductId, currency, isCurrencyLoading, currencyError, shouldShowRetailPrice]);

  // Approved wholesalers with a matching rule see the wholesale price; everyone else sees the
  // retail price only when the panel toggle is on, otherwise nothing (Wix's own price stays visible).
  const showsWholesalePrice = state.eligible && state.hasWholesalePrice;
  const displayedPrice = showsWholesalePrice
    ? state.formattedWholesalePrice
    : shouldShowRetailPrice ? state.formattedRetailPrice : undefined;

  return (
    <div
      ref={rootRef}
      className={styles.root}
    >
      {!resolvedProductId ? null : isLoading ? (
        <div className={styles.loaderRow}>
          <AnimatedDotsLoader />
        </div>
      ) : !displayedPrice ? null : (
        <p
          className={`font_8 wixui-rich-text__text ${styles.value}`}
          data-price-type={showsWholesalePrice ? 'wholesale' : 'retail'}
          style={{
            color: resolvedPriceColor || undefined,
            fontFamily: normalizedFontFamily || undefined,
          }}
        >
          {displayedPrice}
        </p>
      )}
    </div>
  );
};

const customElement = reactToWebComponent(
  CustomElement,
  React,
  ReactDOMClient,
  {
    props: {
      productId: 'string',
      priceColor: 'string',
      priceFont: 'string',
      showRetailPrice: 'string',
    },
  }
);

export default customElement;
