import { extensions } from "@wix/astro/builders";
import { LAYOUT } from "@wix/react-component-schema";
import { withEditorElementDefaults } from "@wix/react-component-utils";
import merge from "deepmerge";
import { editorElement } from "./wholesale-request-form.generated";
import { defaultProps } from "./wholesale-request-form.props";
import componentUrl from "./component.tsx?url";
import componentPreviewUrl from "./component.preview.tsx?url";

const editorElementWithDefaults = withEditorElementDefaults(
  editorElement,
  defaultProps,
);

export default extensions.editorReactComponent({
  id: "b00dd1a1-fb32-44cf-8fb3-2e4ee9d295a3",
  type: "wholesale_appllication.WholesaleRequestForm",
  displayName: "Wholesale Request Form",
  description:
    "Collect wholesale partner applications from signed-in site members, with customizable fields, labels, and application status messages.",
  editorElement: merge(editorElementWithDefaults, {
    layout: {
      resizeDirection: LAYOUT.RESIZE_DIRECTION.horizontal,
      contentResizeDirection: LAYOUT.CONTENT_RESIZE_DIRECTION.vertical,
    },
  }),
  installation: {
    staticContainer: "HOMEPAGE",
    initialSize: {
      width: {
        sizingType: LAYOUT.SIZING_TYPE.pixels,
        pixels: 450,
      },
      height: {
        sizingType: LAYOUT.SIZING_TYPE.content,
      },
    },
  },
  resources: {
    client: {
      componentUrl,
    },
    editor: {
      componentUrl: componentPreviewUrl,
    },
  },
});
