import type { APIRoute } from 'astro';
import { getContactsByCustomerStatus } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-contacts-by-customer-status — body `{ args: [...] }` is spread into `getContactsByCustomerStatus`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-contacts-by-customer-status', getContactsByCustomerStatus);
