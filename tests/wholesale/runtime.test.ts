import { beforeEach, describe, expect, it, vi } from "vitest";
import { toolHandlers } from "../../src/backend/wholesale/runtime.server";
import { wholesaleTools } from "../../src/backend/wholesale/tool-definitions";
import { POST } from "../../src/pages/api/wholesale/[method]";
import type { APIContext } from "astro";

const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  settings: vi.fn(),
  save: vi.fn(),
  products: vi.fn(),
  skus: vi.fn(),
  bulk: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  price: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
}));
vi.mock("@wix/essentials", () => ({ auth: { getTokenInfo: mocks.token } }));
vi.mock("../../src/backend/pricing.server", () => ({
  getConfiguration: mocks.settings,
  saveConfiguration: mocks.save,
  handleCatalogLogic: mocks.products,
  getProductIdsBySkuData: mocks.skus,
  createBulkCsvRules: mocks.bulk,
  createUnifiedRule: mocks.createRule,
  updateUnifiedRule: mocks.updateRule,
  getProductWholesalePrice: mocks.price,
}));
vi.mock("../../src/backend/wholesale/repository.server", () => ({
  workflowDependencies: { list: mocks.list, get: mocks.get },
}));

beforeEach(() => {
  mocks.token.mockResolvedValue({
    active: true,
    subjectType: "USER",
    subjectId: "collaborator",
    siteId: "site",
    instanceId: "instance",
  });
  mocks.settings.mockResolvedValue({
    _id: "settings",
    notificationSettings: { approvalEmails: false },
    emailTemplates: { approval: { subject: "Welcome" } },
  });
  mocks.save.mockImplementation(async (value) => value);
  mocks.products.mockResolvedValue({
    products: [{ _id: "p", name: "Trade Product" }],
  });
  mocks.skus.mockResolvedValue({ VALID: "product" });
  mocks.bulk.mockResolvedValue({ success: true, createdCount: 1 });
  mocks.createRule.mockResolvedValue({ success: true, data: { _id: "rule" } });
  mocks.updateRule.mockResolvedValue({ success: true, data: { _id: "rule" } });
  mocks.price.mockResolvedValue({
    eligible: false,
    hasWholesalePrice: false,
    reason: "not_approved",
  });
});

describe("registered runtime and protected HTTP boundary", () => {
  it("implements every declared tool exactly once", () => {
    expect(Object.keys(toolHandlers).sort()).toEqual(
      wholesaleTools.map((tool) => tool.methodName).sort(),
    );
  });
  it("honors individual bulk SKU failures and uses one catalog lookup", async () => {
    expect(
      await toolHandlers["import-bulk-pricing"]!({
        name: "Import",
        rows: [
          { sku: "VALID", price: 9, quantity: 5 },
          { sku: "MISSING", price: 7, quantity: 1 },
        ],
      }),
    ).toMatchObject({
      success: false,
      partial: true,
      results: [
        { success: true },
        { success: false, error: expect.stringContaining("SKU") },
      ],
    });
    expect(mocks.skus).toHaveBeenCalledTimes(1);
    expect(mocks.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        minimumQuantity: 5,
        bulkCsvItems: [
          expect.objectContaining({ productId: "product", quantity: 5 }),
        ],
      }),
    );
  });
  it("fetches the product catalog once and paginates", async () => {
    expect(
      await toolHandlers["list-products"]!({ search: "Trade", limit: 1 }),
    ).toMatchObject({ total: 1, items: [{ _id: "p" }], nextOffset: null });
    expect(mocks.products).toHaveBeenCalledTimes(1);
  });
  it("merges settings without losing preferences or templates", async () => {
    expect(
      await toolHandlers["save-settings"]!({
        settings: { notificationSettings: { rejectionEmails: false } },
      }),
    ).toMatchObject({
      notificationSettings: { approvalEmails: false, rejectionEmails: false },
      emailTemplates: { approval: { subject: "Welcome" } },
    });
  });
  it("validates dates and ranges and normalizes fixed amounts", async () => {
    await expect(
      toolHandlers["create-rule"]!({
        rule: { name: "Rule", startDate: "invalid" },
      }),
    ).rejects.toThrow("Invalid startDate");
    await expect(
      toolHandlers["create-rule"]!({
        rule: { name: "Rule", minimumQuantity: 20, maximumQuantity: 10 },
      }),
    ).rejects.toThrow("exceed");
    await toolHandlers["create-rule"]!({
      rule: { name: "Rule", discountType: "fixed_amount", discountValue: 10 },
    });
    expect(mocks.createRule).toHaveBeenCalledWith(
      expect.objectContaining({ fixedAmount: "10" }),
    );
  });
  it("passes the specified member and currency to the existing price backend", async () => {
    await toolHandlers["get-wholesale-price"]!({
      productId: "p",
      memberId: "m",
      currency: "NGN",
    });
    expect(mocks.price).toHaveBeenCalledWith("p", "NGN", "m");
  });
  async function request(method: string, body: unknown) {
    return POST({
      request: new Request(`https://app.example/api/wholesale/${method}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
      params: { method },
    } as unknown as APIContext);
  }
  it("blocks visitor HTTP calls before any elevated workflow", async () => {
    mocks.token.mockResolvedValue({
      active: true,
      subjectType: "VISITOR",
      subjectId: "v",
      siteId: "site",
      instanceId: "instance",
    });
    const response = await request("get-settings", {});
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ success: false });
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it("allows authenticated collaborators and rejects invalid request fields", async () => {
    expect((await request("get-settings", {})).status).toBe(200);
    const response = await request("review-application", {
      applicationId: "a",
      status: "wrong",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: expect.stringContaining("Invalid input"),
    });
  });
});
