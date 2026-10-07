import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';

import galleryPage from './extensions/site/plugins/gallery-page/gallery-page.extension.ts';

export default app()
  .use(myPage).use(galleryPage);
