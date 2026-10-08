import { describe, expect, it, vi } from "vitest";
import { createApplicationWorkflows } from "../../src/backend/wholesale/applications";
import { createGroupWorkflows } from "../../src/backend/wholesale/groups";
import {
  authorizeDashboard,
  authorizeProvider,
  WHOLESALE_APP_ID,
  type TokenContext,
} from "../../src/backend/wholesale/context";
import {
  createToolDispatcher,
  validatePayload,
} from "../../src/backend/wholesale/dispatcher";
import { wholesaleTools } from "../../src/backend/wholesale/tool-definitions";
import {
  groupMembers,
  COLLECTIONS,
  type RecordData,
  type WorkflowDependencies,
} from "../../src/backend/wholesale/types";

function fixture() {
  const store = new Map<string, RecordData[]>([
    [
      COLLECTIONS.applications,
      [
        {
          _id: "a",
          email: "a@example.com",
          status: "pending",
          memberId: "m",
          contactId: "c",
          businessName: "Preserve me",
        },
      ],
    ],
    [
      COLLECTIONS.groups,
      [
        {
          _id: "g",
          name: "Trade",
          members: [{ id: "m", name: "Member", email: "a@example.com" }],
        },
      ],
    ],
    [
      COLLECTIONS.configuration,
      [
        {
          notificationSettings: {
            approvalEmails: true,
            rejectionEmails: true,
            customerRegistrations: true,
          },
        },
      ],
    ],
  ]);
  const deps: WorkflowDependencies = {
    list: vi.fn(async (collection) =>
      structuredClone(store.get(collection) || []),
    ),
    get: vi.fn(async (collection, id) => {
      const result = store.get(collection)?.find((item) => item["_id"] === id);
      if (!result) throw new Error("Missing record");
      return structuredClone(result);
    }),
    insert: vi.fn(async (collection, data) => {
      const saved = { ...data, _id: "new" };
      store.set(collection, [...(store.get(collection) || []), saved]);
      return saved;
    }),
    update: vi.fn(async (collection, data) => {
      store.set(
        collection,
        (store.get(collection) || []).map((item) =>
          item["_id"] === data["_id"] ? data : item,
        ),
      );
      return data;
    }),
    remove: vi.fn(async (collection, id) => {
      store.set(
        collection,
        (store.get(collection) || []).filter((item) => item["_id"] !== id),
      );
    }),
    listRules: vi.fn(async () => []),
    validateMembers: vi.fn(async () => {}),
    replaceRule: vi.fn(async () => ({ success: true })),
    getContact: vi.fn(async () => ({
      _id: "c",
      revision: 2,
      primaryInfo: { email: "a@example.com" },
    })),
    findContact: vi.fn(async () => ({ _id: "c", revision: 2 })),
    resolveMember: vi.fn(async () => ({
      id: "m",
      name: "Member",
      email: "a@example.com",
    })),
    updateContact: vi.fn(async () => ({ _id: "c" })),
    revokeMember: vi.fn(async () => ({ success: true })),
    notify: vi.fn(async () => ({ success: true })),
    notifyOwner: vi.fn(async () => ({ success: true })),
  };
  return {
    store,
    deps,
    applications: createApplicationWorkflows(deps),
    groups: createGroupWorkflows(deps),
  };
}

