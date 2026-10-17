import type { AppInstanceResponse } from '../../utils/appInstance';
import type { ReviewPromptState } from '../../backend/pricing.server';

export const APP_ID = '0415fd4c-b629-4e16-b417-707b9ff48a14';
export const REVIEW_URL = `https://www.wix.com/app-market/add-review/${APP_ID}`;

/** Minimum time on a paid plan before the review prompt is shown. */
export const MIN_PAID_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Start of the paid period. `billing.timeStamp` is the trial start for owners who
 * began on a free trial, so in that case paid time is counted from the trial's end.
 */
export function getPaidSince(appInstance: AppInstanceResponse | null | undefined): number | null {
  const billing = appInstance?.instance?.billing;
  if (!billing) return null;

  const trial = billing.freeTrialInfo;
  if (trial?.status === 'ENDED') {
    const trialEnd = toTime(trial.endDate);
    if (trialEnd !== null) return trialEnd;
  }
  return toTime(billing.timeStamp);
}

export function isEligibleForReviewPrompt(
  appInstance: AppInstanceResponse | null | undefined,
  state: ReviewPromptState | null | undefined,
  now: number = Date.now(),
): boolean {
  const instance = appInstance?.instance;
  if (!instance || instance.isFree !== false || !instance.billing?.packageName) return false;
  if (instance.billing.freeTrialInfo?.status === 'IN_PROGRESS') return false;

  const paidSince = getPaidSince(appInstance);
  if (paidSince === null || now - paidSince < MIN_PAID_DAYS * DAY_MS) return false;

  if (state?.status === 'reviewed' || state?.status === 'dismissed') return false;
  if (state?.status === 'snoozed') {
    const snoozedUntil = toTime(state.snoozedUntil);
    if (snoozedUntil !== null && now < snoozedUntil) return false;
  }

  return true;
}
