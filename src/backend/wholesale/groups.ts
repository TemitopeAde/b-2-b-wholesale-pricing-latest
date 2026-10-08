import {
  COLLECTIONS,
  errorMessage,
  groupMembers,
  requireSuccess,
  ruleGroupIds,
  ruleMemberIds,
  text,
  type GroupMember,
  type MutationResult,
  type RecordData,
  type WorkflowDependencies,
} from "./types";

export function validateGroup(input: RecordData): void {
  if (!text(input["name"])) throw new Error("Access group name is required.");
  for (const key of ["minOrder", "maxOrder", "minProducts", "maxProducts"]) {
    const value = input[key];
    if (value === undefined || value === "") continue;
    const number = Number(value);
    const valid = key.endsWith("Order")
      ? number > 1
      : Number.isInteger(number) && number >= 0;
    if (!Number.isFinite(number) || !valid) throw new Error(`Invalid ${key}.`);
  }
  for (const [minimum, maximum] of [
    ["minOrder", "maxOrder"],
    ["minProducts", "maxProducts"],
  ]) {
    if (
      minimum &&
      maximum &&
      input[minimum] &&
      input[maximum] &&
      Number(input[minimum]) > Number(input[maximum])
    ) {
      throw new Error(`${minimum} cannot exceed ${maximum}.`);
    }
  }
}

export function calculateGroupEligibility(
  previous: RecordData[],
  next: RecordData[],
  rule: RecordData,
): string[] {
  const attachedIds = ruleGroupIds(rule);
  const previousIds = new Set(
    previous
      .filter((group) => attachedIds.includes(text(group["_id"])))
      .flatMap((group) =>
        groupMembers(group["members"]).map((member) => member.id),
      ),
  );
  const directIds = ruleMemberIds(rule["trigger"]).filter(
    (id) => !previousIds.has(id),
  );
  const groupIds = next
    .filter((group) => attachedIds.includes(text(group["_id"])))
    .flatMap((group) =>
      groupMembers(group["members"]).map((member) => member.id),
    );
  return [...new Set([...directIds, ...groupIds])];
}

