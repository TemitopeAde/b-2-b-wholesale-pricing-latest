import { describe, expect, it } from "vitest";
import { selectShippingQuote, totalShippableWeight } from "../../src/backend/wholesale/shipping";

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

  it("prices a wholesale order by weight and gives regular customers free shipping", () => {
    const rules = [
      { _id: "w", name: "Wholesale by weight", shippingType: "weight_rate", shippingRate: 2.5, b2cOnly: false },
      { _id: "b", name: "Retail free", shippingType: "free_shipping", b2cOnly: true },
    ];
    expect(selectShippingQuote(rules, wholesale, 100, new Date(), 4)).toMatchObject({ ruleId: "w", price: 10 });
    expect(selectShippingQuote(rules, wholesale, 100, new Date(), 1.5)).toMatchObject({ ruleId: "w", price: 3.75 });
    expect(selectShippingQuote(rules, retail, 100, new Date(), 4)).toMatchObject({ ruleId: "b", price: 0 });
  });

  it("matches a weight band and the open-ended top band", () => {
    const bands = JSON.stringify([
      { minWeight: 0, maxWeight: 5, price: 15 },
      { minWeight: 5, maxWeight: 20, price: 40 },
      { minWeight: 20, price: 75 },
    ]);
    const rule = [{ _id: "bands", shippingType: "weight_bands", weightBands: bands }];
    expect(selectShippingQuote(rule, wholesale, 100, new Date(), 0)).toMatchObject({ price: 15 });
    expect(selectShippingQuote(rule, wholesale, 100, new Date(), 4.99)).toMatchObject({ price: 15 });
    expect(selectShippingQuote(rule, wholesale, 100, new Date(), 5)).toMatchObject({ price: 40 });
    expect(selectShippingQuote(rule, wholesale, 100, new Date(), 20)).toMatchObject({ price: 75 });
    expect(selectShippingQuote(rule, wholesale, 100, new Date(), 80)).toMatchObject({ price: 75 });
  });

  it("offers no band rate when the weight falls in a gap", () => {
    const bands = JSON.stringify([
      { minWeight: 0, maxWeight: 5, price: 15 },
      { minWeight: 10, price: 40 },
    ]);
    expect(selectShippingQuote([{ _id: "gap", shippingType: "weight_bands", weightBands: bands }], wholesale, 100, new Date(), 7)).toBeNull();
  });

  it("counts a missing line weight as 0 and skips items that are not shippable", () => {
    expect(totalShippableWeight([
      { quantity: 2, physicalProperties: { weight: 1.5, shippable: true } },
      { quantity: 4, physicalProperties: { shippable: true } },
      { quantity: 3, physicalProperties: { weight: 10, shippable: false } },
    ])).toBe(3);
  });

  it("ignores inactive or expired rules and unmet thresholds", () => {
    const now = new Date("2026-10-07T00:00:00Z");
    expect(selectShippingQuote([{ _id: "x", isActive: false }], wholesale, 100, now)).toBeNull();
    expect(selectShippingQuote([{ _id: "x", endDate: "2026-01-01" }], wholesale, 100, now)).toBeNull();
    expect(selectShippingQuote([{ _id: "t", shippingType: "threshold", freeShippingThreshold: 200 }], wholesale, 100, now)).toBeNull();
    expect(selectShippingQuote([{ _id: "m", minimumOrder: 500 }], wholesale, 100, now)).toBeNull();
  });
});
