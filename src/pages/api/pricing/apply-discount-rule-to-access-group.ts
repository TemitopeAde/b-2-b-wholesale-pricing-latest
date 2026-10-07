import type { APIRoute } from 'astro';
import { applyDiscountRuleToAccessGroup } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/apply-discount-rule-to-access-group — body `{ args: [...] }` is spread into `applyDiscountRuleToAccessGroup`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'apply-discount-rule-to-access-group', applyDiscountRuleToAccessGroup);
