export type Schema = Record<string, unknown>;
const string: Schema = { type: "string", minLength: 1, maxLength: 1000 };
const id: Schema = { type: "string", minLength: 1, maxLength: 100 };
const ids: Schema = {
  type: "array",
  items: id,
  uniqueItems: true,
  maxItems: 1000,
};
const boolean: Schema = { type: "boolean" };
const money: Schema = { type: "number", minimum: 0 };
const quantity: Schema = { type: "integer", minimum: 1 };
export const object = (
  properties: Record<string, Schema>,
  required: string[] = [],
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const status: Schema = {
  type: "string",
  enum: ["pending", "approved", "rejected"],
};
const page = {
  search: { type: "string", maxLength: 200 },
  offset: { type: "integer", minimum: 0 },
  limit: { type: "integer", minimum: 1, maximum: 100 },
};
const member: Schema = object(
  { id, name: { type: "string" }, email: { type: "string" } },
  ["id"],
);
const group: Schema = object({
  name: string,
  minOrder: { type: "string" },
  maxOrder: { type: "string" },
  minProducts: { type: "string" },
  maxProducts: { type: "string" },
  members: { type: "array", items: member, maxItems: 1000 },
});
const applicationProperties: Record<string, Schema> = Object.fromEntries(
  [
    "businessName",
    "contactName",
    "email",
    "phone",
    "businessType",
    "yearsInBusiness",
    "annualRevenue",
    "numberOfLocations",
    "resaleCertificate",
    "taxId",
    "website",
    "hearAboutUs",
    "estimatedMonthlyVolume",
    "additionalInfo",
    "memberId",
    "contactId",
  ].map((key) => [key, { type: "string", maxLength: 2000 }]),
);
applicationProperties["interestedProducts"] = {
  type: "array",
  items: string,
  maxItems: 100,
};
const ruleProperties = {
  name: { type: "string", minLength: 1, maxLength: 50 },
  description: { type: "string", maxLength: 2000 },
  ruleCategory: { type: "string", enum: ["pricing", "moq"] },
  type: { type: "string", enum: ["global", "category", "product"] },
  discountType: {
    type: "string",
    enum: ["percentage", "fixed_amount", "fixed_price"],
  },
  percentage: { type: "number", minimum: 0.1, maximum: 100 },
  discountValue: money,
  fixedAmount: { type: "string", pattern: "^\\d+(\\.\\d+)?$" },
  fixedPrice: { type: "string", pattern: "^\\d+(\\.\\d+)?$" },
  minimumOrder: money,
  maximumOrder: money,
  minimumQuantity: quantity,
  maximumQuantity: quantity,
  minQuantity: quantity,
  maxQuantity: quantity,
  accessGroups: ids,
  memberIds: ids,
  categoryIds: { ...ids, maxItems: 50 },
  productIds: { ...ids, maxItems: 50 },
  catalogAppId: id,
  isActive: boolean,
  startDate: string,
  endDate: string,
};
const jsonRecord: Schema = { type: "object", additionalProperties: true };
const ruleRecord: Schema = {
  ...jsonRecord,
  properties: {
    _id: id,
    name: { type: "string" },
    active: boolean,
    discounts: jsonRecord,
    trigger: jsonRecord,
    accessGroups: ids,
    physicalRuleIds: ids,
  },
};
const applicationRecord: Schema = {
  ...jsonRecord,
  properties: {
    _id: id,
    status,
    email: { type: "string" },
    memberId: { type: ["string", "null"] },
    contactId: { type: ["string", "null"] },
  },
};
const groupRecord: Schema = {
  ...jsonRecord,
  properties: {
    _id: id,
    name: { type: "string" },
    members: { type: "array", items: member },
  },
};
const customerRecord: Schema = {
  ...jsonRecord,
  properties: {
    _id: id,
    revision: { type: "number" },
    info: jsonRecord,
    memberInfo: jsonRecord,
    contactId: id,
    status,
    accessGroupIds: ids,
  },
};
const settingsRecord: Schema = {
  ...jsonRecord,
  properties: {
    _id: id,
    notificationSettings: { type: "object", additionalProperties: boolean },
    emailTemplates: jsonRecord,
  },
};
function responseFor(method: string): Schema {
  let data: Schema = method.includes("rule")
    ? ruleRecord
    : method.includes("application")
      ? applicationRecord
      : method.includes("group")
        ? groupRecord
        : method.includes("customer")
          ? customerRecord
          : method.includes("setting")
            ? settingsRecord
            : jsonRecord;
  if (method.startsWith("list-"))
    data = {
      type: "object",
      properties: {
        items: { type: "array", items: data },
        total: { type: "integer" },
        offset: { type: "integer" },
        limit: { type: "integer" },
        nextOffset: { type: ["integer", "null"] },
      },
      required: ["items", "total", "offset", "limit", "nextOffset"],
      additionalProperties: false,
    };
  if (method === "get-wholesale-price")
    data = {
      ...jsonRecord,
      properties: {
        eligible: boolean,
        hasWholesalePrice: boolean,
        wholesalePrice: money,
        formattedWholesalePrice: { type: "string" },
        retailPrice: money,
        reason: { type: "string" },
      },
      required: ["eligible", "hasWholesalePrice"],
    };
  return {
    type: "object",
    properties: {
      success: boolean,
      data: { anyOf: [data, { type: "null" }] },
      warnings: { type: "array", items: { type: "string" } },
      error: { type: "string" },
      partial: boolean,
      results: {
        type: "array",
        items: {
          ...jsonRecord,
          properties: {
            id,
            index: { type: "integer" },
            sku: { type: "string" },
            success: boolean,
            error: { type: "string" },
            warnings: { type: "array", items: { type: "string" } },
          },
          required: ["success"],
        },
      },
      memberIds: ids,
      count: { type: "integer" },
      createdCount: { type: "integer" },
    },
    required: ["success"],
    additionalProperties: true,
  };
}

function tool(
  methodName: string,
  displayName: string,
  description: string,
  properties: Record<string, Schema>,
  required: string[] = [],
) {
  return {
    methodName,
    displayName,
    description,
    activated: true,
    requestSchema: object(properties, required),
    responseSchema: responseFor(methodName),
  };
}

export const wholesaleTools = [
  tool(
    "list-rules",
    "List wholesale pricing rules",
    "Lists wholesale pricing and minimum-order rules. Use when a collaborator asks which discounts are active, wants to find a rule, or needs rule IDs before making changes. Accepts search, active status, and pagination.",
    { ...page, active: boolean },
  ),
  tool(
    "get-rule",
    "Get wholesale pricing rule",
    "Retrieves one wholesale pricing rule, including eligibility and thresholds. Use to inspect a discount before editing it. Requires ruleId.",
    { ruleId: id },
    ["ruleId"],
  ),
  tool(
    "create-rule",
    "Create wholesale pricing rule",
    "Creates a wholesale pricing or minimum-order rule using the app’s existing pricing engine. Use when asked to configure a discount for products, categories, members, or access groups. Requires a named rule with a discount configuration.",
    { rule: object(ruleProperties, ["name"]) },
    ["rule"],
  ),
  tool(
    "update-rule",
    "Update wholesale pricing rule",
    "Updates a wholesale rule and its storefront price mirror. Use to change pricing, activation, dates, targets, or eligible members. Requires ruleId and changes; the returned rule ID may change.",
    { ruleId: id, changes: object({ ...ruleProperties, active: boolean }) },
    ["ruleId", "changes"],
  ),
  tool(
    "delete-rule",
    "Delete wholesale pricing rule",
    "Deletes a wholesale pricing rule and removes its storefront price mirror. Use when a collaborator asks to remove a specific discount. Requires ruleId.",
    { ruleId: id },
    ["ruleId"],
  ),
  tool(
    "import-bulk-pricing",
    "Import bulk wholesale pricing",
    "Imports SKU-based wholesale pricing rows through the existing bulk pricing workflow. Use for uploaded CSV data represented as rows. Requires a rule name and rows with sku, price, and quantity; reports each failed row separately.",
    {
      name: string,
      memberIds: ids,
      rows: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        items: object(
          {
            sku: string,
            price: { type: "number", exclusiveMinimum: 0 },
            quantity,
          },
          ["sku", "price", "quantity"],
        ),
      },
    },
    ["name", "rows"],
  ),
  tool(
    "get-rule-members",
    "Get eligible rule members",
    "Lists the site member IDs eligible for a wholesale pricing rule. Use to inspect who receives a discount. Requires ruleId.",
    { ruleId: id },
    ["ruleId"],
  ),
  tool(
    "add-rule-members",
    "Add eligible rule members",
    "Adds site members to a wholesale discount without losing existing members or order thresholds. Use when asked to grant a specific pricing rule to customers. Requires ruleId and memberIds.",
    { ruleId: id, memberIds: ids },
    ["ruleId", "memberIds"],
  ),
  tool(
    "remove-rule-members",
    "Remove eligible rule members",
    "Removes members from a wholesale discount and deactivates the rule if no eligible members remain. Use to remove a customer’s discount while preserving other thresholds. Requires ruleId and memberIds.",
    { ruleId: id, memberIds: ids },
    ["ruleId", "memberIds"],
  ),
  tool(
    "apply-rule-to-group",
    "Apply pricing rule to access group",
    "Associates a pricing rule with an access group and synchronizes the group’s member IDs. Use to give a wholesale tier its pricing rule. Requires ruleId and groupId.",
    { ruleId: id, groupId: id },
    ["ruleId", "groupId"],
  ),
  tool(
    "list-customers",
    "Search wholesale customers",
    "Searches approved wholesale customers and returns contact and member identifiers. Use to find a customer before changing their wholesale access. Supports search and pagination.",
    // Every call re-reads all contacts, so the dashboard loads large customer lists in big pages
    { ...page, limit: { type: "integer", minimum: 1, maximum: 1000 } },
  ),
  tool(
    "get-customer",
    "Get wholesale customer",
    "Retrieves a Wix contact and its wholesale status data. Use to inspect a customer or resolve their member identity. Requires contactId.",
    { contactId: id },
    ["contactId"],
  ),
  tool(
    "update-customer",
    "Update wholesale customer access",
    "Persists a customer’s wholesale status and optional access-group assignments. Use to approve a customer, move them to pending or rejected, or change their wholesale tier. Requires contactId and status; groupIds are allowed for approved site members.",
    { contactId: id, status, groupIds: ids },
    ["contactId", "status"],
  ),
  tool(
    "revoke-customer",
    "Revoke wholesale customer access",
    "Clears a customer’s wholesale approval and removes their member from access groups and discount rules. Use when a collaborator asks to revoke wholesale access. Requires contactId.",
    { contactId: id },
    ["contactId"],
  ),
  tool(
    "list-applications",
    "List wholesale applications",
    "Lists wholesale applications with customer details and review status. Use to find pending applications or inspect previous approvals and rejections. Supports status, search, and pagination.",
    { ...page, status },
  ),
  tool(
    "get-application",
    "Get wholesale application",
    "Retrieves one wholesale application. Use to inspect the submitted business information before review. Requires applicationId.",
    { applicationId: id },
    ["applicationId"],
  ),
  tool(
    "create-application",
    "Create wholesale application",
    "Creates a pending wholesale application for a customer and honors owner notification settings. Use when a collaborator enters an application on a customer’s behalf. Requires application data including a valid email; existing applications are rejected.",
    { application: object(applicationProperties, ["email"]) },
    ["application"],
  ),
  tool(
    "review-application",
    "Review wholesale application",
    "Approves, rejects, or returns an application to pending and updates actual customer access. Use for application review; rejection and pending remove group and rule eligibility. Requires applicationId and status. Approval/rejection email follows notification preferences.",
    { applicationId: id, status },
    ["applicationId", "status"],
  ),
  tool(
    "bulk-review-applications",
    "Review wholesale applications in bulk",
    "Reviews multiple wholesale applications and reports individual successes and failures. Use when asked to approve or reject a batch of applicants. Requires applicationIds and status; successful items are retained if another item fails.",
    { applicationIds: { ...ids, minItems: 1, maxItems: 100 }, status },
    ["applicationIds", "status"],
  ),
  tool(
    "list-groups",
    "List wholesale access groups",
    "Lists wholesale access groups, members, and order limits. Use when a collaborator asks about wholesale tiers or needs group IDs. Supports search and pagination.",
    page,
  ),
  tool(
    "get-group",
    "Get wholesale access group",
    "Retrieves one wholesale access group and its members. Use before changing a group or assigning pricing. Requires groupId.",
    { groupId: id },
    ["groupId"],
  ),
  tool(
    "create-group",
    "Create wholesale access group",
    "Creates a wholesale access group with optional order and product limits. Use to define a new wholesale tier. Requires a group name; member objects use site member IDs.",
    { group: { ...group, required: ["name"] } },
    ["group"],
  ),
  tool(
    "update-group",
    "Update wholesale access group",
    "Changes an access group’s name, limits, or members and synchronizes attached pricing rules. Use to edit a wholesale tier. Requires groupId and changes.",
    { groupId: id, changes: group },
    ["groupId", "changes"],
  ),
  tool(
    "delete-group",
    "Delete wholesale access group",
    "Deletes an access group and recalculates eligibility in its attached pricing rules. Use when a collaborator asks to remove a wholesale tier. Requires groupId; partial failures are reported.",
    { groupId: id },
    ["groupId"],
  ),
  tool(
    "set-group-members",
    "Set wholesale access group members",
    "Replaces an access group’s membership with the supplied site members and synchronizes attached pricing rules. Use to manage tier membership. Requires groupId and member objects containing site member IDs.",
    { groupId: id, members: { type: "array", items: member, maxItems: 1000 } },
    ["groupId", "members"],
  ),
  tool(
    "update-group-members",
    "Add or remove wholesale access group members",
    "Adds and/or removes specific members from an access group without resending the whole membership, then synchronizes attached pricing rules. Use to change tier membership. Requires groupId; add takes member objects with site member IDs, remove takes member IDs.",
    {
      groupId: id,
      add: { type: "array", items: member, maxItems: 1000 },
      remove: { ...ids, maxItems: 1000 },
    },
    ["groupId"],
  ),
  tool(
    "get-settings",
    "Get wholesale app settings",
    "Reads wholesale notification preferences and approval/rejection email templates. Use when asked how the app is configured. Takes no input.",
    {},
  ),
  tool(
    "save-settings",
    "Save wholesale app settings",
    "Updates wholesale notification preferences and email templates while retaining existing configuration. Use when a collaborator asks to configure app notifications. Requires settings.",
    {
      settings: object({
        notificationSettings: { type: "object", additionalProperties: boolean },
        emailTemplates: {
          type: "object",
          additionalProperties: object({
            subject: { type: "string" },
            bodyText: { type: "string" },
          }),
        },
      }),
    },
    ["settings"],
  ),
  tool(
    "reset-settings",
    "Reset wholesale app settings",
    "Resets wholesale notification settings to the app’s existing defaults. Use when a collaborator asks to restore default preferences. Takes no input.",
    {},
  ),
  tool(
    "get-notification-setting",
    "Get wholesale notification preference",
    "Reads one wholesale notification preference. Use when asked whether approval, rejection, or registration emails are enabled. Requires a supported setting key.",
    {
      key: {
        type: "string",
        enum: [
          "newQuoteRequests",
          "customerRegistrations",
          "approvalEmails",
          "rejectionEmails",
          "largeOrders",
          "dailySummary",
          "lowStockAlerts",
          "priceChangeUpdates",
          "weeklyReports",
          "systemUpdates",
        ],
      },
    },
    ["key"],
  ),
  tool(
    "set-notification-setting",
    "Set wholesale notification preference",
    "Enables or disables one wholesale notification preference while retaining settings and templates. Use to change email and alert preferences. Requires a supported setting key and a boolean enabled value.",
    {
      key: {
        type: "string",
        enum: [
          "newQuoteRequests",
          "customerRegistrations",
          "approvalEmails",
          "rejectionEmails",
          "largeOrders",
          "dailySummary",
          "lowStockAlerts",
          "priceChangeUpdates",
          "weeklyReports",
          "systemUpdates",
        ],
      },
      enabled: boolean,
    },
    ["key", "enabled"],
  ),
  tool(
    "send-wholesale-notification",
    "Send wholesale status notification",
    "Sends the existing approval or rejection notification to an application’s customer, honoring notification preferences. Use when explicitly asked to resend a status email. Requires applicationId and an approved or rejected application.",
    { applicationId: id },
    ["applicationId"],
  ),
  tool(
    "list-products",
    "Search store products",
    "Looks up store products using the site’s existing catalog version handling. Use to identify products and SKUs for wholesale pricing. Supports search and pagination.",
    page,
  ),
  tool(
    "get-product",
    "Get store product",
    "Retrieves a store product by ID through the app’s existing catalog handling. Use to inspect a product before configuring wholesale pricing. Requires productId.",
    { productId: id },
    ["productId"],
  ),
  tool(
    "list-categories",
    "List store product categories",
    "Lists store categories using the app’s existing Stores V1/V3 support. Use to find category IDs before setting category discounts. Supports search and pagination.",
    page,
  ),
  tool(
    "get-wholesale-price",
    "Get a customer’s wholesale product price",
    "Calculates a product’s wholesale price for an identified site member using the existing approval and pricing rules. Use to answer what an approved customer pays; no approval is bypassed. Requires productId, memberId, and a three-letter currency code.",
    {
      productId: id,
      memberId: id,
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
    },
    ["productId", "memberId", "currency"],
  ),
];
