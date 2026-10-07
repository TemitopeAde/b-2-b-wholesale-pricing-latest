import type { APIRoute } from 'astro';
import { updateProductById } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/update-product-by-id — body `{ args: [...] }` is spread into `updateProductById`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'update-product-by-id', updateProductById);
