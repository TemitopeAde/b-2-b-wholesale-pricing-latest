import { describe, expect, it, vi } from "vitest";

const { queryMembers, queryContacts, queryExtendedFields } = vi.hoisted(() => ({
  queryMembers: vi.fn(),
  queryContacts: vi.fn(),
  queryExtendedFields: vi.fn(),
}));
vi.mock("@wix/essentials", () => ({ auth: { elevate: (fn: unknown) => fn } }));
vi.mock("@wix/members", () => ({
  members: { queryMembers, getMember: vi.fn(), getCurrentMember: vi.fn() },
}));
vi.mock("@wix/crm", () => ({
  contacts: { queryContacts, getContact: vi.fn() },
  extendedFields: { queryExtendedFields },
}));

import { findUnapprovedMemberIds } from "../../src/backend/wholesale/approval.server";

const builder = (items: unknown[]) => {
  const query = {
    eq: () => query,
    in: vi.fn(() => query),
    limit: () => query,
    find: async () => ({ items }),
  };
  return query;
};

describe("findUnapprovedMemberIds", () => {
  it("checks members in bulk and returns the unapproved ones", async () => {
    queryExtendedFields.mockReturnValue(
      builder([{ displayName: "customer", key: "custom.customer" }]),
    );
    const ids = Array.from({ length: 150 }, (_, i) => `m${i}`);
    queryMembers.mockImplementation(async ({ filter }) => ({
      members: filter._id.$in
        .filter((id: string) => id !== "m1")
        .map((id: string) => ({ _id: id, contactId: `c-${id}` })),
    }));
    queryContacts.mockImplementation(async () => {
      const query = builder([]);
      query.in.mockImplementation((_field: string, contactIds: string[]) => {
        query.find = async () => ({
          items: contactIds.map((id) => ({
            _id: id,
            info: {
              extendedFields: {
                items: { "custom.customer": id === "c-m2" ? "retail" : "wholesale" },
              },
            },
          })),
        });
        return query;
      });
      return query;
    });

    expect(await findUnapprovedMemberIds(ids)).toEqual(["m1", "m2"]);
    expect(queryMembers).toHaveBeenCalledTimes(2);
    expect(queryContacts).toHaveBeenCalledTimes(2);
  });

  it("surfaces Wix errors instead of treating members as unapproved", async () => {
    queryExtendedFields.mockReturnValue(
      builder([{ displayName: "customer", key: "custom.customer" }]),
    );
    queryMembers.mockRejectedValue(new Error("Too many subrequests"));
    await expect(findUnapprovedMemberIds(["m1"])).rejects.toThrow(
      "Too many subrequests",
    );
  });
});
