import type { APIRoute } from 'astro';
import { getConfiguration } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-configuration — body `{ args: [...] }` is spread into `getConfiguration`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-configuration', getConfiguration);