describe("application and customer workflows", () => {
  it("persists approval, preserves fields, and sends the configured notification", async () => {
    const { applications, deps, store } = fixture();
    expect(
      (await applications.reviewApplication("a", "approved")).success,
    ).toBe(true);
    expect(deps.updateContact).toHaveBeenCalledWith("c", 2, true);
    expect(store.get(COLLECTIONS.applications)?.[0]).toMatchObject({
      status: "approved",
      businessName: "Preserve me",
    });
    expect(deps.notify).toHaveBeenCalledWith("a@example.com", "approved");
  });
  it.each(["rejected", "pending"] as const)(
    "clears approval and eligibility on %s, including retries",
    async (status) => {
      const { applications, deps } = fixture();
      await applications.reviewApplication("a", status);
      expect(deps.updateContact).toHaveBeenCalledWith("c", 2, false);
      expect(deps.revokeMember).toHaveBeenCalledWith("m", "c");
      if (status === "pending") expect(deps.notify).not.toHaveBeenCalled();
    },
  );
  it("honors preferences and keeps a completed approval when email fails", async () => {
    const { applications, deps, store } = fixture();
    store.set(COLLECTIONS.configuration, [
      { notificationSettings: { approvalEmails: false } },
    ]);
    await applications.reviewApplication("a", "approved");
    expect(deps.notify).not.toHaveBeenCalled();
    store.set(COLLECTIONS.configuration, [
      { notificationSettings: { rejectionEmails: true } },
    ]);
    vi.mocked(deps.notify).mockResolvedValue({
      success: false,
      error: "Mail unavailable",
    });
    expect(await applications.reviewApplication("a", "rejected")).toMatchObject(
      {
        success: true,
        warnings: [expect.stringContaining("Mail unavailable")],
      },
    );
  });
  it("still revokes by contact when the contact has no member account", async () => {
    const { applications, deps } = fixture();
    vi.mocked(deps.resolveMember).mockResolvedValue(null);
    await applications.updateCustomer("c", "pending");
    expect(deps.revokeMember).toHaveBeenCalledWith(undefined, "c");
  });
  it("reports cleanup failures as partial and allows retry", async () => {
    const { applications, deps } = fixture();
    vi.mocked(deps.revokeMember).mockResolvedValueOnce({
      success: false,
      error: "Rules unavailable",
    });
    expect(await applications.reviewApplication("a", "rejected")).toMatchObject(
      { success: false, partial: true },
    );
    expect(
      (await applications.reviewApplication("a", "rejected")).success,
    ).toBe(true);
    expect(deps.revokeMember).toHaveBeenCalledTimes(2);
  });
  it("reports an application save failure after customer access changed", async () => {
    const { applications, deps } = fixture();
    vi.mocked(deps.update).mockRejectedValueOnce(
      new Error("Storage unavailable"),
    );
    expect(await applications.reviewApplication("a", "approved")).toMatchObject(
      {
        success: false,
        partial: true,
        error: expect.stringContaining("Storage unavailable"),
      },
    );
    expect(deps.notify).not.toHaveBeenCalled();
  });
  it("does not save approval when the contact update fails", async () => {
    const { applications, deps, store } = fixture();
    vi.mocked(deps.updateContact).mockRejectedValue(
      new Error("Contact unavailable"),
    );
    await expect(
      applications.reviewApplication("a", "approved"),
    ).rejects.toThrow("Contact unavailable");
    expect(store.get(COLLECTIONS.applications)?.[0]?.["status"]).toBe(
      "pending",
    );
  });
  it("rejects missing applications and conflicting member associations", async () => {
    const { applications, deps } = fixture();
    await expect(
      applications.reviewApplication("missing", "approved"),
    ).rejects.toThrow("Missing");
    vi.mocked(deps.resolveMember).mockResolvedValue({
      id: "another",
      name: "",
      email: "",
    });
    await expect(
      applications.reviewApplication("a", "approved"),
    ).rejects.toThrow("does not match");
    expect(deps.updateContact).not.toHaveBeenCalled();
  });
  it("bulk review preserves successful rows and reports failures individually", async () => {
    const { applications } = fixture();
    expect(
      await applications.reviewApplications(["a", "missing"], "approved"),
    ).toMatchObject({
      success: false,
      partial: true,
      results: [
        { id: "a", success: true },
        { id: "missing", success: false },
      ],
    });
  });
  it("persists customer status and group edits to stored applications and groups", async () => {
    const { applications, store } = fixture();
    expect(
      (await applications.updateCustomer("c", "approved", [])).success,
    ).toBe(true);
    expect(store.get(COLLECTIONS.groups)?.[0]?.["members"]).toEqual([]);
    expect(store.get(COLLECTIONS.applications)?.[0]?.["status"]).toBe(
      "approved",
    );
  });
  it("validates group assignment before changing customer access", async () => {
    const { applications, deps } = fixture();
    await expect(
      applications.updateCustomer("c", "approved", ["missing"]),
    ).rejects.toThrow("could not be found");
    await expect(
      applications.updateCustomer("c", "pending", ["g"]),
    ).rejects.toThrow("Only approved");
    expect(deps.updateContact).not.toHaveBeenCalled();
  });
  it("blocks duplicates and invalid application emails", async () => {
    const { applications } = fixture();
    await expect(
      applications.createApplication({ email: "A@example.com" }),
    ).rejects.toThrow("already");
    await expect(
      applications.createApplication({ email: "invalid" }),
    ).rejects.toThrow("valid");
  });
});

