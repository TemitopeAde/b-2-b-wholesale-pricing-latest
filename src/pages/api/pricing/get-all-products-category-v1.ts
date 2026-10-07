import type { APIRoute } from 'astro';
import { getAllProductsCategoryV1 } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-all-products-category-v1 — body `{ args: [...] }` is spread into `getAllProductsCategoryV1`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-all-products-category-v1', getAllProductsCategoryV1);
