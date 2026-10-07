import { useEffect, useState } from 'react';
import { site } from '@wix/site-site';
import { getCachedAppInstance } from './appInstance';

export type CurrencyState = {
  currency: string | null;
  isLoading: boolean;
  error: Error | null;
};

let currencyPromise: Promise<string> | null = null;

function normalizeCurrencyCode(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Wix site currency is unavailable.');
  }

  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Wix site returned an invalid currency code.');
  }

  return currency;
}

export function getSiteCurrency(): Promise<string> {
  if (!currencyPromise) {
    currencyPromise = site.currency()
      .then(normalizeCurrencyCode)
      .catch(async (siteCurrencyError) => {
        try {
          const appInstance = await getCachedAppInstance();
          return normalizeCurrencyCode(appInstance?.site?.paymentCurrency);
        } catch (fallbackError) {
          currencyPromise = null;
          const primaryMessage = siteCurrencyError instanceof Error
            ? siteCurrencyError.message
            : String(siteCurrencyError);
          const fallbackMessage = fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError);
          throw new Error(
            `Unable to resolve site currency from Wix Site SDK or app instance fallback. ${primaryMessage}; ${fallbackMessage}`
          );
        }
      });
  }

  return currencyPromise;
}

export function useSiteCurrency(): CurrencyState {
  const [state, setState] = useState<CurrencyState>({
    currency: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    getSiteCurrency()
      .then((currency) => {
        if (active) setState({ currency, isLoading: false, error: null });
      })
      .catch((error) => {
        if (active) {
          setState({
            currency: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/** Narrow symbol for a currency code (USD → "$", EUR → "€", NGN → "₦"); the code itself if unknown. */
export function currencySymbol(currency: string | null | undefined): string {
  if (!currency) return '';
  try {
    const part = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find(p => p.type === 'currency');
    return part?.value || currency;
  } catch {
    return currency;
  }
}
