import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { COLLECTIONS, groupMembers, record, type RecordData } from "./types";

const queryItems = auth.elevate(items.query);

export async function getMemberAccessGroups(memberId: string): Promise<RecordData[]> {
  let result = await queryItems(COLLECTIONS.groups).limit(100).find();
  const groups: RecordData[] = result.items.map(record);
  while (result.hasNext()) {
    result = await result.next();
    groups.push(...result.items.map(record));
  }

  return groups.filter((group) =>
    groupMembers(group["members"]).some((member) => member.id === memberId),
  );
}