export function createGroupWorkflows(deps: WorkflowDependencies) {
  async function synchronize(
    previous: RecordData[],
    next: RecordData[],
    changedId: string,
  ): Promise<string[]> {
    const warnings: string[] = [];
    const rules = await deps.listRules();
    for (const rule of rules) {
      const groups = ruleGroupIds(rule);
      if (!groups.includes(changedId)) continue;
      try {
        const memberIds = calculateGroupEligibility(previous, next, rule);
        requireSuccess(
          await deps.replaceRule(text(rule["_id"]), {
            memberIds,
            accessGroups: groups.filter((id) =>
              next.some((group) => group["_id"] === id),
            ),
            ...(memberIds.length === 0 ? { active: false } : {}),
          }),
        );
      } catch (error) {
        warnings.push(
          `Group saved; rule ${text(rule["_id"])} could not synchronize: ${errorMessage(error)}`,
        );
      }
    }
    return warnings;
  }

  async function saveGroup(
    id: string | undefined,
    input: RecordData,
  ): Promise<MutationResult> {
    const previous = await deps.list(COLLECTIONS.groups);
    const stored = id ? await deps.get(COLLECTIONS.groups, id) : {};
    const data: RecordData = {
      ...stored,
      ...input,
      members: groupMembers(input["members"] ?? stored["members"]),
    };
    validateGroup(data);
    if (input["members"] !== undefined) {
      // Only newly added members are checked, so one existing member who has since
      // lost approval doesn't block every later change to the group.
      const existingIds = new Set(
        groupMembers(stored["members"]).map((member) => member.id),
      );
      await deps.validateMembers(
        groupMembers(data["members"]).filter(
          (member) => !existingIds.has(member.id),
        ),
      );
    }
    for (const key of ["minOrder", "maxOrder", "minProducts", "maxProducts"])
      data[key] = String(data[key] ?? "");
    const saved = id
      ? await deps.update(COLLECTIONS.groups, { ...data, _id: id })
      : await deps.insert(COLLECTIONS.groups, data);
    const savedId = text(saved["_id"]);
    try {
      const warnings = await synchronize(
        previous,
        [...previous.filter((group) => group["_id"] !== savedId), saved],
        savedId,
      );
      return {
        success: warnings.length === 0,
        partial: warnings.length > 0,
        data: saved,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        partial: true,
        data: saved,
        error: `Group saved; eligibility sync failed: ${errorMessage(error)}`,
      };
    }
  }

  // Group deletion checks every pricing rule, not only those tagged with the group:
  // rules saved without group metadata would otherwise keep the deleted members.
  async function removeDeletedGroupMembers(
    deleted: RecordData,
    remaining: RecordData[],
  ): Promise<string[]> {
    const deletedId = text(deleted["_id"]);
    const removedIds = new Set(
      groupMembers(deleted["members"]).map((member) => member.id),
    );
    const warnings: string[] = [];
    for (const rule of await deps.listRules()) {
      const groups = ruleGroupIds(rule);
      const current = ruleMemberIds(rule["trigger"]);
      const tagged = groups.includes(deletedId);
      if (!tagged && !current.some((memberId) => removedIds.has(memberId)))
        continue;
      const attached = groups.filter(
        (groupId) =>
          groupId !== deletedId &&
          remaining.some((group) => group["_id"] === groupId),
      );
      // Keep members who still qualify through another group on the rule
      const stillCovered = new Set(
        remaining
          .filter((group) => attached.includes(text(group["_id"])))
          .flatMap((group) =>
            groupMembers(group["members"]).map((member) => member.id),
          ),
      );
      const memberIds = current.filter(
        (memberId) => !removedIds.has(memberId) || stillCovered.has(memberId),
      );
      if (memberIds.length === current.length && !tagged) continue;
      try {
        requireSuccess(
          await deps.replaceRule(text(rule["_id"]), {
            memberIds,
            accessGroups: attached,
            ...(memberIds.length === 0 ? { active: false } : {}),
          }),
        );
      } catch (error) {
        warnings.push(
          `Group deleted; rule ${text(rule["_id"])} could not synchronize: ${errorMessage(error)}`,
        );
      }
    }
    return warnings;
  }

  async function deleteGroup(id: string): Promise<MutationResult> {
    const previous = await deps.list(COLLECTIONS.groups);
    const deleted = await deps.get(COLLECTIONS.groups, id);
    await deps.remove(COLLECTIONS.groups, id);
    try {
      const warnings = await removeDeletedGroupMembers(
        deleted,
        previous.filter((group) => group["_id"] !== id),
      );
      return {
        success: warnings.length === 0,
        partial: warnings.length > 0,
        data: { id, deleted: true },
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        partial: true,
        data: { id, deleted: true },
        error: errorMessage(error),
      };
    }
  }

  // Applies a membership delta to the stored list, so callers never resend (and
  // overwrite) members they didn't touch.
  async function updateGroupMembers(
    id: string,
    add: GroupMember[],
    removeIds: string[],
  ): Promise<MutationResult> {
    const stored = await deps.get(COLLECTIONS.groups, id);
    const removed = new Set(removeIds);
    const members = groupMembers(stored["members"]).filter(
      (member) => !removed.has(member.id),
    );
    for (const member of add) {
      if (!removed.has(member.id) && !members.some((m) => m.id === member.id))
        members.push(member);
    }
    return saveGroup(id, { members });
  }

  async function setCustomerGroups(
    member: GroupMember,
    groupIds: string[],
  ): Promise<MutationResult> {
    const groups = await deps.list(COLLECTIONS.groups);
    if (groupIds.some((id) => !groups.some((group) => group["_id"] === id)))
      throw new Error("An access group could not be found.");
    const warnings: string[] = [];
    for (const group of groups) {
      const members = groupMembers(group["members"]);
      const hasMember = members.some((existing) => existing.id === member.id);
      const shouldInclude = groupIds.includes(text(group["_id"]));
      if (hasMember === shouldInclude) continue;
      const next = members.filter((existing) => existing.id !== member.id);
      if (shouldInclude) next.push(member);
      const result = await saveGroup(text(group["_id"]), { members: next });
      warnings.push(
        ...(result.warnings || []),
        ...(result.error ? [result.error] : []),
      );
    }
    return {
      success: warnings.length === 0,
      partial: warnings.length > 0,
      data: { memberId: member.id, groupIds },
      warnings,
    };
  }

  return { saveGroup, deleteGroup, updateGroupMembers, setCustomerGroups };
}
