import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import * as pricing from "../pricing.server";
import type { UpdateRuleInput } from "../types";
import { customerEmail } from "./applications";
import {
  record,
  text,
  type RecordData,
  type WorkflowDependencies,
} from "./types";

const queryItems = auth.elevate(items.query);
const getItem = auth.elevate(items.get);
const insertItem = auth.elevate(items.insert);
const updateItem = auth.elevate(items.update);
const removeItem = auth.elevate(items.remove);

export const workflowDependencies: WorkflowDependencies = {
  async list(collection) {
    let result = await queryItems(collection).limit(100).find();
    const records: RecordData[] = result.items.map(record);
    while (result.hasNext()) {
      result = await result.next();
      records.push(...result.items.map(record));
    }
    return records;
  },
  async get(collection, id) {
    const result = record(
      await getItem(collection, id, { consistentRead: true }),
    );
    if (!result["_id"])
      throw new Error("The requested record could not be found.");
    return result;
  },
  async insert(collection, value) {
    return record(await insertItem(collection, value));
  },
  async update(collection, value) {
    return record(
      await updateItem(collection, { ...value, _id: text(value["_id"]) }),
    );
  },
  async remove(collection, id) {
    return removeItem(collection, id);
  },
  async validateMembers(requested) {
    if (!requested.length) return;
    const members = (await pricing.getAllMembers()).map(record);
    const contacts = (await pricing.searchWholesaleContacts("")).map(record);
    const rejected = requested.filter((requestedMember) => {
      const member = members.find(
        (value) => value["_id"] === requestedMember.id,
      );
      return (
        !member ||
        !contacts.some((contact) => contact["_id"] === member["contactId"])
      );
    });
    if (rejected.length) {
      const names = rejected.map(
        (member) => member.name || member.email || member.id,
      );
      throw new Error(
        `${names.length === 1 ? `${names[0]} is` : `${names.length} members are`} not approved wholesale site members: ${names.slice(0, 10).join(", ")}${names.length > 10 ? `, and ${names.length - 10} more` : ""}.`,
      );
    }
  },
  async listRules() {
    return (await pricing.queryAllRules())._items.map(record);
  },
  async replaceRule(id, changes) {
    return pricing.updateUnifiedRule(id, changes as UpdateRuleInput);
  },
  async getContact(id) {
    return record(await pricing.getContact(id));
  },
  async findContact(application, create) {
    if (create) {
      const result = await pricing.findOrCreateContactForApplication({
        email: text(application["email"]),
        contactName: text(application["contactName"]),
        businessName: text(application["businessName"]),
        phone: text(application["phone"]),
      });
      return record(result.contact);
    }
    const result = await pricing.findContactByEmail(text(application["email"]));
    return result ? record(result) : null;
  },
  async updateContact(id, revision, wholesale) {
    return pricing.updateContact(id, revision, wholesale ? "wholesale" : "");
  },
  async resolveMember(contact) {
    const member = await pricing.findMemberByContactId(text(contact["_id"]));
    if (!member) return null;
    const found = record(member);
    const name = record(record(contact["info"])["name"]);
    return {
      id: text(found["_id"]),
      name: [text(name["first"]), text(name["last"])].filter(Boolean).join(" "),
      email: customerEmail(contact),
    };
  },
  async revokeMember(memberId, contactId) {
    return pricing.revokeWholesaleAccess(memberId, contactId);
  },
  async notify(email, status) {
    return status === "approved"
      ? pricing.sendWholesaleApprovalEmail(email)
      : pricing.sendWholesaleRejectionEmail(email);
  },
  async notifyOwner(application) {
    return pricing.sendNewApplicationNotificationToOwner(application);
  },
};
