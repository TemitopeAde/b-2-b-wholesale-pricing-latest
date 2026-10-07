import type { APIRoute } from 'astro';
import { getMembersFromDiscountRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-members-from-discount-rule — body `{ args: [...] }` is spread into `getMembersFromDiscountRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-members-from-discount-rule', getMembersFromDiscountRule);
