import type { APIRoute } from 'astro';
import { revokeWholesaleAccess } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/revoke-wholesale-access — body `{ args: [...] }` is spread into `revokeWholesaleAccess`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'revoke-wholesale-access', revokeWholesaleAccess);
