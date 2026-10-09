import { beforeEach, describe, expect, it, vi } from "vitest";
import * as pricing from "../../src/backend/pricing.server";
import { COLLECTIONS, ruleMemberIds } from "../../src/backend/wholesale/types";
import { createToolDispatcher } from "../../src/backend/wholesale/dispatcher";
import { wholesaleTools } from "../../src/backend/wholesale/tool-definitions";

const sdk = vi.hoisted(() => ({
  getRule: vi.fn(),
  createRule: vi.fn(),
  deleteRule: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  queryData: vi.fn(),
  queryRules: vi.fn(),
  token: vi.fn(),
  member: vi.fn(),
  getMember: vi.fn(),
  queryMembers: vi.fn(),
  contact: vi.fn(),
  fields: vi.fn(),
  products: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock("@wix/essentials", () => ({
  auth: { elevate: (fn: unknown) => fn, getTokenInfo: sdk.token },
  monitoring: {},
}));
vi.mock("@wix/ecom", () => ({
  discountRules: {
    getDiscountRule: sdk.getRule,
    createDiscountRule: sdk.createRule,
    deleteDiscountRule: sdk.deleteRule,
    queryDiscountRules: sdk.queryRules,
  },
}));
vi.mock("@wix/data", () => ({
  items: { query: sdk.queryData, save: sdk.save, remove: sdk.remove },
}));
vi.mock("@wix/crm", () => ({
  extendedFields: { queryExtendedFields: sdk.fields },
  contacts: { getContact: sdk.contact },
}));
vi.mock("@wix/members", () => ({
  members: { getCurrentMember: sdk.member, getMember: sdk.getMember, queryMembers: sdk.queryMembers },
  customFields: {},
}));
vi.mock("@wix/stores", () => ({
  collections: {},
  products: { getProduct: sdk.products },
  productsV3: {},
  catalogVersioning: { getCatalogVersion: sdk.catalog },
}));
vi.mock("@wix/categories", () => ({ categories: {} }));
vi.mock("@wix/app-management", () => ({
  appInstances: {
    getAppInstance: async () => ({ instance: { isFree: false } }),
  },
  billing: {},
  appPlans: {},
}));

const original = {
  _id: "rule",
  name: "Trade",
  active: true,
  discounts: {
    values: [
      {
        discountType: "PERCENTAGE",
        percentage: 10,
        targetType: "SPECIFIC_ITEMS",
        specificItemsInfo: {
          scopes: [
            {
              _id: "global",
              type: "CATALOG_ITEM",
              catalogItemFilter: { catalogAppId: "stores", catalogItemIds: [] },
            },
          ],
        },
      },
    ],
  },
  trigger: {
    triggerType: "AND",
    and: {
      triggers: [
        {
          triggerType: "CUSTOMER_ELIGIBILITY",
          customerEligibility: {
            individualMembersInfo: { memberIds: ["member"] },
          },
        },
        {
          triggerType: "ITEM_QUANTITY_RANGE",
          itemQuantityRange: { from: 5, to: 20 },
        },
        {
          triggerType: "SUBTOTAL_RANGE",
          subtotalRange: { from: "100", to: "500" },
        },
      ],
    },
  },
};
function builder(items: unknown[], next?: unknown) {
  const result = {
    items,
    hasNext: () => Boolean(next),
    next: vi.fn(async () => next),
  };
  return {
    eq: vi.fn().mockReturnThis(),
    descending: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    isNotEmpty: vi.fn().mockReturnThis(),
    find: vi.fn(async () => result),
  };
}
beforeEach(() => {
  sdk.getRule.mockResolvedValue(original);
  sdk.createRule.mockImplementation(async (rule) => ({
    ...rule,
    _id: `new-${sdk.createRule.mock.calls.length}`,
  }));
  sdk.queryData.mockReturnValue(builder([]));
  sdk.queryRules.mockReturnValue(builder([original]));
  sdk.save.mockImplementation(async (_collection, data) => data);
  sdk.token.mockResolvedValue({
    active: true,
    subjectType: "USER",
    subjectId: "u",
    siteId: "site",
    instanceId: "instance",
  });
  sdk.member.mockResolvedValue({ member: { _id: "session-member" } });
});

describe("reused pricing backend regressions", () => {
  it("looks up the requested ID and preserves legacy group metadata", async () => {
    sdk.queryData.mockReturnValue(
      builder([
        { _id: "requested", offer: "Description || Groups: group-a,group-b" },
      ]),
    );
    sdk.getRule.mockResolvedValue({ ...original, _id: "requested" });
    expect(await pricing.getUnifiedRule("requested")).toMatchObject({
      success: true,
      data: {
        _id: "requested",
        accessGroups: ["group-a", "group-b"],
        description: "Description",
      },
    });
    expect(sdk.getRule).toHaveBeenCalledWith("requested");
  });
  it("uses public pagination for all pricing rules", async () => {
    sdk.queryRules.mockReturnValue(
      builder([original], {
        items: [{ ...original, _id: "second" }],
        hasNext: () => false,
      }),
    );
    expect(
      (await pricing.queryAllRules())._items.map((rule) => rule._id),
    ).toEqual(["rule", "second"]);
  });
  it("preserves quantity/order thresholds when membership changes", async () => {
    await pricing.updateUnifiedRule("rule", { memberIds: ["another"] });
    const created = sdk.createRule.mock.calls[0]?.[0];
    expect(ruleMemberIds(created.trigger)).toEqual(["another"]);
    expect(created.trigger.and.triggers).toContainEqual(
      expect.objectContaining({
        itemQuantityRange: expect.objectContaining({ from: 5, to: 20 }),
      }),
    );
    expect(created.trigger.and.triggers).toContainEqual(
      expect.objectContaining({
        subtotalRange: expect.objectContaining({ from: "100", to: "500" }),
      }),
    );
    expect(sdk.save).toHaveBeenCalledWith(
      COLLECTIONS.rules,
      expect.objectContaining({ _id: "new-1" }),
    );
    expect(sdk.createRule.mock.invocationCallOrder[0]!).toBeLessThan(
      sdk.deleteRule.mock.invocationCallOrder[0]!,
    );
  });
  it("keeps the original when replacement creation fails", async () => {
    sdk.createRule.mockRejectedValueOnce(new Error("API unavailable"));
    await expect(
      pricing.updateUnifiedRule("rule", { memberIds: ["another"] }),
    ).rejects.toThrow("API unavailable");
    expect(sdk.deleteRule).not.toHaveBeenCalled();
  });
  it("keeps every product target and valid SDK scope IDs when membership changes", async () => {
    const targeted = {
      ...original,
      discounts: {
        values: [
          {
            ...original.discounts.values[0],
            specificItemsInfo: {
              scopes: ["product-a", "product-b"].map((id) => ({
                _id: id,
                type: "CATALOG_ITEM",
                catalogItemFilter: {
                  catalogAppId: "stores",
                  catalogItemIds: [id],
                },
              })),
            },
          },
        ],
      },
    };
    sdk.getRule.mockResolvedValue(targeted);
    await pricing.updateUnifiedRule("rule", { memberIds: ["another"] });
    const created = sdk.createRule.mock.calls[0]?.[0];
    expect(
      created.discounts.values[0].specificItemsInfo.scopes.flatMap(
        (scope: any) => scope.catalogItemFilter.catalogItemIds,
      ),
    ).toEqual(["product-a", "product-b"]);
    const scopes = created.trigger.and.triggers.find(
      (trigger: any) => trigger.triggerType === "ITEM_QUANTITY_RANGE",
    ).itemQuantityRange.scopes;
    expect(scopes).toHaveLength(2);
    expect(
      scopes.every(
        (scope: any) => typeof scope._id === "string" && !("id" in scope),
      ),
    ).toBe(true);
  });
  it("rolls back completed replacement batches if a later batch fails", async () => {
    sdk.createRule
      .mockReset()
      .mockResolvedValueOnce({ ...original, _id: "replacement" })
      .mockRejectedValueOnce(new Error("second batch unavailable"));
    await expect(
      pricing.updateUnifiedRule("rule", {
        memberIds: Array.from({ length: 150 }, (_, i) => `member-${i}`),
      }),
    ).rejects.toThrow("second batch unavailable");
    expect(sdk.deleteRule.mock.calls).toEqual([["replacement"]]);
  });
  it("rolls back a rule if its metadata cannot be saved", async () => {
    sdk.save.mockRejectedValueOnce(new Error("metadata unavailable"));
    await expect(
      pricing.createUnifiedRule({
        name: "Trade",
        percentage: 10,
        memberIds: ["member"],
      }),
    ).rejects.toThrow("metadata unavailable");
    expect(sdk.deleteRule.mock.calls).toEqual([["new-1"]]);
  });
  it("identifies records requiring manual cleanup when rollback also fails", async () => {
    sdk.save.mockRejectedValueOnce(new Error("metadata unavailable"));
    sdk.deleteRule.mockRejectedValueOnce(new Error("delete unavailable"));
    await expect(
      pricing.createUnifiedRule({
        name: "Trade",
        percentage: 10,
        memberIds: ["member"],
      }),
    ).rejects.toMatchObject({
      partial: true,
      data: { createdRuleIds: ["new-1"] },
    });
  });
  it("reports saved replacements and incomplete cleanup as JSON partial failures", async () => {
    sdk.deleteRule.mockRejectedValueOnce(new Error("old rule unavailable"));
    const handlers = Object.fromEntries(
      wholesaleTools.map((tool) => [tool.methodName, async () => ({})]),
    );
    handlers["update-rule"] = async () =>
      pricing.updateUnifiedRule("rule", { memberIds: ["another"] });
    const dispatch = createToolDispatcher(handlers, async () => {});
    expect(
      await dispatch("update-rule", {
        ruleId: "rule",
        changes: { memberIds: ["another"] },
      }),
    ).toMatchObject({
      response: {
        success: false,
        partial: true,
        data: { createdRuleIds: ["new-1"], removedRuleIds: [] },
      },
    });
    expect(sdk.deleteRule.mock.calls).toEqual([["rule"]]);
  });
  it("rejects invalid discounts before mutating any pricing rules", async () => {
    await expect(
      pricing.updateUnifiedRule("rule", {
        discountType: "percentage",
        discountValue: 101,
      }),
    ).rejects.toThrow("range");
    expect(sdk.createRule).not.toHaveBeenCalled();
    expect(sdk.deleteRule).not.toHaveBeenCalled();
  });
  it("deactivates pricing when its last eligible member is removed", async () => {
    await pricing.updateUnifiedRule("rule", { memberIds: [] });
    expect(sdk.createRule.mock.calls[0]?.[0]).toMatchObject({ active: false });
  });
  it("treats a split rule as one logical rule and replaces each old batch once", async () => {
    const first = {
      ...original,
      _id: "first",
      trigger: {
        triggerType: "CUSTOMER_ELIGIBILITY",
        customerEligibility: { individualMembersInfo: { memberIds: ["m1"] } },
      },
    };
    const second = {
      ...first,
      _id: "second",
      trigger: {
        triggerType: "CUSTOMER_ELIGIBILITY",
        customerEligibility: { individualMembersInfo: { memberIds: ["m2"] } },
      },
    };
    sdk.queryData.mockReturnValue(
      builder([
        { ...first, accessGroups: ["g"], ruleFamilyId: "family" },
        { ...second, accessGroups: ["g"], ruleFamilyId: "family" },
      ]),
    );
    sdk.queryRules.mockReturnValue(builder([first, second]));
    sdk.getRule.mockResolvedValue(first);
    const rules = (await pricing.queryAllRules())._items;
    expect(rules).toHaveLength(1);
    expect(ruleMemberIds(rules[0].trigger)).toEqual(["m1", "m2"]);
    const ids = Array.from({ length: 150 }, (_, index) => `m${index}`);
    await pricing.updateUnifiedRule("first", { memberIds: ids });
    expect(sdk.createRule).toHaveBeenCalledTimes(2);
    expect(sdk.deleteRule.mock.calls).toEqual([["first"], ["second"]]);
    expect(
      sdk.save.mock.calls.every(([, value]) => value.ruleFamilyId === "family"),
    ).toBe(true);
  });
  it("preserves settings record ID and email templates on save and reset", async () => {
    const current = {
      _id: "config",
      notificationSettings: { approvalEmails: false },
      emailTemplates: {
        approval: { subject: "Approved", bodyText: "Welcome" },
      },
    };
    sdk.queryData.mockReturnValue(builder([current]));
    await pricing.saveConfiguration({
      notificationSettings: { rejectionEmails: false },
    });
    expect(sdk.save).toHaveBeenLastCalledWith(
      COLLECTIONS.configuration,
      expect.objectContaining({
        _id: "config",
        emailTemplates: current.emailTemplates,
        notificationSettings: expect.objectContaining({
          approvalEmails: false,
          rejectionEmails: false,
        }),
      }),
      expect.anything(),
    );
    await pricing.resetConfigurationToDefaults();
    expect(sdk.save).toHaveBeenLastCalledWith(
      COLLECTIONS.configuration,
      expect.objectContaining({
        _id: "config",
        emailTemplates: current.emailTemplates,
        notificationSettings: expect.objectContaining({ approvalEmails: true }),
      }),
      expect.anything(),
    );
  });
  it("blocks member-price overrides from visitor tokens and uses the identified member for collaborators", async () => {
    sdk.token.mockResolvedValue({
      active: true,
      subjectType: "VISITOR",
      subjectId: "visitor",
      siteId: "site",
      instanceId: "instance",
    });
    expect(
      await pricing.getProductWholesalePrice("product", "USD", "requested"),
    ).toMatchObject({
      eligible: false,
      hasWholesalePrice: false,
      reason: expect.stringContaining("collaborator"),
    });
    expect(sdk.getMember).not.toHaveBeenCalled();
    sdk.token.mockResolvedValue({
      active: true,
      subjectType: "USER",
      subjectId: "u",
      siteId: "site",
      instanceId: "instance",
    });
    sdk.getMember.mockResolvedValue({ _id: "requested", contactId: "contact" });
    sdk.contact.mockResolvedValue({
      info: { extendedFields: { items: { "custom.customer": "" } } },
    });
    sdk.fields.mockReturnValue(
      builder([{ key: "custom.customer", displayName: "customer" }]),
    );
    await pricing.getProductWholesalePrice("product", "USD", "requested");
    expect(sdk.getMember).toHaveBeenCalledWith("requested", expect.anything());
    expect(sdk.member).not.toHaveBeenCalled();
  });
});

describe("wholesale gate on discount rules", () => {
  const gate = {
    triggerType: "CUSTOM",
    customTrigger: { _id: "wholesale-pricing", appId: "0415fd4c-b629-4e16-b417-707b9ff48a14" },
  };
  const flatten = (trigger: any): any[] =>
    trigger?.triggerType === "AND" ? trigger.and.triggers.flatMap(flatten) : [trigger];
  const created = () => sdk.createRule.mock.calls.map(([rule]) => rule);
  const types = (rule: any) => flatten(rule.trigger).map((trigger) => trigger.triggerType).sort();
  const base = { name: "Trade", type: "global" as const, discountType: "percentage" as const, discountValue: 10 };

  beforeEach(() => sdk.createRule.mockClear());

  it("gates a global rule with no thresholds", async () => {
    await pricing.createUnifiedRule(base);
    expect(created()[0].trigger).toEqual(gate);
  });

  it.each([
    ["minimum quantity", { minimumQuantity: 5 }, ["CUSTOM", "ITEM_QUANTITY_RANGE"]],
    ["minimum order", { minimumOrder: 100 }, ["CUSTOM", "SUBTOTAL_RANGE"]],
    ["members", { memberIds: ["member"] }, ["CUSTOM", "CUSTOMER_ELIGIBILITY"]],
  ])("ANDs the gate with a %s trigger", async (_label, extra, expected) => {
    await pricing.createUnifiedRule({ ...base, ...extra });
    expect(types(created()[0])).toEqual(expected);
    expect(flatten(created()[0].trigger)).toContainEqual(gate);
  });

  it("gates every bulk CSV rule", async () => {
    await pricing.createBulkCsvRules({
      ...base,
      bulkCsvItems: [
        { sku: "a", productId: "p1", price: 5, quantity: 10 },
        { sku: "b", productId: "p2", price: 7, quantity: 20 },
      ],
    } as any);
    expect(created()).toHaveLength(2);
    for (const rule of created()) expect(flatten(rule.trigger)).toContainEqual(gate);
  });

  it("keeps the gate when an update removes every member", async () => {
    await pricing.updateUnifiedRule("rule", { memberIds: [] });
    const [rule] = created();
    expect(types(rule)).toEqual(["CUSTOM", "ITEM_QUANTITY_RANGE", "SUBTOTAL_RANGE"]);
    expect(rule.active).toBe(false);
  });

  it("appends members to an AND rule without dropping its thresholds or the gate", async () => {
    const result = await pricing.appendMembersToDiscountRule("rule", ["other"]);
    const [rule] = created();
    expect(types(rule)).toEqual(["CUSTOM", "CUSTOMER_ELIGIBILITY", "ITEM_QUANTITY_RANGE", "SUBTOTAL_RANGE"]);
    expect(flatten(rule.trigger).find((t) => t.triggerType === "CUSTOMER_ELIGIBILITY")
      .customerEligibility.individualMembersInfo.memberIds).toEqual(["member", "other"]);
    expect(result).toMatchObject({ previousCount: 1, newCount: 2, addedCount: 1 });
  });

  it("never leaves a rule ungated after removing its last member", async () => {
    await pricing.removeMembersFromDiscountRule("rule", ["member"]);
    expect(flatten(created()[0].trigger)).toContainEqual(gate);
  });

  it("repairs only app-owned rules that are missing the gate", async () => {
    const foreign = { ...original, _id: "merchant-promo" };
    const gated = { ...original, _id: "gated", trigger: gate };
    sdk.queryRules.mockReturnValue(builder([original, foreign, gated]));
    sdk.queryData.mockImplementation((collection: string) =>
      builder(collection.endsWith("/UpdatedRules") ? [{ _id: "rule" }, { _id: "gated" }] : []),
    );
    sdk.deleteRule.mockClear();

    expect(await pricing.repairWholesaleRuleGates()).toEqual({ success: true, repaired: 1, failed: [] });
    expect(created()).toHaveLength(1);
    expect(flatten(created()[0].trigger)).toContainEqual(gate);
    expect(sdk.deleteRule).toHaveBeenCalledWith("rule");
    expect(sdk.deleteRule).not.toHaveBeenCalledWith("merchant-promo");
  });
});

describe("revoking wholesale access removes the member from pricing rules", () => {
  const flatten = (trigger: any): any[] =>
    trigger?.triggerType === "AND" ? trigger.and.triggers.flatMap(flatten) : [trigger];
  const ruleMembers = (rule: any) =>
    flatten(rule.trigger).find((t) => t.triggerType === "CUSTOMER_ELIGIBILITY")
      ?.customerEligibility.individualMembersInfo.memberIds ?? [];
  const withMembers = (id: string, memberIds: string[]) => ({
    ...original,
    _id: id,
    name: `Rule ${id}`,
    trigger: {
      triggerType: "AND",
      and: {
        triggers: [
          { triggerType: "CUSTOMER_ELIGIBILITY", customerEligibility: { individualMembersInfo: { memberIds } } },
          { triggerType: "ITEM_QUANTITY_RANGE", itemQuantityRange: { from: 5, to: 20 } },
        ],
      },
    },
  });
  const created = () => sdk.createRule.mock.calls.map(([rule]) => rule);

  beforeEach(() => {
    sdk.createRule.mockClear();
    sdk.deleteRule.mockReset();
    sdk.queryMembers.mockReset();
  });

  it("removes a revoked member from the rule and deletes the old rule", async () => {
    const result = await pricing.revokeWholesaleAccess("member");
    expect(result).toMatchObject({ success: true, rulesUpdated: 1 });
    expect(created()).toHaveLength(1);
    expect(ruleMembers(created()[0])).not.toContain("member");
    expect(created()[0].active).toBe(false);
    expect(sdk.deleteRule).toHaveBeenCalledWith("rule");
  });

  it("resolves the member from the contact when no member ID is passed", async () => {
    sdk.queryMembers.mockResolvedValue({ members: [{ _id: "member" }] });
    const result = await pricing.revokeWholesaleAccess(undefined, "contact");
    expect(sdk.queryMembers).toHaveBeenCalledWith(
      expect.objectContaining({ filter: { contactId: { $eq: "contact" } } }),
      expect.anything(),
    );
    expect(result).toMatchObject({ success: true, memberId: "member", rulesUpdated: 1 });
    expect(ruleMembers(created()[0])).not.toContain("member");
  });

  it("keeps other members, thresholds and the wholesale gate", async () => {
    const rule = withMembers("shared", ["member", "other"]);
    sdk.queryRules.mockReturnValue(builder([rule]));
    sdk.getRule.mockResolvedValue(rule);
    await pricing.revokeWholesaleAccess("member");
    const [replacement] = created();
    expect(ruleMembers(replacement)).toEqual(["other"]);
    expect(replacement.active).toBe(true);
    expect(flatten(replacement.trigger).map((t) => t.triggerType).sort())
      .toEqual(["CUSTOM", "CUSTOMER_ELIGIBILITY", "ITEM_QUANTITY_RANGE"]);
  });

  it("still cleans the remaining rules when one fails, and reports the failure", async () => {
    const first = withMembers("first", ["member", "other"]);
    const second = withMembers("second", ["member", "other"]);
    sdk.queryRules.mockReturnValue(builder([first, second]));
    sdk.getRule.mockImplementation(async (id: string) => (id === "first" ? first : second));
    sdk.createRule
      .mockRejectedValueOnce(new Error("Wix rejected the rule"))
      .mockImplementation(async (rule) => ({ ...rule, _id: `new-${sdk.createRule.mock.calls.length}` }));

    const result = await pricing.revokeWholesaleAccess("member");
    expect(sdk.createRule).toHaveBeenCalledTimes(2);
    expect(ruleMembers(created()[1])).toEqual(["other"]);
    expect(sdk.deleteRule).toHaveBeenCalledWith("second");
    expect(sdk.deleteRule).not.toHaveBeenCalledWith("first");
    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain('"Rule first"');
  });
});

describe("merging rules the dashboard split into separate families", () => {
  const ids = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
  const piece = (id: string, memberIds: string[], createdAt: string) => ({
    ...original,
    _id: id,
    name: "Wholesale 1",
    _createdDate: new Date(createdAt),
    trigger: {
      triggerType: "AND",
      and: {
        triggers: [
          { triggerType: "CUSTOMER_ELIGIBILITY", customerEligibility: { individualMembersInfo: { memberIds } } },
          { triggerType: "CUSTOM", customTrigger: { _id: "wholesale-pricing", appId: "0415fd4c-b629-4e16-b417-707b9ff48a14" } },
        ],
      },
    },
  });
  const mirrorsFor = (rules: any[], extra: any[] = []) => {
    sdk.queryRules.mockReturnValue(builder([...rules, ...extra]));
    sdk.queryData.mockImplementation((collection: string) =>
      builder(collection.endsWith("/UpdatedRules")
        ? rules.map((rule) => ({ _id: rule._id, ruleFamilyId: `family-${rule._id}` }))
        : []),
    );
  };
  const savedFamilies = () =>
    sdk.save.mock.calls
      .filter(([collection]) => String(collection).endsWith("/UpdatedRules"))
      .map(([, data]) => [data._id, data.ruleFamilyId]);

  beforeEach(() => sdk.save.mockClear());

  it("puts the 100-member pieces of one rule into a single family", async () => {
    const pieces = [
      piece("a", ids("a", 100), "2026-10-09T18:50:39Z"),
      piece("b", ids("b", 100), "2026-10-09T18:50:42Z"),
      piece("c", ids("c", 40), "2026-10-09T18:50:45Z"),
    ];
    mirrorsFor(pieces, [piece("merchant-promo", ids("m", 100), "2026-10-09T18:50:40Z")]);

    expect(await pricing.mergeSplitRuleFamilies()).toEqual({ success: true, merged: 1 });
    expect(savedFamilies()).toEqual([["b", "family-a"], ["c", "family-a"]]);
    expect(sdk.createRule).not.toHaveBeenCalled();
    expect(sdk.deleteRule).not.toHaveBeenCalled();
  });

  it("leaves look-alike rules alone when they are not full 100-member pieces", async () => {
    mirrorsFor([
      piece("x", ids("x", 30), "2026-10-09T18:50:39Z"),
      piece("y", ids("y", 40), "2026-10-09T18:50:42Z"),
    ]);
    expect(await pricing.mergeSplitRuleFamilies()).toEqual({ success: true, merged: 0 });
    expect(savedFamilies()).toEqual([]);
  });

  it("leaves look-alike rules alone when they were created far apart", async () => {
    mirrorsFor([
      piece("x", ids("x", 100), "2026-10-01T10:00:00Z"),
      piece("y", ids("y", 100), "2026-10-09T10:00:00Z"),
    ]);
    expect(await pricing.mergeSplitRuleFamilies()).toEqual({ success: true, merged: 0 });
  });
});

describe("member changes on a split rule rewrite only the affected pieces", () => {
  const ids = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
  const flatten = (trigger: any): any[] =>
    trigger?.triggerType === "AND" ? trigger.and.triggers.flatMap(flatten) : [trigger];
  const membersOf = (rule: any) =>
    flatten(rule.trigger).find((t) => t.triggerType === "CUSTOMER_ELIGIBILITY")
      ?.customerEligibility.individualMembersInfo.memberIds ?? [];
  const piece = (id: string, memberIds: string[], second: number) => ({
    ...original,
    _id: id,
    name: "Wholesale 1",
    _createdDate: new Date(Date.UTC(2026, 9, 9, 18, 50, second)),
    trigger: {
      triggerType: "AND",
      and: {
        triggers: [
          { triggerType: "CUSTOMER_ELIGIBILITY", customerEligibility: { individualMembersInfo: { memberIds } } },
          { triggerType: "CUSTOM", customTrigger: { _id: "wholesale-pricing", appId: "0415fd4c-b629-4e16-b417-707b9ff48a14" } },
        ],
      },
    },
  });
  const family = (pieces: any[]) => {
    sdk.queryRules.mockReturnValue(builder(pieces));
    sdk.queryData.mockImplementation((collection: string) =>
      builder(collection.endsWith("/UpdatedRules")
        ? pieces.map((p) => ({ _id: p._id, ruleFamilyId: "family-1" }))
        : []),
    );
  };
  const created = () => sdk.createRule.mock.calls.map(([rule]) => rule);
  const familyOfSaves = () =>
    sdk.save.mock.calls.filter(([c]) => String(c).endsWith("/UpdatedRules")).map(([, d]) => d.ruleFamilyId);

  beforeEach(() => {
    sdk.createRule.mockClear();
    sdk.deleteRule.mockReset();
    sdk.save.mockClear();
  });

  it("revoking rewrites only the piece that lists the member", async () => {
    family([piece("a", ids("a", 100), 39), piece("b", ids("b", 100), 42), piece("c", ids("c", 40), 45)]);
    const result = await pricing.revokeWholesaleAccess("b-7");
    expect(result).toMatchObject({ success: true, rulesUpdated: 1 });
    expect(created()).toHaveLength(1);
    expect(membersOf(created()[0])).toHaveLength(99);
    expect(membersOf(created()[0])).not.toContain("b-7");
    expect(sdk.deleteRule.mock.calls.map(([id]) => id)).toEqual(["b"]);
    expect(familyOfSaves()).toEqual(["family-1"]);
  });

  it("adding a member fills a piece with room instead of rewriting the rule", async () => {
    family([piece("a", ids("a", 100), 39), piece("c", ids("c", 40), 45)]);
    await pricing.setRuleFamilyMembers("a", [...ids("a", 100), ...ids("c", 40), "new"]);
    expect(created()).toHaveLength(1);
    expect(membersOf(created()[0])).toEqual([...ids("c", 40), "new"]);
    expect(sdk.deleteRule.mock.calls.map(([id]) => id)).toEqual(["c"]);
  });

  it("opens a new piece in the same family when every piece is full", async () => {
    family([piece("a", ids("a", 100), 39)]);
    await pricing.setRuleFamilyMembers("a", [...ids("a", 100), "new"]);
    expect(created()).toHaveLength(1);
    expect(membersOf(created()[0])).toEqual(["new"]);
    expect(sdk.deleteRule).not.toHaveBeenCalled();
    expect(familyOfSaves()).toEqual(["family-1"]);
  });

  it("deletes a piece whose last member leaves while other pieces still have members", async () => {
    family([piece("a", ids("a", 100), 39), piece("c", ["only"], 45)]);
    await pricing.revokeWholesaleAccess("only");
    expect(sdk.createRule).not.toHaveBeenCalled();
    expect(sdk.deleteRule.mock.calls.map(([id]) => id)).toEqual(["c"]);
  });
});
