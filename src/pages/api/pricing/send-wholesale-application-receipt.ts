import type { APIRoute } from 'astro';
import { sendWholesaleApplicationReceipt } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

export const POST: APIRoute = ({ request }) =>
  handleRpc(request, 'send-wholesale-application-receipt', sendWholesaleApplicationReceipt);
