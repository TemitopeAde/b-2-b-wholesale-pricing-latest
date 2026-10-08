import * as pricing from "../pricing.server";
import type { CreateUnifiedRuleInput, UpdateRuleInput } from "../types";
import { createApplicationWorkflows } from "./applications";
import { createGroupWorkflows } from "./groups";
import type { ToolHandlers } from "./dispatcher";
import { workflowDependencies as deps } from "./repository.server";
import {
  COLLECTIONS,
  errorMessage,
  groupMembers,
  record,
  requireSuccess,
  ruleGroupIds,
  ruleMemberIds,
  strings,
  text,
  type ApplicationStatus,
  type RecordData,
} from "./types";

export const applications = createApplicationWorkflows(deps);
export const groups = createGroupWorkflows(deps);

function page(records: RecordData[], input: RecordData) {
  const search = text(input["search"]).toLowerCase();
  const filtered = search
    ? records.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(search),
      )
    : records;
  const offset = typeof input["offset"] === "number" ? input["offset"] : 0;
  const limit = typeof input["limit"] === "number" ? input["limit"] : 50;
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    offset,
    limit,
    nextOffset: offset + limit < filtered.length ? offset + limit : null,
  };
}

function dates(changes: RecordData): void {
  for (const key of ["startDate", "endDate"]) {
    if (changes[key] && Number.isNaN(Date.parse(text(changes[key]))))
      throw new Error(`Invalid ${key}.`);
  }
  if (
    changes["startDate"] &&
    changes["endDate"] &&
    Date.parse(text(changes["startDate"])) >
      Date.parse(text(changes["endDate"]))
  ) {
    throw new Error("startDate cannot exceed endDate.");
  }
}

async function expandRuleGroups(input: RecordData): Promise<RecordData> {
  dates(input);
  if (
    input["discountType"] === "fixed_amount" &&
    input["fixedAmount"] === undefined &&
    input["discountValue"] !== undefined
  )
    input["fixedAmount"] = String(input["discountValue"]);
  if (
    input["discountType"] === "fixed_price" &&
    input["fixedPrice"] === undefined &&
    input["discountValue"] !== undefined
  )
    input["fixedPrice"] = String(input["discountValue"]);
  for (const [minimum, maximum] of [
    ["minimumQuantity", "maximumQuantity"],
    ["minQuantity", "maxQuantity"],
    ["minimumOrder", "maximumOrder"],
  ]) {
    if (
      minimum &&
      maximum &&
      input[minimum] !== undefined &&
      input[maximum] !== undefined &&
      Number(input[minimum]) > Number(input[maximum])
    )
      throw new Error(`${minimum} cannot exceed ${maximum}.`);
  }
  const accessGroups = strings(input["accessGroups"]);
  if (!accessGroups.length) return input;
  const groupRecords = await deps.list(COLLECTIONS.groups);
  if (
    accessGroups.some(
      (id) => !groupRecords.some((group) => group["_id"] === id),
    )
  )
    throw new Error("An access group could not be found.");
  const memberIds = [
    ...new Set([
      ...strings(input["memberIds"]),
      ...groupRecords
        .filter((group) => accessGroups.includes(text(group["_id"])))
        .flatMap((group) =>
          groupMembers(group["members"]).map((member) => member.id),
        ),
    ]),
  ];
  return {
    ...input,
    memberIds,
    ...(memberIds.length === 0 ? { isActive: false, active: false } : {}),
  };
}

async function editRuleMembers(input: RecordData, add: boolean) {
  const rule = record(
    (await pricing.getUnifiedRule(text(input["ruleId"]))).data,
  );
  if (!rule["_id"]) throw new Error("The rule could not be found.");
  const current = ruleMemberIds(rule["trigger"]);
  const requested = strings(input["memberIds"]);
  const memberIds = add
    ? [...new Set([...current, ...requested])]
    : current.filter((id) => !requested.includes(id));
  return pricing.updateUnifiedRule(text(input["ruleId"]), {
    memberIds,
    ...(memberIds.length === 0 ? { active: false } : {}),
  });
}

