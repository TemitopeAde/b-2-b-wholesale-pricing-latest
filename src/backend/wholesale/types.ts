export type RecordData = Record<string, unknown>;
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type GroupMember = { id: string; name: string; email: string };
export type MutationResult = {
  success: boolean;
  data?: RecordData;
  warnings?: string[];
  error?: string;
  partial?: boolean;
};

export const COLLECTIONS = {
  applications: "@wd-strategies/wholesale-appllication/application",
  groups: "@wd-strategies/wholesale-appllication/Accessgroup",
  rules: "@wd-strategies/wholesale-appllication/UpdatedRules",
  configuration: "@wd-strategies/wholesale-appllication/Configuration",
  shippingRules: "@wd-strategies/wholesale-appllication/ShippingRules",
} as const;

export interface WorkflowDependencies {
  list(collection: string): Promise<RecordData[]>;
  get(collection: string, id: string): Promise<RecordData>;
  insert(collection: string, item: RecordData): Promise<RecordData>;
  update(collection: string, item: RecordData): Promise<RecordData>;
  remove(collection: string, id: string): Promise<unknown>;
  validateMembers(members: GroupMember[]): Promise<void>;
  listRules(): Promise<RecordData[]>;
  replaceRule(id: string, changes: RecordData): Promise<unknown>;
  getContact(id: string): Promise<RecordData>;
  findContact(
    application: RecordData,
    create: boolean,
  ): Promise<RecordData | null>;
  updateContact(
    id: string,
    revision: number,
    wholesale: boolean,
  ): Promise<unknown>;
  resolveMember(contact: RecordData): Promise<GroupMember | null>;
  /** Strips the customer from groups and rules; contactId also clears legacy group entries stored by contact. */
  revokeMember(memberId: string | undefined, contactId?: string): Promise<unknown>;
  notify(email: string, status: "approved" | "rejected"): Promise<unknown>;
  notifyOwner(application: RecordData): Promise<unknown>;
}

export function record(value: unknown): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RecordData;
}

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function groupMembers(value: unknown): GroupMember[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const data = record(item);
    const id =
      typeof item === "string"
        ? item
        : text(data["id"] || data["memberId"] || data["_id"]);
    return id
      ? [{ id, name: text(data["name"]), email: text(data["email"]) }]
      : [];
  });
}

export function ruleMemberIds(trigger: unknown): string[] {
  const data = record(trigger);
  if (data["triggerType"] === "AND") {
    const children = record(data["and"])["triggers"];
    return Array.isArray(children) ? children.flatMap(ruleMemberIds) : [];
  }
  return strings(
    record(record(data["customerEligibility"])["individualMembersInfo"])[
      "memberIds"
    ],
  );
}

export function ruleGroupIds(rule: RecordData): string[] {
  const explicit = strings(rule["accessGroups"]);
  if (explicit.length) return explicit;
  const description = text(rule["offer"] || rule["description"]);
  const match = description.match(/ \|\| Groups: (.*)$/);
  return (
    match?.[1]
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) || []
  );
}

export function requireSuccess(value: unknown): void {
  const result = record(value);
  if (result["success"] === false)
    throw new Error(text(result["error"]) || "The operation failed.");
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The operation failed.";
}
