import { auth } from "@wix/essentials";
import { contacts, extendedFields } from "@wix/crm";
import { members } from "@wix/members";

// Shared by pricing.server.ts and the wholesale-pricing discount trigger, so the
// product page, cart and checkout all agree on who is an approved wholesale customer.

const elevatedQueryExtendedFields = auth.elevate(extendedFields.queryExtendedFields);
const elevatedGetContact = auth.elevate(contacts.getContact);
const elevatedGetMember = auth.elevate(members.getMember);

/**
 * Single source of truth for the "customer" extended field key, used by both the
 * approval write (updateContact) and every wholesale read. Not cached: when the
 * field is recreated Wix issues a new suffixed key (custom.customer-xxxx), and a
 * stale cached key made approved contacts invisible to wholesale queries.
 */
export async function getCustomerFieldKey(): Promise<string> {
  const fieldsResult = await elevatedQueryExtendedFields()
    .eq("namespace", "custom")
    .find();

  // Prefer the exact field createCustomField() makes; fall back to the key pattern.
  const customerField =
    fieldsResult.items.find((field) => field.displayName === "customer") ||
    fieldsResult.items.find((field) => field.key?.startsWith("custom.customer"));

  if (!customerField || !customerField.key) {
    throw new Error("Customer type field not found");
  }

  return customerField.key;
}

async function getCustomerExtendedFieldKey(): Promise<string | null> {
  try {
    return await getCustomerFieldKey();
  } catch {
    return null;
  }
}

/** True when contact extended field customer === "wholesale" (dashboard approval). */
export async function isContactWholesaleApproved(contactId: string): Promise<boolean> {
  try {
    const contact = await elevatedGetContact(contactId, {
      fieldsets: ["EXTENDED"],
    });
    const customerFieldKey = await getCustomerExtendedFieldKey();
    if (!customerFieldKey) {
      return false;
    }

    const rawContact = contact as any;
    const contactData = rawContact?.contact || rawContact;
    const extendedFieldItems =
      contactData?.info?.extendedFields?.items ||
      contactData?.extendedFields?.items ||
      rawContact?.extendedFields?.items ||
      {};
    return extendedFieldItems[customerFieldKey] === "wholesale";
  } catch (error) {
    return false;
  }
}

/** True when the site member's linked contact is an approved wholesale customer. */
export async function isMemberWholesaleApproved(memberId: string): Promise<boolean> {
  try {
    const member = await elevatedGetMember(memberId, { fieldsets: ["FULL"] } as any);
    const contactId =
      (member as any)?.contactId ||
      (member as any)?.member?.contactId ||
      (member as any)?.contact?.contactId ||
      (member as any)?.contact?._id;

    if (!contactId) {
      return false;
    }

    return await isContactWholesaleApproved(String(contactId));
  } catch (error) {
    return false;
  }
}

const elevatedQueryMembers = auth.elevate(members.queryMembers);
const elevatedQueryContacts = auth.elevate(contacts.queryContacts);
// The members filter parser rejects longer $in lists.
const APPROVAL_BATCH_SIZE = 100;

/**
 * Returns the member IDs that are not approved wholesale site members, using two
 * queries per 100 IDs instead of per-member lookups (which exhausted the per-request
 * subrequest limit). Wix errors propagate rather than reading as "not approved".
 */
export async function findUnapprovedMemberIds(memberIds: string[]): Promise<string[]> {
  const ids = [...new Set(memberIds)];
  if (!ids.length) return [];
  const customerFieldKey = await getCustomerFieldKey();
  const approved = new Set<string>();
  for (let i = 0; i < ids.length; i += APPROVAL_BATCH_SIZE) {
    const chunk = ids.slice(i, i + APPROVAL_BATCH_SIZE);
    const memberResult: any = await elevatedQueryMembers(
      { filter: { _id: { $in: chunk } }, paging: { limit: chunk.length } } as any,
      { fieldsets: ["FULL"] } as any,
    );
    const memberByContact = new Map<string, string>();
    for (const member of memberResult?.members || []) {
      if (member?._id && member?.contactId) memberByContact.set(String(member.contactId), String(member._id));
    }
    if (!memberByContact.size) continue;
    const query: any = await elevatedQueryContacts({ fieldsets: ["EXTENDED"] } as any);
    const contactResult = await query
      .in("_id", [...memberByContact.keys()])
      .limit(APPROVAL_BATCH_SIZE)
      .find();
    for (const contact of contactResult?.items || []) {
      const items = contact?.info?.extendedFields?.items || contact?.extendedFields?.items || {};
      if (items[customerFieldKey] === "wholesale") {
        const memberId = memberByContact.get(String(contact._id));
        if (memberId) approved.add(memberId);
      }
    }
  }
  return ids.filter((id) => !approved.has(id));
}
