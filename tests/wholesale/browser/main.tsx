import React from "react";
import { createRoot } from "react-dom/client";
import Form from "../../../src/extensions/site/components/wholesale-request-form/wholesale-request-form";
import { defaultProps } from "../../../src/extensions/site/components/wholesale-request-form/wholesale-request-form.props";
const direction =
  new URLSearchParams(location.search).get("rtl") === "true" ? "rtl" : "ltr";
createRoot(document.getElementById("root")!).render(
  <Form
    {...defaultProps}
    id="browser-form"
    direction={direction}
    showBusinessName
    showAdditionalInfo
    showProductCategories
  />,
);
