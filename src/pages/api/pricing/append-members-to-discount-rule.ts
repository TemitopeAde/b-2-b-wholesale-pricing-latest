import type { APIRoute } from 'astro';
import { appendMembersToDiscountRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/append-members-to-discount-rule — body `{ args: [...] }` is spread into `appendMembersToDiscountRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'append-members-to-discount-rule', appendMembersToDiscountRule);
