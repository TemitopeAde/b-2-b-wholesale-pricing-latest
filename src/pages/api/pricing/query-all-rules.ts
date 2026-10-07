import type { APIRoute } from 'astro';
import { queryAllRules } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/query-all-rules — body `{ args: [...] }` is spread into `queryAllRules`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'query-all-rules', queryAllRules);
