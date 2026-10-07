import type { APIRoute } from 'astro';
import { getAllStoreCategories } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-all-store-categories — body `{ args: [...] }` is spread into `getAllStoreCategories`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-all-store-categories', getAllStoreCategories);
