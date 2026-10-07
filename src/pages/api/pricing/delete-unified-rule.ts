import type { APIRoute } from 'astro';
import { deleteUnifiedRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/delete-unified-rule — body `{ args: [...] }` is spread into `deleteUnifiedRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'delete-unified-rule', deleteUnifiedRule);
