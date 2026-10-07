import type { APIRoute } from 'astro';
import { getWholesaleContacts } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-wholesale-contacts — body `{ args: [...] }` is spread into `getWholesaleContacts`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-wholesale-contacts', getWholesaleContacts);
