// This file wires your component with its default props and exports it for use by the extension.
// Please do not modify the structure or logic of this file

import { withDefaults } from '@wix/react-component-utils';
import Component from './wholesale-request-form';
import { defaultProps } from './wholesale-request-form.props';

const WholesaleRequestForm = withDefaults(
  Component,
  defaultProps
);

export default WholesaleRequestForm;
