import type { APIRoute } from 'astro';
import { mergeSplitRuleFamilies } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/merge-split-rule-families — body `{ args: [...] }` is spread into `mergeSplitRuleFamilies`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'merge-split-rule-families', mergeSplitRuleFamilies);
