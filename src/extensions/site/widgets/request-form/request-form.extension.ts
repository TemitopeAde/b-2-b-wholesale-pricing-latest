import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: 'c44c74de-1236-40be-9a9f-47d4d3f01ce8',
  name: 'Request form',
  width: {
    defaultWidth: 450,
    allowStretch: true
  },
  height: {
    defaultHeight: 250
  },
  installation: {
    autoAdd: false
  },
  behaviors: {
    dashboard: {
      // B2B Wholesale pricing dashboard (my-page)
      dashboardPageComponentId: '3884c1ca-07cb-4aa1-bd59-19be39f1d3a3',
    },
  },
  presets: [
    {
      id: '94fb5a5f-89e2-4c67-baeb-801974d26ea7',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/request-form-thumbnail.png',
    },
  ],
  
  tagName: 'request-form',
  element: './extensions/site/widgets/request-form/request-form.tsx',
  settings: './extensions/site/widgets/request-form/request-form.panel.tsx',
});
