export type TokenContext = {
  active: boolean;
  subjectType: string;
  subjectId: string;
  siteId: string;
  instanceId?: string;
  clientId?: string;
};

export const WHOLESALE_APP_ID = "0415fd4c-b629-4e16-b417-707b9ff48a14";

export class AuthorizationError extends Error {}

export function authorizeDashboard(token: TokenContext): void {
  if (
    !token.active ||
    token.subjectType !== "USER" ||
    !token.subjectId ||
    !token.siteId ||
    !token.instanceId
  ) {
    throw new AuthorizationError(
      "A signed-in site collaborator in this app instance is required.",
    );
  }
}

export function authorizeProvider(
  metadata: {
    instanceId?: string | null;
    identity?: { wixUserId?: string | null } | null;
  },
  token: TokenContext,
): void {
  const userId = metadata.identity?.wixUserId;
  if (
    !token.active ||
    !token.siteId ||
    !metadata.instanceId ||
    !userId ||
    !token.instanceId ||
    token.instanceId !== metadata.instanceId
  ) {
    throw new AuthorizationError(
      "A trusted site collaborator and app instance are required.",
    );
  }
  const isUser = token.subjectType === "USER" && token.subjectId === userId;
  const isThisApp =
    token.subjectType === "APP" &&
    (token.subjectId === WHOLESALE_APP_ID ||
      token.clientId === WHOLESALE_APP_ID);
  if (!isUser && !isThisApp)
    throw new AuthorizationError(
      "The tool caller does not belong to this app.",
    );
}
