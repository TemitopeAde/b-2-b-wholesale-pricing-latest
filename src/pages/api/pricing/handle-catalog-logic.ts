import type { APIRoute } from 'astro';
import { handleCatalogLogic } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/handle-catalog-logic — body `{ args: [...] }` is spread into `handleCatalogLogic`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'handle-catalog-logic', handleCatalogLogic);
