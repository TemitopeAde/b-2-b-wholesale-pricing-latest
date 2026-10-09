import type { APIRoute } from 'astro';
import { repairWholesaleRuleGates } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/repair-wholesale-rule-gates — body `{ args: [...] }` is spread into `repairWholesaleRuleGates`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'repair-wholesale-rule-gates', repairWholesaleRuleGates);
