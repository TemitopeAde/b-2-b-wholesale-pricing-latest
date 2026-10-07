import type { APIRoute } from 'astro';
import { addMembersToDiscountRule } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/add-members-to-discount-rule — body `{ args: [...] }` is spread into `addMembersToDiscountRule`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'add-members-to-discount-rule', addMembersToDiscountRule);
