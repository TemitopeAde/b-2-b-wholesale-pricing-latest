import type { APIRoute } from 'astro';
import { getProductById } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-product-by-id — body `{ args: [...] }` is spread into `getProductById`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-product-by-id', getProductById);
