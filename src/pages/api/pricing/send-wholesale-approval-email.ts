import type { APIRoute } from 'astro';
import { sendWholesaleApprovalEmail } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/send-wholesale-approval-email — body `{ args: [...] }` is spread into `sendWholesaleApprovalEmail`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'send-wholesale-approval-email', sendWholesaleApprovalEmail);
