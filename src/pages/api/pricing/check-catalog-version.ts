import type { APIRoute } from 'astro';
import { checkCatalogVersion } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/check-catalog-version — body `{ args: [...] }` is spread into `checkCatalogVersion`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'check-catalog-version', checkCatalogVersion);
