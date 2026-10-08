import {
  COLLECTIONS,
  errorMessage,
  record,
  requireSuccess,
  text,
  type ApplicationStatus,
  type MutationResult,
  type RecordData,
  type WorkflowDependencies,
} from "./types";
import { createGroupWorkflows } from "./groups";

export function createApplicationWorkflows(deps: WorkflowDependencies) {
  const groups = createGroupWorkflows(deps);

  async function notification(
    email: string,
    status: ApplicationStatus,
  ): Promise<string[]> {
    if (!email || status === "pending") return [];
    try {
      const config = (await deps.list(COLLECTIONS.configuration))
        .filter((value) => value["notificationSettings"])
        .sort((a, b) =>
          String(b["_updatedDate"] || "").localeCompare(
            String(a["_updatedDate"] || ""),
          ),
        )[0];
      const settings = record(config?.["notificationSettings"]);
      if (
        settings[
          status === "approved" ? "approvalEmails" : "rejectionEmails"
        ] === false
      )
        return [];
      requireSuccess(await deps.notify(email, status));
      return [];
    } catch (error) {
      return [`Status saved; notification failed: ${errorMessage(error)}`];
    }
  }

  async function changeContact(
    contact: RecordData,
    status: ApplicationStatus,
    memberId?: string,
  ): Promise<string[]> {
    const revision = Number(contact["revision"]);
    if (!Number.isFinite(revision) || contact["revision"] == null)
      throw new Error("The contact has no valid revision.");
    requireSuccess(
      await deps.updateContact(
        text(contact["_id"]),
        revision,
        status === "approved",
      ),
    );
    if (status !== "approved") {
      try {
        requireSuccess(
          await deps.revokeMember(memberId, text(contact["_id"])),
        );
      } catch (error) {
        return [
          `Wholesale flag cleared; eligibility cleanup failed: ${errorMessage(error)}`,
        ];
      }
    }
    return [];
  }

  async function createApplication(input: RecordData): Promise<MutationResult> {
    const email = text(input["email"]).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("A valid application email is required.");
    const existing = await deps.list(COLLECTIONS.applications);
    if (
      existing.some(
        (application) =>
          text(application["email"]).toLowerCase() === email ||
          (input["memberId"] && application["memberId"] === input["memberId"]),
      )
    ) {
      throw new Error("This customer already has a wholesale application.");
    }
    const saved = await deps.insert(COLLECTIONS.applications, {
      ...input,
      email,
      status: "pending",
      submissionDate: new Date().toISOString(),
    });
    const warnings: string[] = [];
    try {
      const config = (await deps.list(COLLECTIONS.configuration))
        .filter((value) => value["notificationSettings"])
        .sort((a, b) =>
          String(b["_updatedDate"] || "").localeCompare(
            String(a["_updatedDate"] || ""),
          ),
        )[0];
      if (
        record(config?.["notificationSettings"])["customerRegistrations"] !==
        false
      ) {
        requireSuccess(await deps.notifyOwner(saved));
      }
    } catch (error) {
      warnings.push(
        `Application saved; owner notification failed: ${errorMessage(error)}`,
      );
    }
    return { success: true, data: saved, warnings };
  }

  async function reviewApplication(
    id: string,
    status: ApplicationStatus,
  ): Promise<MutationResult> {
    const application = await deps.get(COLLECTIONS.applications, id);
    const statusChanged = application["status"] !== status;
    let contact = text(application["contactId"])
      ? await deps.getContact(text(application["contactId"]))
      : null;
    if (!contact)
      contact = await deps.findContact(application, status === "approved");
    if (!contact && status === "approved")
      throw new Error(
        "No contact could be found or created for this application.",
      );
    const member = contact ? await deps.resolveMember(contact) : null;
    if (
      member &&
      application["memberId"] &&
      application["memberId"] !== member.id
    )
      throw new Error("The application member does not match its contact.");
    const memberId = member?.id || text(application["memberId"]);
    const cleanupWarnings: string[] = [];
    if (contact)
      cleanupWarnings.push(...(await changeContact(contact, status, memberId)));
    else if (memberId && status !== "approved") {
      try {
        requireSuccess(await deps.revokeMember(memberId));
      } catch (error) {
        cleanupWarnings.push(
          `Eligibility cleanup failed: ${errorMessage(error)}`,
        );
      }
    }
    let saved: RecordData;
    try {
      saved = await deps.update(COLLECTIONS.applications, {
        ...application,
        _id: id,
        status,
        contactId: text(contact?.["_id"]) || application["contactId"] || null,
        memberId: memberId || application["memberId"] || null,
      });
    } catch (error) {
      return {
        success: false,
        partial: Boolean(contact || memberId),
        error: `Customer access changed; application status could not be saved: ${errorMessage(error)}`,
      };
    }
    if (cleanupWarnings.length)
      return {
        success: false,
        partial: true,
        data: saved,
        warnings: cleanupWarnings,
      };
    return {
      success: true,
      data: saved,
      warnings: statusChanged
        ? await notification(text(application["email"]), status)
        : [],
    };
  }

  async function reviewApplications(ids: string[], status: ApplicationStatus) {
    const results = [];
    for (const id of new Set(ids)) {
      try {
        results.push({ id, ...(await reviewApplication(id, status)) });
      } catch (error) {
        results.push({ id, success: false, error: errorMessage(error) });
      }
    }
    const succeeded = results.filter((result) => result.success).length;
    return {
      success: succeeded === results.length,
      partial: succeeded > 0 && succeeded < results.length,
      results,
    };
  }

  async function updateCustomer(
    contactId: string,
    status: ApplicationStatus,
    groupIds?: string[],
  ): Promise<MutationResult> {
    const contact = await deps.getContact(contactId);
    const member = await deps.resolveMember(contact);
    if (groupIds?.length && !member)
      throw new Error(
        "The contact must have a site member account before joining access groups.",
      );
    if (status !== "approved" && groupIds?.length)
      throw new Error(
        "Only approved wholesale customers can join access groups.",
      );
    if (groupIds) {
      const availableGroups = await deps.list(COLLECTIONS.groups);
      if (
        groupIds.some(
          (id) => !availableGroups.some((group) => group["_id"] === id),
        )
      )
        throw new Error("An access group could not be found.");
    }
    const warnings = await changeContact(contact, status, member?.id);
    if (member && groupIds && status === "approved") {
      try {
        const result = await groups.setCustomerGroups(member, groupIds);
        warnings.push(
          ...(result.warnings || []),
          ...(result.error ? [result.error] : []),
        );
      } catch (error) {
        warnings.push(
          `Customer saved; group assignment failed: ${errorMessage(error)}`,
        );
      }
    }
    try {
      const applications = await deps.list(COLLECTIONS.applications);
      for (const application of applications) {
        if (
          application["contactId"] === contactId ||
          (member && application["memberId"] === member.id) ||
          text(application["email"]).toLowerCase() ===
            customerEmail(contact).toLowerCase()
        ) {
          await deps.update(COLLECTIONS.applications, {
            ...application,
            status,
            contactId,
          });
        }
      }
    } catch (error) {
      warnings.push(
        `Customer saved; application synchronization failed: ${errorMessage(error)}`,
      );
    }
    return {
      success: warnings.length === 0,
      partial: warnings.length > 0,
      data: {
        contactId,
        memberId: member?.id,
        status,
        accessGroupIds: groupIds,
      },
      warnings,
    };
  }

  return {
    createApplication,
    reviewApplication,
    reviewApplications,
    updateCustomer,
    notification,
  };
}

export function customerEmail(contact: RecordData): string {
  const value = record(contact["info"])["emails"];
  const emails = Array.isArray(value) ? value : record(value)["items"];
  return (
    text(record(contact["primaryInfo"])["email"]) ||
    (Array.isArray(emails) ? text(record(emails[0])["email"]) : "")
  );
}
