import type { APIRoute } from 'astro';
import { getAppInstance } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-app-instance — body `{ args: [...] }` is spread into `getAppInstance`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-app-instance', getAppInstance);
