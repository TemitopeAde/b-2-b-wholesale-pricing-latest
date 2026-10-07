import type { APIRoute } from 'astro';
import { getUnifiedRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-unified-rule — body `{ args: [...] }` is spread into `getUnifiedRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-unified-rule', getUnifiedRule);
