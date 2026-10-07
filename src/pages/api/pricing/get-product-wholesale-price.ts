import type { APIRoute } from 'astro';
import { getProductWholesalePrice } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-product-wholesale-price — body `{ args: [...] }` is spread into `getProductWholesalePrice`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-product-wholesale-price', getProductWholesalePrice);
