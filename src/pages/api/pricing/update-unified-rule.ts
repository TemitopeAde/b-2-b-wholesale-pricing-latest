import type { APIRoute } from 'astro';
import { updateUnifiedRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/update-unified-rule — body `{ args: [...] }` is spread into `updateUnifiedRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'update-unified-rule', updateUnifiedRule);
