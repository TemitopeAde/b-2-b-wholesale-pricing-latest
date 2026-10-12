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
// Each added member costs a few Wix calls to approve, so large changes are sent in
// batches to stay under the tool's 1000-item cap and the per-request subrequest limit.
// Batches run in order because each one applies its delta to the stored group.
const GROUP_MEMBER_BATCH = 200;
export async function updateWholesaleGroupMembers(
  groupId: string,
  changes: { add?: GroupMember[]; remove?: string[] },
) {
  const { add = [], remove = [] } = changes;
  if (add.length <= GROUP_MEMBER_BATCH && remove.length <= GROUP_MEMBER_BATCH)
    return call<RecordData>("update-group-members", { groupId, ...changes });
  const batches: { add?: GroupMember[]; remove?: string[] }[] = [];
  for (let i = 0; i < remove.length; i += GROUP_MEMBER_BATCH)
    batches.push({ remove: remove.slice(i, i + GROUP_MEMBER_BATCH) });
  for (let i = 0; i < add.length; i += GROUP_MEMBER_BATCH)
    batches.push({ add: add.slice(i, i + GROUP_MEMBER_BATCH) });
  let saved: RecordData = {};
  for (const [index, batch] of batches.entries()) {
    try {
      saved = await call<RecordData>("update-group-members", {
        groupId,
        ...batch,
      });
    } catch (error) {
      throw new Error(
        `Saved ${index} of ${batches.length} member batches before failing: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return saved;
}
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
