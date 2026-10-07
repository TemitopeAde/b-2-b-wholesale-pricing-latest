import type { APIRoute } from 'astro';
import { getCategoryName } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-category-name — body `{ args: [...] }` is spread into `getCategoryName`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-category-name', getCategoryName);
