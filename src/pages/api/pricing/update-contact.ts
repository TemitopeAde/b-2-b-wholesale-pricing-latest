import type { APIRoute } from 'astro';
import { updateContact } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/update-contact — body `{ args: [...] }` is spread into `updateContact`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'update-contact', updateContact);
