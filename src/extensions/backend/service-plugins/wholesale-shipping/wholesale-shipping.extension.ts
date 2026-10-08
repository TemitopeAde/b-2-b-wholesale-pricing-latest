import { extensions } from '@wix/astro/builders'

export default extensions.ecomShippingRates({
  id: '53bffa78-7a8c-426a-859a-45a751d64da9',
  name: 'wholesale-shipping',
  description: 'Wholesale and B2C shipping rates from your B2B Wholesale Pricing shipping rules',
  fallbackDefinitionMandatory: false,
  source: './extensions/backend/service-plugins/wholesale-shipping/wholesale-shipping.ts',
});
