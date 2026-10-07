import type { APIRoute } from 'astro';
import { createUnifiedRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/create-unified-rule — body `{ args: [...] }` is spread into `createUnifiedRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'create-unified-rule', createUnifiedRule);
