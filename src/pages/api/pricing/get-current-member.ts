import type { APIRoute } from 'astro';
import { getCurrentMember } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-current-member — body `{ args: [...] }` is spread into `getCurrentMember`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-current-member', getCurrentMember);
