import { compileSchema } from "./schema-validator";
import { wholesaleTools } from "./tool-definitions";
import { errorMessage, record, type RecordData } from "./types";

export type ToolHandler = (payload: RecordData) => Promise<unknown>;
export type ToolHandlers = Record<string, ToolHandler>;
const validators = new Map(
  wholesaleTools.map((tool) => [
    tool.methodName,
    compileSchema(tool.requestSchema),
  ]),
);

export function validatePayload(
  methodName: string,
  payload: unknown,
): RecordData {
  const validate = validators.get(methodName);
  if (!validate) throw new Error(`Unknown wholesale tool: ${methodName}`);
  const value = payload ?? {};
  const errors = validate(value);
  if (errors.length) throw new Error(`Invalid input: ${errors.join(", ")}`);
  return record(value);
}

export function createToolDispatcher(
  handlers: ToolHandlers,
  authorize: () => Promise<void>,
) {
  for (const definition of wholesaleTools) {
    if (!handlers[definition.methodName])
      throw new Error(`Missing handler: ${definition.methodName}`);
  }
  return async (methodName: string, payload: unknown) => {
    await authorize();
    try {
      const value = validatePayload(methodName, payload);
      const handler = handlers[methodName];
      if (!handler) throw new Error(`Unknown wholesale tool: ${methodName}`);
      const result = await handler(value);
      const data = record(result);
      const response =
        typeof data["success"] === "boolean"
          ? data
          : { success: true, data: result ?? null };
      // SDK objects can contain builders and Date instances; return only JSON data to Aria.
      return { response: record(JSON.parse(JSON.stringify(response))) };
    } catch (error) {
      console.error(`[wholesale tools] ${methodName}: ${errorMessage(error)}`);
      const detail = record(error);
      return {
        response: {
          success: false,
          error: errorMessage(error),
          ...(detail["partial"] === true
            ? { partial: true, data: record(detail["data"]) }
            : {}),
        },
      };
    }
  };
}
