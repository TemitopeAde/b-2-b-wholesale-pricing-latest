import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  handlers: undefined as any,
  approved: vi.fn(),
  groups: vi.fn(),
}));
vi.mock("@wix/ecom/service-plugins", () => ({
  customTriggers: { provideHandlers: (handlers: unknown) => { h.handlers = handlers; } },
}));
vi.mock("../../src/backend/wholesale/approval.server", () => ({
  isMemberWholesaleApproved: h.approved,
}));
vi.mock("../../src/backend/wholesale/access-groups.server", () => ({
  getMemberAccessGroups: h.groups,
}));

await import("../../src/extensions/backend/service-plugins/wholesale-pricing/wholesale-pricing");

const APP_ID = "0415fd4c-b629-4e16-b417-707b9ff48a14";
const wholesale = (identifier: string) => ({ customTrigger: { _id: "wholesale-pricing", appId: APP_ID }, identifier });

function call(memberId: string | undefined, lineItems = [{ price: "75", quantity: 2 }], triggers = [wholesale("a"), wholesale("b")]) {
  return h.handlers.getEligibleTriggers({
    request: { lineItems, triggers },
    metadata: { identity: memberId ? { memberId } : {} },
  });
}

beforeEach(() => {
  h.approved.mockReset().mockResolvedValue(true);
  h.groups.mockReset().mockResolvedValue([]);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("wholesale custom discount trigger", () => {
  it("rejects guests", async () => {
    expect(await call(undefined)).toEqual({ eligibleTriggers: [] });
  });

  it("rejects members who are not approved", async () => {
    h.approved.mockResolvedValue(false);
    expect(await call("m1")).toEqual({ eligibleTriggers: [] });
  });

  it("accepts approved members with no access groups (assigned to the rule directly)", async () => {
    expect(await call("m1")).toEqual({
      eligibleTriggers: [
        { customTriggerId: "wholesale-pricing", identifier: "a" },
        { customTriggerId: "wholesale-pricing", identifier: "b" },
      ],
    });
  });

  it("rejects group members whose order is below the group minimum", async () => {
    h.groups.mockResolvedValue([{ minOrder: "$500" }]);
    expect(await call("m1")).toEqual({ eligibleTriggers: [] });
  });

  it("accepts group members whose order meets the group minimum", async () => {
    h.groups.mockResolvedValue([{ minOrder: "$100", minProducts: "2" }]);
    expect((await call("m1")).eligibleTriggers).toHaveLength(2);
  });

  it("only echoes this app's wholesale trigger", async () => {
    const other = { customTrigger: { _id: "something-else", appId: APP_ID }, identifier: "x" };
    expect(await call("m1", undefined, [other, wholesale("a")])).toEqual({
      eligibleTriggers: [{ customTriggerId: "wholesale-pricing", identifier: "a" }],
    });
  });

  it("fails closed when a lookup throws", async () => {
    h.groups.mockRejectedValue(new Error("boom"));
    expect(await call("m1")).toEqual({ eligibleTriggers: [] });
  });
});
