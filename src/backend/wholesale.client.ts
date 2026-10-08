import { dashboard } from "@wix/dashboard";
import { httpClient } from "@wix/essentials";
import type {
  ApplicationStatus,
  GroupMember,
  MutationResult,
  RecordData,
} from "./wholesale/types";

const moduleUrl = import.meta.url;
async function call<T>(method: string, input: RecordData): Promise<T> {
  const response = await httpClient.fetchWithAuth(
    new URL(`/api/wholesale/${method}`, moduleUrl).href,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const result = (await response.json()) as MutationResult & { data: T };
  if (!response.ok || !result.success)
    throw new Error(
      result.error ||
        result.warnings?.join("; ") ||
        "The wholesale operation failed.",
    );
  if (result.warnings?.length)
    dashboard.showToast({
      message: result.warnings.join("; "),
      type: "warning",
    });
  return result.data;
}

export const createWholesaleApplication = (application: RecordData) =>
  call<RecordData>("create-application", { application });
export const reviewWholesaleApplication = (
  applicationId: string,
  status: ApplicationStatus,
) => call<RecordData>("review-application", { applicationId, status });
export const updateWholesaleCustomer = (
  contactId: string,
  status: ApplicationStatus,
  groupIds?: string[],
) =>
  call<RecordData>("update-customer", {
    contactId,
    status,
    ...(groupIds ? { groupIds } : {}),
  });
export const saveWholesaleGroup = (group: RecordData, groupId?: string) =>
  call<RecordData>(
    groupId ? "update-group" : "create-group",
    groupId ? { groupId, changes: group } : { group },
  );
export const setWholesaleGroupMembers = (
  groupId: string,
  members: GroupMember[],
) => call<RecordData>("set-group-members", { groupId, members });
export const updateWholesaleGroupMembers = (
  groupId: string,
  changes: { add?: GroupMember[]; remove?: string[] },
) => call<RecordData>("update-group-members", { groupId, ...changes });
export const deleteWholesaleGroup = (groupId: string) =>
  call<RecordData>("delete-group", { groupId });

export async function listWholesaleCustomers(search = "") {
  const items: RecordData[] = [];
  let offset: number | null = 0;
  do {
    const result: { items: RecordData[]; nextOffset: number | null } =
      await call<{ items: RecordData[]; nextOffset: number | null }>(
        "list-customers",
        { search, limit: 1000, offset },
      );
    items.push(...result.items);
    offset = result.nextOffset;
  } while (offset !== null);
  return { items };
}
