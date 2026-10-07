import type { APIRoute } from 'astro';
import { getContact } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-contact — body `{ args: [...] }` is spread into `getContact`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-contact', getContact);
