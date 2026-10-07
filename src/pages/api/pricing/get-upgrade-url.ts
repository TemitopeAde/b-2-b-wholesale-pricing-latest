import type { APIRoute } from 'astro';
import { getUpgradeUrl } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-upgrade-url — body `{ args: [...] }` is spread into `getUpgradeUrl`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-upgrade-url', getUpgradeUrl);
