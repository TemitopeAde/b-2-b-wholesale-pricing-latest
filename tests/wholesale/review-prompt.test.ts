import { describe, expect, it } from "vitest";
import { isEligibleForReviewPrompt, MIN_PAID_DAYS } from "../../src/components/ReviewPrompt/ReviewPromptUtils";
import type { AppInstanceResponse } from "../../src/utils/appInstance";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-17T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW - days * DAY).toISOString();

const paidInstance = (billing: NonNullable<NonNullable<AppInstanceResponse["instance"]>["billing"]>, isFree = false): AppInstanceResponse => ({
  instance: { instanceId: "inst-1", isFree, billing: { packageName: "pro", ...billing } },
});

describe("isEligibleForReviewPrompt", () => {
  it("rejects free instances and missing data", () => {
    expect(isEligibleForReviewPrompt(null, null, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt({ instance: { isFree: true } }, null, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(paidInstance({ timeStamp: daysAgo(60) }, true), null, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(paidInstance({ packageName: "", timeStamp: daysAgo(60) }), null, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(paidInstance({}), null, NOW)).toBe(false);
  });

  it("requires more than three weeks on a paid plan", () => {
    expect(isEligibleForReviewPrompt(paidInstance({ timeStamp: daysAgo(20) }), null, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(paidInstance({ timeStamp: daysAgo(MIN_PAID_DAYS) }), null, NOW)).toBe(true);
    expect(isEligibleForReviewPrompt(paidInstance({ timeStamp: daysAgo(22) }), null, NOW)).toBe(true);
  });

  it("excludes owners still on a free trial", () => {
    const billing = { timeStamp: daysAgo(30), freeTrialInfo: { status: "IN_PROGRESS" } };
    expect(isEligibleForReviewPrompt(paidInstance(billing), null, NOW)).toBe(false);
  });

  it("counts paid time from the end of an ended trial", () => {
    const recent = { timeStamp: daysAgo(24), freeTrialInfo: { status: "ENDED", endDate: daysAgo(10) } };
    expect(isEligibleForReviewPrompt(paidInstance(recent), null, NOW)).toBe(false);

    const longAgo = { timeStamp: daysAgo(40), freeTrialInfo: { status: "ENDED", endDate: daysAgo(26) } };
    expect(isEligibleForReviewPrompt(paidInstance(longAgo), null, NOW)).toBe(true);
  });

  it("respects the saved prompt state", () => {
    const instance = paidInstance({ timeStamp: daysAgo(60) });
    expect(isEligibleForReviewPrompt(instance, { status: "reviewed" }, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(instance, { status: "dismissed" }, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(instance, { status: "snoozed", snoozedUntil: daysAgo(-3) }, NOW)).toBe(false);
    expect(isEligibleForReviewPrompt(instance, { status: "snoozed", snoozedUntil: daysAgo(1) }, NOW)).toBe(true);
  });
});