describe("group eligibility synchronization", () => {
  function rule(memberIds: string[]): RecordData {
    return {
      _id: "r",
      accessGroups: ["g"],
      trigger: {
        triggerType: "AND",
        and: {
          triggers: [
            {
              triggerType: "CUSTOMER_ELIGIBILITY",
              customerEligibility: { individualMembersInfo: { memberIds } },
            },
            {
              triggerType: "ITEM_QUANTITY_RANGE",
              itemQuantityRange: { from: 5 },
            },
          ],
        },
      },
    };
  }
  it("updates attached rules, preserving individually eligible members", async () => {
    const { groups, deps } = fixture();
    vi.mocked(deps.listRules).mockResolvedValue([rule(["m", "direct"])]);
    await groups.saveGroup("g", {
      members: [{ id: "new-member", name: "", email: "" }],
    });
    expect(deps.replaceRule).toHaveBeenCalledWith("r", {
      memberIds: ["direct", "new-member"],
      accessGroups: ["g"],
    });
  });
  it("deactivates empty rules on group deletion", async () => {
    const { groups, deps } = fixture();
    vi.mocked(deps.listRules).mockResolvedValue([rule(["m"])]);
    await groups.deleteGroup("g");
    expect(deps.replaceRule).toHaveBeenCalledWith("r", {
      memberIds: [],
      accessGroups: [],
      active: false,
    });
  });
  it("removes deleted group members from rules missing the group tag", async () => {
    const { groups, deps } = fixture();
    vi.mocked(deps.listRules).mockResolvedValue([
      { ...rule(["m", "direct"]), accessGroups: [] },
      { ...rule(["other"]), _id: "untouched", accessGroups: [] },
    ]);
    await groups.deleteGroup("g");
    expect(deps.replaceRule).toHaveBeenCalledTimes(1);
    expect(deps.replaceRule).toHaveBeenCalledWith("r", {
      memberIds: ["direct"],
      accessGroups: [],
    });
  });
  it("keeps members still covered by another group on the rule", async () => {
    const { groups, deps, store } = fixture();
    store.get(COLLECTIONS.groups)?.push({
      _id: "g2",
      name: "Retail",
      members: [{ id: "m", name: "Member", email: "a@example.com" }],
    });
    vi.mocked(deps.listRules).mockResolvedValue([
      { ...rule(["m"]), accessGroups: ["g", "g2"] },
    ]);
    await groups.deleteGroup("g");
    expect(deps.replaceRule).toHaveBeenCalledWith("r", {
      memberIds: ["m"],
      accessGroups: ["g2"],
    });
  });
  it("reports failed pricing synchronization without hiding saved membership", async () => {
    const { groups, deps, store } = fixture();
    vi.mocked(deps.listRules).mockResolvedValue([rule(["m"])]);
    vi.mocked(deps.replaceRule).mockRejectedValue(
      new Error("Rules unavailable"),
    );
    expect(await groups.saveGroup("g", { members: [] })).toMatchObject({
      success: false,
      partial: true,
      warnings: [expect.stringContaining("Rules unavailable")],
    });
    expect(store.get(COLLECTIONS.groups)?.[0]?.["members"]).toEqual([]);
  });
  it("rejects invalid limits and nonmembers before saving", async () => {
    const { groups, deps } = fixture();
    await expect(
      groups.saveGroup("g", { minOrder: "20", maxOrder: "10" }),
    ).rejects.toThrow("exceed");
    vi.mocked(deps.validateMembers).mockRejectedValue(
      new Error("Not an approved member"),
    );
    await expect(
      groups.saveGroup("g", { members: [{ id: "contact-id" }] }),
    ).rejects.toThrow("approved");
    expect(deps.update).not.toHaveBeenCalled();
  });
  it("applies member additions and removals to the stored list", async () => {
    const { groups, deps, store } = fixture();
    await groups.updateGroupMembers(
      "g",
      [
        { id: "new-member", name: "New", email: "new@example.com" },
        { id: "m", name: "Duplicate", email: "" },
      ],
      [],
    );
    expect(deps.validateMembers).toHaveBeenCalledWith([
      { id: "new-member", name: "New", email: "new@example.com" },
    ]);
    const ids = () =>
      groupMembers(store.get(COLLECTIONS.groups)?.[0]?.["members"]).map(
        (m) => m.id,
      );
    expect(ids()).toEqual(["m", "new-member"]);
    await groups.updateGroupMembers("g", [], ["m"]);
    expect(ids()).toEqual(["new-member"]);
  });
  it("validates only members added to an existing group", async () => {
    const { groups, deps } = fixture();
    await groups.saveGroup("g", {
      members: [
        { id: "m", name: "Member", email: "a@example.com" },
        { id: "new-member", name: "New", email: "new@example.com" },
      ],
    });
    expect(deps.validateMembers).toHaveBeenCalledWith([
      { id: "new-member", name: "New", email: "new@example.com" },
    ]);
  });
});

