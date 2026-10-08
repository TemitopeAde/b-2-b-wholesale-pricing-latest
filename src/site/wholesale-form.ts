import { items } from "@wix/data";
import { members } from "@wix/members";
import { record, text, type RecordData } from "../backend/wholesale/types";

const COLLECTION = "@wd-strategies/wholesale-appllication/application";
export type SiteMember = {
  member: { _id?: string; contactId?: string; loginEmail?: string };
  contact?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    emails?: { email: string; primary?: boolean }[];
    phones?: { phone: string; primary?: boolean }[];
  };
};

export function normalizeMember(value: unknown): SiteMember | null {
  const response = record(value);
  const member = record(response["member"] ?? value);
  if (!member["_id"]) return null;
  const contact = record(member["contact"] ?? response["contact"]);
  const emails = Array.isArray(contact["emails"]) ? contact["emails"] : [];
  const phones = Array.isArray(contact["phones"]) ? contact["phones"] : [];
  return {
    member: {
      _id: text(member["_id"]),
      contactId: text(member["contactId"]),
      loginEmail: text(member["loginEmail"]),
    },
    contact: {
      firstName: text(contact["firstName"]),
      lastName: text(contact["lastName"]),
      company: text(contact["company"]),
      emails: emails.map((email) =>
        typeof email === "string"
          ? { email }
          : {
              email: text(record(email)["email"]),
              primary: record(email)["primary"] === true,
            },
      ),
      phones: phones.map((phone) =>
        typeof phone === "string"
          ? { phone }
          : {
              phone: text(record(phone)["phone"]),
              primary: record(phone)["primary"] === true,
            },
      ),
    },
  };
}

export async function loadSiteMember(): Promise<SiteMember | null> {
  try {
    return normalizeMember(
      await members.getCurrentMember({ fieldsets: ["FULL"] }),
    );
  } catch (error) {
    const details = record(error);
    if (
      [401, 403].includes(
        Number(details["statusCode"] ?? details["httpStatus"]),
      ) ||
      /not logged|not authenticated|UNAUTHENTICATED/i.test(String(error))
    )
      return null;
    throw error;
  }
}

export function validateSiteForm(
  data: { contactName: string; email: string; phone: string },
  visible: { contactName: boolean; email: boolean; phone: boolean },
  messages: Record<string, string>,
): { contactName?: string; email?: string; phone?: string } {
  const errors: { contactName?: string; email?: string; phone?: string } = {};
  if (visible.contactName && !data.contactName.trim())
    errors.contactName = messages["nameRequired"];
  if (visible.email) {
    if (!data.email.trim()) errors.email = messages["emailRequired"];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.email = messages["emailInvalid"];
  }
  if (visible.phone && !data.phone.trim())
    errors.phone = messages["phoneRequired"];
  return errors;
}

export async function findExistingApplication(
  member: SiteMember | null,
): Promise<RecordData | null> {
  if (!member?.member._id) return null;
  const byMember = items.query(COLLECTION).eq("memberId", member.member._id);
  const email = member.member.loginEmail;
  const query = email
    ? byMember.or(items.query(COLLECTION).eq("email", email))
    : byMember;
  const result = await query
    .descending("submissionDate")
    .limit(1)
    .find({ consistentRead: true });
  return result.items[0] ? record(result.items[0]) : null;
}

export async function submitSiteApplication(
  input: object,
  member: SiteMember | null,
): Promise<RecordData> {
  if (!member?.member._id || !member.member.loginEmail)
    throw new Error("Sign in before applying for wholesale access.");
  if (await findExistingApplication(member))
    throw new Error("You already have a wholesale application.");
  const data = record(input);
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, value]) =>
      typeof value === "string"
        ? value.trim()
        : Array.isArray(value) && value.length,
    ),
  );
  return record(
    await items.insert(COLLECTION, {
      ...cleaned,
      interestedProducts: Array.isArray(data["interestedProducts"])
        ? data["interestedProducts"].join(", ")
        : data["interestedProducts"],
      email: member.member.loginEmail,
      memberId: member.member._id,
      contactId: member.member.contactId || null,
      memberEmail: member.member.loginEmail,
      memberData: JSON.stringify(member),
      status: "pending",
      submissionDate: new Date().toISOString(),
    }),
  );
}
