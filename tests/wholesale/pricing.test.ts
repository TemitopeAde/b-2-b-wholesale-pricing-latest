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
  members: { getCurrentMember: sdk.member, getMember: sdk.getMember },
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
