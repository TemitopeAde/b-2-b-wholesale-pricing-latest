import type { APIRoute } from 'astro';
import { searchWholesaleContacts } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/search-wholesale-contacts — body `{ args: [...] }` is spread into `searchWholesaleContacts`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'search-wholesale-contacts', searchWholesaleContacts);
