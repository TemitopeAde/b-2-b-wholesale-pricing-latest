import type { APIRoute } from 'astro';
import { isContactWholesale } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/is-contact-wholesale — body `{ args: [...] }` is spread into `isContactWholesale`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'is-contact-wholesale', isContactWholesale);
