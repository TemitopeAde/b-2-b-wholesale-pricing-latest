import type { APIRoute } from 'astro';
import { getAllProductsCategoryV3 } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-all-products-category-v3 — body `{ args: [...] }` is spread into `getAllProductsCategoryV3`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-all-products-category-v3', getAllProductsCategoryV3);
