import type { APIRoute } from 'astro';
import { getMembersByIds } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-members-by-ids — body `{ args: [...] }` is spread into `getMembersByIds`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-members-by-ids', getMembersByIds);
