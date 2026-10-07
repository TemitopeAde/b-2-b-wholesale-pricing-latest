import type { APIRoute } from 'astro';
import { getAllMembers } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-all-members — body `{ args: [...] }` is spread into `getAllMembers`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-all-members', getAllMembers);
