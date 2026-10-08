import { describe, expect, it } from "vitest";
import { compileSchema } from "../../src/backend/wholesale/schema-validator";
import { validatePayload } from "../../src/backend/wholesale/dispatcher";
import { wholesaleTools } from "../../src/backend/wholesale/tool-definitions";

describe("schema validator", () => {
  it("compiles every tool request and response schema", () => {
    for (const tool of wholesaleTools) {
      expect(() => compileSchema(tool.requestSchema)).not.toThrow();
      expect(() => compileSchema(tool.responseSchema)).not.toThrow();
    }
  });

  it("accepts a valid create-group payload", () => {
    expect(
      validatePayload("create-group", {
        group: { name: "VIP", minOrder: "10", members: [{ id: "m1" }] },
      }),
    ).toMatchObject({ group: { name: "VIP" } });
  });

  it("reports type, enum, required and additional property errors", () => {
    expect(() => validatePayload("create-group", { group: { name: 5 } })).toThrow(
      "data/group/name must be string",
    );
    expect(() =>
      validatePayload("review-application", { applicationId: "a", status: "x" }),
    ).toThrow("must be equal to one of the allowed values");
    expect(() =>
      validatePayload("review-application", { status: "approved" }),
    ).toThrow("must have required property 'applicationId'");
    expect(() =>
      validatePayload("create-group", { group: { name: "A", extra: 1 } }),
    ).toThrow("must NOT have additional property 'extra'");
  });

  it("checks numbers, patterns, array bounds and union types", () => {
    const validate = compileSchema({
      type: "object",
      properties: {
        price: { type: "number", exclusiveMinimum: 0 },
        amount: { type: "string", pattern: "^\\d+$" },
        ids: { type: "array", items: { type: "string" }, minItems: 1, uniqueItems: true },
        memberId: { type: ["string", "null"] },
      },
    });
    expect(validate({ price: 1, amount: "12", ids: ["a"], memberId: null })).toEqual([]);
    expect(validate({ price: 0, amount: "1.5", ids: ["a", "a"], memberId: 3 })).toHaveLength(4);
    expect(validate({ ids: [] })).toEqual(["data/ids must NOT have fewer than 1 items"]);
  });
});
