// This file is the Editor preview entry point for your component.
// Override or extend it when you need Editor-specific behavior or rendering
// (e.g. mock data, Editor-only interactions, or a different visual state).

import React from "react";
import type { ComponentProps, FC } from "react";
import {
  withDefaults,
  withFallbackPlaceholder,
} from "@wix/react-component-utils";
import Component from "./wholesale-request-form";
import { defaultProps } from "./wholesale-request-form.props";

const WholesaleRequestFormPreview: FC<ComponentProps<typeof Component>> = (
  props,
) => {
  return <Component {...props} />;
};

const WholesaleRequestFormPreviewWithFallback = withFallbackPlaceholder(
  WholesaleRequestFormPreview,
  {
    requiredDataFields: ["language"],
    rootClassName: "wholesale-request-form",
  },
);

export default withDefaults(
  WholesaleRequestFormPreviewWithFallback,
  defaultProps,
);
