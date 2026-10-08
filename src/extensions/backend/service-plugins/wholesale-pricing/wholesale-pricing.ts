import { customTriggers } from "@wix/ecom/service-plugins";
import { isMemberWholesaleApproved } from "../../../../backend/wholesale/approval.server";
import { getMemberAccessGroups } from "../../../../backend/wholesale/access-groups.server";
import { type RecordData } from "../../../../backend/wholesale/types";

// Discount rules reference this trigger by appId + id (see UsePriceRules.tsx), so keep the id stable.
const WHOLESALE_TRIGGER_ID = "wholesale-pricing";

function limit(value: unknown, parse: (raw: string) => number): number | undefined {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (!raw) return undefined;
  const number = parse(raw);
  return Number.isFinite(number) ? number : undefined;
}

const money = (raw: string) => parseFloat(raw.replace(/[^0-9.]/g, ""));
const count = (raw: string) => parseInt(raw, 10);

// Check if an access group's order criteria are met
function meetsGroupRequirements(
  group: RecordData,
  totalOrderValue: number,
  totalProductQuantity: number,
): boolean {
  const minOrder = limit(group["minOrder"], money);
  const maxOrder = limit(group["maxOrder"], money);
  const minProducts = limit(group["minProducts"], count);
  const maxProducts = limit(group["maxProducts"], count);

  if (minOrder !== undefined && totalOrderValue < minOrder) return false;
  if (maxOrder !== undefined && totalOrderValue > maxOrder) return false;
  if (minProducts !== undefined && totalProductQuantity < minProducts) return false;
  if (maxProducts !== undefined && totalProductQuantity > maxProducts) return false;
  return true;
}

customTriggers.provideHandlers({
  listTriggers: async () => {
    return {
      customTriggers: [{ _id: WHOLESALE_TRIGGER_ID, name: "B2B Wholesale Pricing" }],
    };
  },

  getEligibleTriggers: async ({ request, metadata }) => {
    const memberId = metadata.identity?.memberId;

    try {
      // Guests never get wholesale pricing.
      if (!memberId) {
        return { eligibleTriggers: [] };
      }

      // Same approval check the product page uses: contact field customer === "wholesale".
      // Access-group membership alone is not enough (revoked/pending members can still be listed).
      if (!(await isMemberWholesaleApproved(memberId))) {
        console.log(`[wholesale-trigger] member ${memberId} is not approved - no triggers eligible`);
        return { eligibleTriggers: [] };
      }

      const customerGroups = await getMemberAccessGroups(memberId);
      if (customerGroups.length === 0) {
        console.log(`[wholesale-trigger] member ${memberId} has no access groups - no triggers eligible`);
        return { eligibleTriggers: [] };
      }

      const lineItems = request.lineItems ?? [];
      const totalOrderValue = lineItems.reduce(
        (total, item) => total + (Number(item.price) || 0) * (item.quantity ?? 0),
        0,
      );
      const totalProductQuantity = lineItems.reduce(
        (total, item) => total + (item.quantity ?? 0),
        0,
      );

      const meetsAnyGroup = customerGroups.some((group) =>
        meetsGroupRequirements(group, totalOrderValue, totalProductQuantity),
      );
      if (!meetsAnyGroup) {
        console.log(`[wholesale-trigger] member ${memberId} order does not meet any access group requirements`);
        return { eligibleTriggers: [] };
      }

      // Echo each requested occurrence's identifier back exactly, or Wix can't match it to its rule.
      const eligibleTriggers = (request.triggers ?? [])
        .filter((trigger) => trigger.customTrigger?._id === WHOLESALE_TRIGGER_ID)
        .map((trigger) => ({
          customTriggerId: WHOLESALE_TRIGGER_ID,
          identifier: trigger.identifier,
        }));

      console.log(`[wholesale-trigger] member ${memberId} approved - ${eligibleTriggers.length} trigger(s) eligible`);
      return { eligibleTriggers };
    } catch (error) {
      // Fail closed: never grant wholesale pricing when eligibility can't be confirmed.
      console.error("[wholesale-trigger] getEligibleTriggers failed", error);
      return { eligibleTriggers: [] };
    }
  },
});
