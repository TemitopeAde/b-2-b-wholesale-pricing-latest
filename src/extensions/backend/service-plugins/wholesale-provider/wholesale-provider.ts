import { toolsProvider } from "@wix/app-tools/service-plugins";
import { auth } from "@wix/essentials";
import { authorizeProvider } from "../../../../backend/wholesale/context";
import { createToolDispatcher } from "../../../../backend/wholesale/dispatcher";
import { toolHandlers } from "../../../../backend/wholesale/runtime.server";

toolsProvider.provideHandlers({
  runTool: async ({ request, metadata }) => {
    const dispatch = createToolDispatcher(toolHandlers, async () =>
      authorizeProvider(metadata, await auth.getTokenInfo()),
    );
    return dispatch(request.methodName || "", request.payload);
  },
});
