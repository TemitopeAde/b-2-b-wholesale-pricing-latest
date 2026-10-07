import type { APIRoute } from 'astro';
import { getAllContacts } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-all-contacts — body `{ args: [...] }` is spread into `getAllContacts`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-all-contacts', getAllContacts);
