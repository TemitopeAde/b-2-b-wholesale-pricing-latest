import { useEffect, useState } from 'react';
import { dashboard } from '@wix/dashboard';
import { getAppInstance } from '../backend/pricing.client';

export type AppInstanceResponse = {
  instance?: {
    instanceId?: string;
    isFree?: boolean;
    freeTrialAvailable?: boolean;
    billing?: {
      packageName?: string;
    };
  };
  site?: {
    siteId?: string;
    siteDisplayName?: string;
    paymentCurrency?: string;
    ownerInfo?: {
      email?: string;
    };
  };
};

export type AppInstanceState = {
  appInstance: AppInstanceResponse | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
};

let appInstancePromise: Promise<AppInstanceResponse> | null = null;
let lastFailureToastAt = 0;

function normalizeError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(message.replace(/https?:\/\/\S+/g, '[url]'));
}

function notifyFailure(error: Error): void {
  const now = Date.now();
  if (now - lastFailureToastAt < 5000) return;
  lastFailureToastAt = now;
  // Also reached from site plugins (currency fallback), where the dashboard SDK is unavailable.
  try {
    dashboard.showToast({
      message: 'Unable to load app billing information. Please retry.',
      type: 'error',
      timeout: 'normal',
    });
  } catch {
    // Not running in the dashboard.
  }
  console.error(`[AppInstance] frontend load failed | message=${error.message} | retryAvailable=true`);
}

export function getCachedAppInstance(): Promise<AppInstanceResponse> {
  if (!appInstancePromise) {
    appInstancePromise = getAppInstance()
      .then((response) => {
        if (!response || typeof response !== 'object') {
          throw new Error('App instance response was empty.');
        }
        return response as AppInstanceResponse;
      })
      .catch((error) => {
        appInstancePromise = null;
        const normalizedError = normalizeError(error);
        notifyFailure(normalizedError);
        throw normalizedError;
      });
  }

  return appInstancePromise;
}

export function useAppInstance(): AppInstanceState {
  const [state, setState] = useState<Omit<AppInstanceState, 'retry'>>({
    appInstance: null,
    isLoading: true,
    error: null,
  });

  const load = () => {
    setState({ appInstance: null, isLoading: true, error: null });
    getCachedAppInstance()
      .then((appInstance) => setState({ appInstance, isLoading: false, error: null }))
      .catch((error) => setState({ appInstance: null, isLoading: false, error: normalizeError(error) }));
  };

  useEffect(() => {
    load();
  }, []);

  return { ...state, retry: load };
}
