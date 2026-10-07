import type { APIRoute } from 'astro';
import { fetchAllProductsV3 } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/fetch-all-products-v3 — body `{ args: [...] }` is spread into `fetchAllProductsV3`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'fetch-all-products-v3', fetchAllProductsV3);
