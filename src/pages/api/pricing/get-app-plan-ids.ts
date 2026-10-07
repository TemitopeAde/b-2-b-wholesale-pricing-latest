import type { APIRoute } from 'astro';
import { getAppPlanIds } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-app-plan-ids — body `{ args: [...] }` is spread into `getAppPlanIds`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-app-plan-ids', getAppPlanIds);