async function bulkImport(input: RecordData) {
  const rows = Array.isArray(input["rows"]) ? input["rows"] : [];
  const results = [];
  const productIds = await pricing.getProductIdsBySkuData(
    rows.map((value) => text(record(value)["sku"])),
  );
  for (const [index, value] of rows.entries()) {
    const row = record(value);
    try {
      const productId = productIds[text(row["sku"])];
      if (!productId) throw new Error("No product matches this SKU.");
      const result = await pricing.createBulkCsvRules({
        name: text(input["name"]),
        memberIds: strings(input["memberIds"]),
        minimumQuantity: Number(row["quantity"]),
        bulkCsvItems: [
          {
            sku: text(row["sku"]),
            productId,
            price: Number(row["price"]),
            quantity: Number(row["quantity"]),
          },
        ],
      });
      requireSuccess(result);
      results.push({
        index,
        sku: row["sku"],
        success: true,
        createdCount: result.createdCount,
      });
    } catch (error) {
      results.push({
        index,
        sku: row["sku"],
        success: false,
        error: errorMessage(error),
      });
    }
  }
  const succeeded = results.filter((result) => result.success).length;
  return {
    success: succeeded === results.length,
    partial: succeeded > 0 && succeeded < results.length,
    results,
  };
}

export const toolHandlers: ToolHandlers = {
  "list-rules": async (input) =>
    page(
      await deps
        .listRules()
        .then((rules) =>
          rules.filter(
            (rule) =>
              input["active"] === undefined ||
              rule["active"] === input["active"],
          ),
        ),
      input,
    ),
  "get-rule": async (input) => pricing.getUnifiedRule(text(input["ruleId"])),
  "create-rule": async (input) =>
    pricing.createUnifiedRule(
      (await expandRuleGroups(
        record(input["rule"]),
      )) as unknown as CreateUnifiedRuleInput,
    ),
  "update-rule": async (input) => {
    const changes = await expandRuleGroups(record(input["changes"]));
    if (changes["discountType"] === "fixed_amount")
      changes["discountType"] = "fixed";
    if (changes["isActive"] !== undefined)
      changes["active"] = changes["isActive"];
    if (changes["fixedAmount"] !== undefined)
      changes["discountValue"] = Number(changes["fixedAmount"]);
    if (changes["fixedPrice"] !== undefined)
      changes["discountValue"] = Number(changes["fixedPrice"]);
    if (changes["percentage"] !== undefined)
      changes["discountValue"] = changes["percentage"];
    if (changes["minimumQuantity"] !== undefined)
      changes["minQuantity"] = changes["minimumQuantity"];
    if (changes["maximumQuantity"] !== undefined)
      changes["maxQuantity"] = changes["maximumQuantity"];
    return pricing.updateUnifiedRule(
      text(input["ruleId"]),
      changes as UpdateRuleInput,
    );
  },
  "delete-rule": async (input) =>
    pricing.deleteUnifiedRule(text(input["ruleId"])),
  "import-bulk-pricing": bulkImport,
  "get-rule-members": async (input) =>
    pricing.getMembersFromDiscountRule(text(input["ruleId"])),
  "add-rule-members": async (input) => editRuleMembers(input, true),
  "remove-rule-members": async (input) => editRuleMembers(input, false),
  "apply-rule-to-group": async (input) => {
    const result = await pricing.getUnifiedRule(text(input["ruleId"]));
    requireSuccess(result);
    const rule = record(result.data);
    const changes = await expandRuleGroups({
      memberIds: ruleMemberIds(rule["trigger"]),
      accessGroups: [
        ...new Set([...ruleGroupIds(rule), text(input["groupId"])]),
      ],
    });
    return pricing.updateUnifiedRule(
      text(input["ruleId"]),
      changes as UpdateRuleInput,
    );
  },
  "list-customers": async (input) => {
    const contacts = (
      await pricing.searchWholesaleContacts(text(input["search"]))
    ).map(record);
    const membersByContact = new Map(
      (await pricing.getAllMembers())
        .map(record)
        .map((member) => [member["contactId"], member]),
    );
    return page(
      contacts.map((contact) => {
        const member = membersByContact.get(contact["_id"]);
        return {
          ...contact,
          ...(member
            ? {
                memberInfo: {
                  memberId: member["_id"],
                  email: member["loginEmail"],
                },
              }
            : {}),
        };
      }),
      input,
    );
  },
  "get-customer": async (input) => deps.getContact(text(input["contactId"])),
  "update-customer": async (input) =>
    applications.updateCustomer(
      text(input["contactId"]),
      input["status"] as ApplicationStatus,
      input["groupIds"] === undefined ? undefined : strings(input["groupIds"]),
    ),
  "revoke-customer": async (input) =>
    applications.updateCustomer(text(input["contactId"]), "pending"),
  "list-applications": async (input) =>
    page(
      (await deps.list(COLLECTIONS.applications)).filter(
        (application) =>
          !input["status"] || application["status"] === input["status"],
      ),
      input,
    ),
  "get-application": async (input) =>
    deps.get(COLLECTIONS.applications, text(input["applicationId"])),
  "create-application": async (input) =>
    applications.createApplication(record(input["application"])),
  "review-application": async (input) =>
    applications.reviewApplication(
      text(input["applicationId"]),
      input["status"] as ApplicationStatus,
    ),
  "bulk-review-applications": async (input) =>
    applications.reviewApplications(
      strings(input["applicationIds"]),
      input["status"] as ApplicationStatus,
    ),
  "list-groups": async (input) =>
    page(await deps.list(COLLECTIONS.groups), input),
  "get-group": async (input) =>
    deps.get(COLLECTIONS.groups, text(input["groupId"])),
  "create-group": async (input) =>
    groups.saveGroup(undefined, record(input["group"])),
  "update-group": async (input) =>
    groups.saveGroup(text(input["groupId"]), record(input["changes"])),
  "delete-group": async (input) => groups.deleteGroup(text(input["groupId"])),
  "set-group-members": async (input) =>
    groups.saveGroup(text(input["groupId"]), { members: input["members"] }),
  "update-group-members": async (input) =>
    groups.updateGroupMembers(
      text(input["groupId"]),
      groupMembers(input["add"]),
      strings(input["remove"]),
    ),
  "get-settings": async () => pricing.getConfiguration(),
  "save-settings": async (input) => {
    const current = record(await pricing.getConfiguration());
    const settings = record(input["settings"]);
    return pricing.saveConfiguration({
      ...current,
      ...settings,
      notificationSettings: {
        ...record(current["notificationSettings"]),
        ...record(settings["notificationSettings"]),
      },
    });
  },
  "reset-settings": async () => pricing.resetConfigurationToDefaults(),
  "get-notification-setting": async (input) => ({
    key: input["key"],
    enabled: await pricing.getNotificationSetting(input["key"]),
  }),
  "set-notification-setting": async (input) =>
    pricing.updateNotificationSetting(input["key"], input["enabled"]),
  "send-wholesale-notification": async (input) => {
    const application = await deps.get(
      COLLECTIONS.applications,
      text(input["applicationId"]),
    );
    const status = application["status"];
    if (status !== "approved" && status !== "rejected")
      throw new Error(
        "The application must be approved or rejected before sending a status email.",
      );
    const warnings = await applications.notification(
      text(application["email"]),
      status,
    );
    return { success: warnings.length === 0, warnings };
  },
  "list-products": async (input) => {
    const products = record(await pricing.handleCatalogLogic())["products"];
    return page(Array.isArray(products) ? products.map(record) : [], input);
  },
  "get-product": async (input) =>
    pricing.getProductById(text(input["productId"])),
  "list-categories": async (input) => {
    const result = await pricing.getAllStoreCategories();
    return page(Array.isArray(result) ? result.map(record) : [], input);
  },
  "get-wholesale-price": async (input) =>
    pricing.getProductWholesalePrice(
      text(input["productId"]),
      text(input["currency"]),
      text(input["memberId"]),
    ),
};
