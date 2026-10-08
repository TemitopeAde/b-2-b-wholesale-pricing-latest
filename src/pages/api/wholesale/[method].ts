import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import {
  AuthorizationError,
  authorizeDashboard,
} from "../../../backend/wholesale/context";
import { createToolDispatcher } from "../../../backend/wholesale/dispatcher";
import { toolHandlers } from "../../../backend/wholesale/runtime.server";

const dispatch = createToolDispatcher(toolHandlers, async () =>
  authorizeDashboard(await auth.getTokenInfo()),
);

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const body: unknown = await request.json();
    const result = await dispatch(params["method"] || "", body);
    return Response.json(result.response, {
      status: result.response["success"] ? 200 : 400,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request.",
      },
      { status: error instanceof AuthorizationError ? 403 : 400 },
    );
  }
};
