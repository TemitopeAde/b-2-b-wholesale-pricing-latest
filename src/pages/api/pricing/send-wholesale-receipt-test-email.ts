import type { APIRoute } from 'astro';
import { sendWholesaleReceiptTestEmail } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

export const POST: APIRoute = ({ request }) =>
  handleRpc(request, 'send-wholesale-receipt-test-email', sendWholesaleReceiptTestEmail);
