import { extensions } from '@wix/astro/builders'

export default extensions.sitePlugin({
  id: '397c558e-1cb3-4af9-a776-6740d058b237',
  name: 'Wholesale Gallery',
  marketData: {
    name: 'Wholesale Gallery Price',
    description: 'Shows wholesale prices to approved B2B members on Wix Stores gallery product cards.',
    logoUrl: '{{BASE_URL}}/gallery-page-logo.svg',
  },
  placements: [
    {
      // Wix Stores Gallery widget
      appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
      widgetId: '13afb094-84f9-739f-44fd-78d036adb028',
      slotId: 'gallery-products-top',
    },
    {
      // Wix Stores Category page
      appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
      widgetId: 'bda15dc1-816d-4ff3-8dcb-1172d5343cce',
      slotId: 'gallery-products-top',
    },
  ],
  installation: { autoAdd: false },
  tagName: 'gallery-page',
  element: './extensions/site/plugins/gallery-page/gallery-page.tsx',
  settings: './extensions/site/plugins/gallery-page/gallery-page.panel.tsx',
});
