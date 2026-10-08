import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import {
  findExistingApplication,
  normalizeMember,
  submitSiteApplication,
  validateSiteForm,
} from "../../src/site/wholesale-form";
import { useWholesaleApplication } from "../../src/site/use-wholesale-application";
import WholesaleRequestForm from "../../src/extensions/site/components/wholesale-request-form/wholesale-request-form";
import { defaultProps } from "../../src/extensions/site/components/wholesale-request-form/wholesale-request-form.props";
import { editorElement } from "../../src/extensions/site/components/wholesale-request-form/wholesale-request-form.generated";
import {
  fieldLabels,
  validationMessages,
} from "../../src/site/wholesale-translations";

const mocks = vi.hoisted(() => ({
  member: vi.fn(),
  query: vi.fn(),
  insert: vi.fn(),
  editMode: true,
  find: vi.fn(),
}));
vi.mock("@wix/members", () => ({
  members: { getCurrentMember: mocks.member },
}));
vi.mock("@wix/data", () => ({
  items: { query: mocks.query, insert: mocks.insert },
}));
vi.mock("@wix/react-component-utils", () => ({
  useIsEditMode: () => mocks.editMode,
}));
const member = {
  member: {
    _id: "member",
    contactId: "contact",
    loginEmail: "member@example.com",
    contact: {
      firstName: "Trade",
      lastName: "Buyer",
      emails: ["member@example.com"],
      phones: ["123"],
    },
  },
};

beforeEach(() => {
  mocks.editMode = true;
  const builder = {
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    descending: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    find: mocks.find,
  };
  mocks.query.mockReturnValue(builder);
  mocks.find.mockResolvedValue({ items: [] });
  mocks.member.mockResolvedValue(member);
  mocks.insert.mockResolvedValue({ _id: "application", status: "pending" });
});
afterEach(cleanup);

describe("shared site form business logic", () => {
  it("normalizes SDK response and contact data while preserving member identity", () => {
    expect(normalizeMember(member)).toMatchObject({
      member: {
        _id: "member",
        contactId: "contact",
        loginEmail: "member@example.com",
      },
      contact: {
        firstName: "Trade",
        emails: [{ email: "member@example.com" }],
        phones: [{ phone: "123" }],
      },
    });
    expect(normalizeMember({})).toBeNull();
  });
  it("retains all languages and validates only displayed required fields", () => {
    expect(Object.keys(fieldLabels).length).toBeGreaterThan(10);
    expect(Object.keys(validationMessages).length).toBeGreaterThan(10);
    const input = { contactName: "", email: "invalid", phone: "" };
    expect(
      Object.keys(
        validateSiteForm(
          input,
          { contactName: true, email: true, phone: true },
          validationMessages["en"]!,
        ),
      ),
    ).toEqual(["contactName", "email", "phone"]);
    expect(
      validateSiteForm(
        input,
        { contactName: false, email: false, phone: false },
        validationMessages["en"]!,
      ),
    ).toEqual({});
  });
  it("associates submission with the signed-in member, ignoring authored email and status", async () => {
    await submitSiteApplication(
      {
        email: "spoof@example.com",
        contactName: "Buyer",
        status: "approved",
        interestedProducts: ["Tools"],
      },
      normalizeMember(member),
    );
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.stringContaining("/application"),
      expect.objectContaining({
        email: "member@example.com",
        memberId: "member",
        contactId: "contact",
        status: "pending",
        interestedProducts: "Tools",
      }),
    );
  });
  it("blocks submissions from anonymous users and duplicate applications", async () => {
    await expect(submitSiteApplication({}, null)).rejects.toThrow("Sign in");
    mocks.find.mockResolvedValue({
      items: [{ _id: "existing", status: "pending" }],
    });
    await expect(
      submitSiteApplication({}, normalizeMember(member)),
    ).rejects.toThrow("already");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("propagates failed duplicate checks to prevent accidental duplicate writes", async () => {
    mocks.find.mockRejectedValue(new Error("Storage unavailable"));
    await expect(
      findExistingApplication(normalizeMember(member)),
    ).rejects.toThrow("Storage unavailable");
    await expect(
      submitSiteApplication({}, normalizeMember(member)),
    ).rejects.toThrow("Storage unavailable");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("Harmony form behavior", () => {
  it("includes styling controls for every visible and conditional named part in the generated manifest", () => {
    const generated = JSON.stringify(editorElement);
    for (const part of [
      "heading",
      "description",
      "section-heading",
      "field-label",
      "input",
      "select",
      "textarea",
      "product-option",
      "product-checkbox",
      "status",
      "status-heading",
      "status-message",
      "error",
      "submit-button",
    ])
      expect(generated).toContain(`.wholesale-request-form-${part}`);
  });
  it("renders in SSR and edit mode without business-data requests or submissions", async () => {
    expect(
      renderToString(
        <WholesaleRequestForm {...defaultProps} id="ssr" direction="rtl" />,
      ),
    ).toContain('dir="rtl"');
    const { container } = render(
      <WholesaleRequestForm {...defaultProps} id="editor" />,
    );
    fireEvent.submit(container.querySelector("form")!);
    expect(mocks.member).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("uses unique label/input IDs when multiple components are placed on a page", () => {
    const { container } = render(
      <>
        <WholesaleRequestForm {...defaultProps} id="one" />
        <WholesaleRequestForm {...defaultProps} id="two" />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map(
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const label of container.querySelectorAll("label[for]"))
      expect(
        container.querySelector(`[id="${label.getAttribute("for")}"]`),
      ).toBeTruthy();
  });
  it.each(["pending", "approved", "rejected"])(
    "shows an existing %s application instead of a second form",
    async (status) => {
      mocks.editMode = false;
      mocks.find.mockResolvedValue({ items: [{ _id: "existing", status }] });
      const { container } = render(
        <WholesaleRequestForm {...defaultProps} id="live" />,
      );
      await screen.findByRole("status");
      expect(container.querySelector("form")?.hidden).toBe(true);
      expect(mocks.insert).not.toHaveBeenCalled();
    },
  );
  it("submits a member application in live mode and displays success", async () => {
    mocks.editMode = false;
    const { container } = render(
      <WholesaleRequestForm {...defaultProps} id="live" />,
    );
    await waitFor(() =>
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    fireEvent.change(screen.getByLabelText("Phone Number *"), {
      target: { value: "12345" },
    });
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
  it("does not accept stale member responses after mode changes", async () => {
    let resolve: (value: typeof member) => void = () => {};
    mocks.member.mockReturnValue(
      new Promise((value) => {
        resolve = value;
      }),
    );
    const { result, rerender } = renderHook(
      ({ enabled }) => useWholesaleApplication(enabled),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    await act(async () => {
      resolve(member);
    });
    expect(result.current.member).toBeNull();
    expect(result.current.application).toBeNull();
  });
});
