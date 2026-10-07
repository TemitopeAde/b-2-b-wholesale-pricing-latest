import type { APIRoute } from 'astro';
import { findContactByEmail } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/find-contact-by-email — body `{ args: [...] }` is spread into `findContactByEmail`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'find-contact-by-email', findContactByEmail);
