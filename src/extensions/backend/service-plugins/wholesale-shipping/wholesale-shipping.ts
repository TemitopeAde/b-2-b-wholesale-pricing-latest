import { shippingRates } from "@wix/ecom/service-plugins";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { isMemberWholesaleApproved } from "../../../../backend/wholesale/approval.server";
import { getMemberAccessGroups } from "../../../../backend/wholesale/access-groups.server";
import { selectShippingQuote } from "../../../../backend/wholesale/shipping";
import { COLLECTIONS, record, text, type RecordData } from "../../../../backend/wholesale/types";

const queryItems = auth.elevate(items.query);

async function listShippingRules(): Promise<RecordData[]> {
  let result = await queryItems(COLLECTIONS.shippingRules).limit(100).find();
  const rules: RecordData[] = result.items.map(record);
  while (result.hasNext()) {
    result = await result.next();
    rules.push(...result.items.map(record));
  }
  return rules;
}

shippingRates.provideHandlers({
  getShippingRates: async ({ request, metadata }) => {
    const memberId = metadata.identity?.memberId;

    // Approval is re-read on every call, so a revoked customer loses wholesale shipping immediately.
    const isWholesale = memberId ? await isMemberWholesaleApproved(memberId) : false;
    const groupIds = isWholesale && memberId
      ? (await getMemberAccessGroups(memberId)).map((group) => text(group["_id"]))
      : [];

    const subtotal = (request.lineItems ?? [])
      .filter((item) => item.physicalProperties?.shippable !== false)
      .reduce((total, item) => {
        const lineTotal = Number(item.totalPrice);
        return total + (Number.isFinite(lineTotal) ? lineTotal : (Number(item.price) || 0) * (item.quantity ?? 0));
      }, 0);

    const quote = selectShippingQuote(await listShippingRules(), { isWholesale, groupIds }, subtotal);
    if (!quote) return { shippingRates: [] };

    return {
      shippingRates: [
        {
          code: `wholesale-shipping-${quote.ruleId}`,
          title: quote.title,
          logistics: {},
          cost: {
            price: String(Number(quote.price.toFixed(2))),
            currency: metadata.currency ?? undefined,
          },
        },
      ],
    };
  },
});
