import { app } from "@wix/astro/builders";
import myPage from "./extensions/dashboard/pages/my-page/my-page.extension.ts";

import galleryPage from "./extensions/site/plugins/gallery-page/gallery-page.extension.ts";

import productPage from "./extensions/site/plugins/product-page/product-page.extension.ts";

import requestForm from "./extensions/site/widgets/request-form/request-form.extension.ts";

import wholesaleTools from "./extensions/backend/app-tools/wholesale-tools/wholesale-tools.extension.ts";

import wholesaleProvider from "./extensions/backend/service-plugins/wholesale-provider/wholesale-provider.extension.ts";

import wholesalePricing from './extensions/backend/service-plugins/wholesale-pricing/wholesale-pricing.extension.ts';

import wholesaleShipping from './extensions/backend/service-plugins/wholesale-shipping/wholesale-shipping.extension.ts';

export default app()
  .use(myPage)
  .use(galleryPage)
  .use(productPage)
  .use(requestForm)
  .use(wholesaleTools)
  .use(wholesaleProvider)
  .use(wholesalePricing).use(wholesaleShipping);
