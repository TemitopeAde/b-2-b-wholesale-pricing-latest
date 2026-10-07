import type { APIRoute } from 'astro';
import { fetchAllProductsV1 } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/fetch-all-products-v1 — body `{ args: [...] }` is spread into `fetchAllProductsV1`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'fetch-all-products-v1', fetchAllProductsV1);
