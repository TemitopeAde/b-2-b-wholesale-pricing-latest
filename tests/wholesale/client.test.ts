import { describe, expect, it, vi } from "vitest";

const { fetchWithAuth } = vi.hoisted(() => ({ fetchWithAuth: vi.fn() }));
vi.mock("@wix/essentials", () => ({ httpClient: { fetchWithAuth } }));
vi.mock("@wix/dashboard", () => ({ dashboard: { showToast: vi.fn() } }));

import { updateWholesaleGroupMembers } from "../../src/backend/wholesale.client";

const members = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `m${i}`, name: "", email: "" }));
const bodies = () =>
  fetchWithAuth.mock.calls.map(([, init]) => JSON.parse(init.body));

describe("updateWholesaleGroupMembers", () => {
  it("sends small changes in one request", async () => {
    fetchWithAuth.mockResolvedValue(
      Response.json({ success: true, data: { _id: "g" } }),
    );
    await updateWholesaleGroupMembers("g", { add: members(3), remove: ["x"] });
    expect(bodies()).toEqual([
      { groupId: "g", add: members(3), remove: ["x"] },
    ]);
  });

  it("splits large changes into ordered batches, removes first", async () => {
    let call = 0;
    fetchWithAuth.mockImplementation(async () =>
      Response.json({ success: true, data: { _id: "g", call: ++call } }),
    );
    const add = members(1050);
    const saved = await updateWholesaleGroupMembers("g", { add, remove: ["x"] });
    const sent = bodies();
    expect(sent[0]).toEqual({ groupId: "g", remove: ["x"] });
    expect(sent.slice(1).map((body) => body.add.length)).toEqual([
      200, 200, 200, 200, 200, 50,
    ]);
    expect(sent.slice(1).flatMap((body) => body.add)).toEqual(add);
    expect(saved).toEqual({ _id: "g", call: 7 });
  });

  it("reports how many batches were saved when one fails", async () => {
    fetchWithAuth
      .mockResolvedValueOnce(Response.json({ success: true, data: {} }))
      .mockResolvedValueOnce(
        Response.json({ success: false, error: "boom" }, { status: 400 }),
      );
    await expect(
      updateWholesaleGroupMembers("g", { add: members(450) }),
    ).rejects.toThrow("Saved 1 of 3 member batches before failing: boom");
    expect(fetchWithAuth).toHaveBeenCalledTimes(2);
  });
});
