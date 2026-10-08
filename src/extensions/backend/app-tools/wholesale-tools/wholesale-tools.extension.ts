import { extensions } from "@wix/astro/builders";
import { wholesaleTools } from "../../../../backend/wholesale/tool-definitions";

export default extensions.appTools({
  id: "2179b3da-2f2e-4984-b448-221482167b2a",
  name: "wholesale-tools",
  tools: wholesaleTools,
});
