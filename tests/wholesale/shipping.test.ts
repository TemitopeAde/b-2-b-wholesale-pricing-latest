import { describe, expect, it } from "vitest";
import { selectShippingQuote } from "../../src/backend/wholesale/shipping";

const wholesale = { isWholesale: true, groupIds: ["g1"] };
const retail = { isWholesale: false, groupIds: [] };

describe("selectShippingQuote", () => {
  const rules = [
    { _id: "w", name: "Wholesale free", shippingType: "free_shipping", b2cOnly: false, minimumOrder: 500, belowMinimumShippingRate: 25 },
    { _id: "b", name: "Retail", shippingType: "flat_rate", shippingRate: 10, b2cOnly: true },
  ];

  it("gives approved wholesalers the wholesale rule", () => {
    expect(selectShippingQuote(rules, wholesale, 600)).toMatchObject({ ruleId: "w", price: 0 });
    expect(selectShippingQuote(rules, wholesale, 100)).toMatchObject({ ruleId: "w", price: 25 });
  });

  it("falls back to the B2C rule once access is revoked", () => {
    expect(selectShippingQuote(rules, retail, 600)).toMatchObject({ ruleId: "b", price: 10 });
  });

  it("skips group-scoped rules the member is no longer in", () => {
    const scoped = [{ _id: "s", shippingType: "free_shipping", accessGroups: ["g2"] }];
    expect(selectShippingQuote(scoped, wholesale, 100)).toBeNull();
    expect(selectShippingQuote(scoped, { isWholesale: true, groupIds: ["g2"] }, 100)).toMatchObject({ ruleId: "s" });
  });

  it("ignores inactive or expired rules and unmet thresholds", () => {
    const now = new Date("2026-10-07T00:00:00Z");
    expect(selectShippingQuote([{ _id: "x", isActive: false }], wholesale, 100, now)).toBeNull();
    expect(selectShippingQuote([{ _id: "x", endDate: "2026-01-01" }], wholesale, 100, now)).toBeNull();
    expect(selectShippingQuote([{ _id: "t", shippingType: "threshold", freeShippingThreshold: 200 }], wholesale, 100, now)).toBeNull();
    expect(selectShippingQuote([{ _id: "m", minimumOrder: 500 }], wholesale, 100, now)).toBeNull();
  });
});
