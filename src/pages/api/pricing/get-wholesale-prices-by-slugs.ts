import type { APIRoute } from 'astro';
import { getWholesalePricesBySlugs } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-wholesale-prices-by-slugs — body `{ args: [...] }` is spread into `getWholesalePricesBySlugs`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-wholesale-prices-by-slugs', getWholesalePricesBySlugs);
