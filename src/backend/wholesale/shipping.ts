import { record, strings, text, type RecordData } from "./types";

export interface ShippingQuote {
  ruleId: string;
  title: string;
  price: number;
}

const amount = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

function isActiveNow(rule: RecordData, now: Date): boolean {
  if (rule["isActive"] === false) return false;
  const start = rule["startDate"] ? new Date(String(rule["startDate"])) : null;
  const end = rule["endDate"] ? new Date(String(rule["endDate"])) : null;
  if (start && !Number.isNaN(start.getTime()) && start > now) return false;
  if (end && !Number.isNaN(end.getTime()) && end < now) return false;
  return true;
}

/** Price one rule for this subtotal, or undefined when the rule offers no rate for it. */
function priceRule(rule: RecordData, subtotal: number): number | undefined {
  const minimumOrder = amount(rule["minimumOrder"]);
  if (minimumOrder !== undefined && subtotal < minimumOrder) {
    return amount(rule["belowMinimumShippingRate"]);
  }
  switch (rule["shippingType"]) {
    case "flat_rate":
      return amount(rule["shippingRate"]);
    case "threshold": {
      const threshold = amount(rule["freeShippingThreshold"]);
      if (threshold === undefined) return undefined;
      return subtotal >= threshold ? 0 : amount(rule["shippingRate"]);
    }
    default:
      return 0;
  }
}

/**
 * Picks the cheapest shipping rule for a buyer. Wholesale rules apply only while the
 * member is approved (and in one of the rule's access groups, if it names any); B2C
 * rules apply to everyone else. Revoking access therefore drops wholesale shipping
 * on the next cart calculation with no rule edits needed.
 */
export function selectShippingQuote(
  rules: RecordData[],
  buyer: { isWholesale: boolean; groupIds: string[] },
  subtotal: number,
  now = new Date(),
): ShippingQuote | null {
  let best: ShippingQuote | null = null;
  for (const rule of rules.map(record)) {
    if (!isActiveNow(rule, now)) continue;
    const b2cOnly = rule["b2cOnly"] === true;
    if (b2cOnly === buyer.isWholesale) continue;
    const ruleGroups = strings(rule["accessGroups"]);
    if (
      !b2cOnly &&
      ruleGroups.length > 0 &&
      !ruleGroups.some((id) => buyer.groupIds.includes(id))
    )
      continue;
    const price = priceRule(rule, subtotal);
    if (price === undefined) continue;
    if (!best || price < best.price) {
      best = {
        ruleId: text(rule["_id"]),
        title:
          text(rule["name"]) ||
          (price === 0 ? "Free shipping" : "Standard shipping"),
        price,
      };
    }
  }
  return best;
}