describe("tool contracts and caller authorization", () => {
  const token: TokenContext = {
    active: true,
    subjectType: "USER",
    subjectId: "u",
    siteId: "site",
    instanceId: "instance",
  };
  it("requires a collaborator and trusted site/instance context", () => {
    expect(() => authorizeDashboard(token)).not.toThrow();
    expect(() =>
      authorizeProvider(
        { instanceId: "instance", identity: { wixUserId: "u" } },
        token,
      ),
    ).not.toThrow();
    expect(() =>
      authorizeProvider(
        { instanceId: "instance", identity: { wixUserId: "u" } },
        { ...token, subjectType: "APP", subjectId: WHOLESALE_APP_ID },
      ),
    ).not.toThrow();
    for (const invalid of [
      { ...token, active: false },
      { ...token, subjectType: "MEMBER" },
      { ...token, siteId: "" },
    ])
      expect(() => authorizeDashboard(invalid)).toThrow();
    expect(() =>
      authorizeProvider(
        { instanceId: "other", identity: { wixUserId: "u" } },
        token,
      ),
    ).toThrow();
    expect(() =>
      authorizeProvider(
        { instanceId: "instance", identity: { wixUserId: "other" } },
        token,
      ),
    ).toThrow();
    expect(() =>
      authorizeProvider({ instanceId: "instance", identity: {} }, token),
    ).toThrow();
  });
  it("has activated declarations, unique names, request/response schemas, and complete handler coverage", () => {
    expect(new Set(wholesaleTools.map((tool) => tool.methodName)).size).toBe(
      wholesaleTools.length,
    );
    for (const tool of wholesaleTools) {
      expect(tool.activated).toBe(true);
      expect(tool.requestSchema["type"]).toBe("object");
      expect(tool.responseSchema["required"]).toContain("success");
    }
    expect(() => createToolDispatcher({}, async () => {})).toThrow(
      "Missing handler",
    );
  });
  it.each([
    ["review-application", { applicationId: "a", status: "other" }],
    ["get-rule", {}],
    [
      "set-group-members",
      { groupId: "g", members: [{ id: "m", unauthorized: true }] },
    ],
    ["get-wholesale-price", { productId: "p", memberId: "m", currency: "usd" }],
    ["list-applications", { limit: 10000 }],
    ["unknown", {}],
  ])("rejects invalid payload for %s", (method, value) => {
    expect(() => validatePayload(method, value)).toThrow();
  });
  it("authorizes before invoking handlers, catches backend failures, and returns JSON", async () => {
    const handlers = Object.fromEntries(
      wholesaleTools.map((tool) => [
        tool.methodName,
        vi.fn(async () => ({ saved: new Date("2026-01-01") })),
      ]),
    );
    const dispatch = createToolDispatcher(handlers, async () => {});
    expect(await dispatch("get-settings", {})).toEqual({
      response: { success: true, data: { saved: "2026-01-01T00:00:00.000Z" } },
    });
    vi.mocked(handlers["get-settings"]!).mockRejectedValueOnce(
      new Error("Backend unavailable"),
    );
    expect(await dispatch("get-settings", {})).toEqual({
      response: { success: false, error: "Backend unavailable" },
    });
    const denied = createToolDispatcher(handlers, async () => {
      throw new Error("Unauthorized");
    });
    await expect(denied("get-settings", {})).rejects.toThrow("Unauthorized");
    expect(handlers["get-settings"]).toHaveBeenCalledTimes(2);
  });
});
