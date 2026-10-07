import type { APIRoute } from 'astro';
import { getMemberDetails } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-member-details — body `{ args: [...] }` is spread into `getMemberDetails`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-member-details', getMemberDetails);
