import type { Schema } from "./tool-definitions";

// Interprets the JSON Schema subset used by the wholesale tool definitions.
// Ajv compiles schemas with `new Function`, which the Wix (Cloudflare Workers) runtime blocks.
const KEYWORDS = new Set([
  "type",
  "enum",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "properties",
  "required",
  "additionalProperties",
  "anyOf",
  "description",
  "title",
]);

export type SchemaValidator = (value: unknown) => string[];

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    default:
      return typeof value === type;
  }
}

function assertSupported(schema: Schema, path: string): void {
  for (const key of Object.keys(schema)) {
    if (!KEYWORDS.has(key))
      throw new Error(`Unsupported schema keyword "${key}" at ${path || "/"}`);
  }
  const properties = (schema["properties"] ?? {}) as Record<string, Schema>;
  for (const [key, child] of Object.entries(properties))
    assertSupported(child, `${path}/${key}`);
  if (typeof schema["items"] === "object")
    assertSupported(schema["items"] as Schema, `${path}/items`);
  if (typeof schema["additionalProperties"] === "object")
    assertSupported(schema["additionalProperties"] as Schema, path);
  for (const option of (schema["anyOf"] ?? []) as Schema[])
    assertSupported(option, path);
}

function check(schema: Schema, value: unknown, path: string, errors: string[]): void {
  const at = `data${path}`;
  if (schema["anyOf"]) {
    const options = schema["anyOf"] as Schema[];
    if (!options.some((option) => validateAt(option, value, path).length === 0))
      errors.push(`${at} must match a schema in anyOf`);
  }
  if (schema["type"] !== undefined) {
    const types = ([] as string[]).concat(schema["type"] as string | string[]);
    if (!types.some((type) => typeMatches(type, value))) {
      errors.push(`${at} must be ${types.join(",")}`);
      return;
    }
  }
  if (schema["enum"] && !(schema["enum"] as unknown[]).includes(value))
    errors.push(`${at} must be equal to one of the allowed values`);

  if (typeof value === "string") {
    if (typeof schema["minLength"] === "number" && value.length < schema["minLength"])
      errors.push(`${at} must NOT have fewer than ${schema["minLength"]} characters`);
    if (typeof schema["maxLength"] === "number" && value.length > schema["maxLength"])
      errors.push(`${at} must NOT have more than ${schema["maxLength"]} characters`);
    if (typeof schema["pattern"] === "string" && !new RegExp(schema["pattern"], "u").test(value))
      errors.push(`${at} must match pattern "${schema["pattern"]}"`);
  }

  if (typeof value === "number") {
    if (typeof schema["minimum"] === "number" && value < schema["minimum"])
      errors.push(`${at} must be >= ${schema["minimum"]}`);
    if (typeof schema["maximum"] === "number" && value > schema["maximum"])
      errors.push(`${at} must be <= ${schema["maximum"]}`);
    if (typeof schema["exclusiveMinimum"] === "number" && value <= schema["exclusiveMinimum"])
      errors.push(`${at} must be > ${schema["exclusiveMinimum"]}`);
  }

  if (Array.isArray(value)) {
    if (typeof schema["minItems"] === "number" && value.length < schema["minItems"])
      errors.push(`${at} must NOT have fewer than ${schema["minItems"]} items`);
    if (typeof schema["maxItems"] === "number" && value.length > schema["maxItems"])
      errors.push(`${at} must NOT have more than ${schema["maxItems"]} items`);
    if (schema["uniqueItems"] === true) {
      const seen = new Set(value.map((item) => JSON.stringify(item)));
      if (seen.size !== value.length)
        errors.push(`${at} must NOT have duplicate items`);
    }
    if (typeof schema["items"] === "object")
      value.forEach((item, index) =>
        check(schema["items"] as Schema, item, `${path}/${index}`, errors),
      );
  }

  if (typeMatches("object", value)) {
    const object = value as Record<string, unknown>;
    const properties = (schema["properties"] ?? {}) as Record<string, Schema>;
    for (const key of (schema["required"] ?? []) as string[]) {
      if (!(key in object))
        errors.push(`${at} must have required property '${key}'`);
    }
    for (const [key, child] of Object.entries(object)) {
      if (properties[key]) check(properties[key], child, `${path}/${key}`, errors);
      else if (schema["additionalProperties"] === false)
        errors.push(`${at} must NOT have additional property '${key}'`);
      else if (typeof schema["additionalProperties"] === "object")
        check(schema["additionalProperties"] as Schema, child, `${path}/${key}`, errors);
    }
  }
}

function validateAt(schema: Schema, value: unknown, path: string): string[] {
  const errors: string[] = [];
  check(schema, value, path, errors);
  return errors;
}

export function compileSchema(schema: Schema): SchemaValidator {
  assertSupported(schema, "");
  return (value) => validateAt(schema, value, "");
}
