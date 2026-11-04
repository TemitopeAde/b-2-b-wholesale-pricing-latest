import { record, strings, text, type RecordData } from "./types";

export interface ShippingQuote {
  ruleId: string;
  title: string;
  price: number;
}

export interface WeightBand {
  minWeight: number;
  maxWeight?: number;
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

/** A missing shipping weight counts as 0, matching Wix Stores rate-by-weight. */
export function totalShippableWeight(
  lineItems: ReadonlyArray<{
    quantity?: number | null;
    physicalProperties?: { weight?: number | null; shippable?: boolean | null } | null;
  }>,
): number {
  return lineItems.reduce((total, item) => {
    if (item.physicalProperties?.shippable === false) return total;
    const weight = Number(item.physicalProperties?.weight);
    const quantity = Number(item.quantity);
    const unit = Number.isFinite(weight) && weight > 0 ? weight : 0;
    const count = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    return total + unit * count;
  }, 0);
}

export function parseWeightBands(value: unknown): WeightBand[] {
  let raw = value;
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const band = entry as Record<string, unknown>;
    const minWeight = amount(band["minWeight"]);
    const price = amount(band["price"]);
    if (minWeight === undefined || price === undefined) return [];
    const maxRaw = band["maxWeight"];
    if (maxRaw === undefined || maxRaw === null || maxRaw === "") {
      return [{ minWeight, price }];
    }
    const maxWeight = amount(maxRaw);
    if (maxWeight === undefined) return [];
    return [{ minWeight, maxWeight, price }];
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function priceWeightBands(bands: WeightBand[], totalWeight: number): number | undefined {
  const match = bands.find(
    (band) =>
      totalWeight >= band.minWeight &&
      (band.maxWeight === undefined || totalWeight < band.maxWeight),
  );
  return match?.price;
}

/** Price one rule for this subtotal and weight, or undefined when the rule offers no rate. */
function priceRule(rule: RecordData, subtotal: number, totalWeight: number): number | undefined {
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
    case "weight_rate": {
      const rate = amount(rule["shippingRate"]);
      if (rate === undefined) return undefined;
      return roundMoney(rate * totalWeight);
    }
    case "weight_bands":
      return priceWeightBands(parseWeightBands(rule["weightBands"]), totalWeight);
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
  totalWeight = 0,
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
    const price = priceRule(rule, subtotal, totalWeight);
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
