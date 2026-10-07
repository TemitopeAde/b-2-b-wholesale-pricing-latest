import type { APIRoute } from 'astro';
import { removeMembersFromDiscountRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/remove-members-from-discount-rule — body `{ args: [...] }` is spread into `removeMembersFromDiscountRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'remove-members-from-discount-rule', removeMembersFromDiscountRule);
