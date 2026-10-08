import { extensions } from '@wix/astro/builders'

export default extensions.sitePlugin({
  id: '6a4f07fa-6865-42ab-b448-507bcc573a3b',
  name: 'Wholesale Product Price',
  marketData: {
    name: 'Wholesale Product Price',
    description: 'Shows the wholesale price to approved B2B members on Wix Stores product pages.',
    logoUrl: '{{BASE_URL}}/product-page-logo.svg',
  },
  placements: [
    {
      // Old Wix Stores product page
      appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
      widgetId: '13a94f09-2766-3c40-4a32-8edb5acdd8bc',
      slotId: 'product-page-details-3',
    },
    {
      // New Wix Stores product page
      appDefinitionId: 'a0c68605-c2e7-4c8d-9ea1-767f9770e087',
      widgetId: '6a25b678-53ec-4b37-a190-65fcd1ca1a63',
      slotId: 'product-page-details-2',
    },
  ],
  installation: { autoAdd: true },
  tagName: 'product-page',
  element: './extensions/site/plugins/product-page/product-page.tsx',
  settings: './extensions/site/plugins/product-page/product-page.panel.tsx',
});
