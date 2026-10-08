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
