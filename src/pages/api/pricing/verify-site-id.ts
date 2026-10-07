import type { APIRoute } from 'astro';
import { verifySiteId } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/verify-site-id — body `{ args: [...] }` is spread into `verifySiteId`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'verify-site-id', verifySiteId);
