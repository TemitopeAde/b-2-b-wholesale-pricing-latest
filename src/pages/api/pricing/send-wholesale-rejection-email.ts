import type { APIRoute } from 'astro';
import { sendWholesaleRejectionEmail } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/send-wholesale-rejection-email — body `{ args: [...] }` is spread into `sendWholesaleRejectionEmail`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'send-wholesale-rejection-email', sendWholesaleRejectionEmail);
