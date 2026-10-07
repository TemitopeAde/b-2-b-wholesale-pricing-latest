import type { APIRoute } from 'astro';
import { markInstallGuideSent } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/mark-install-guide-sent — body `{ args: [...] }` is spread into `markInstallGuideSent`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'mark-install-guide-sent', markInstallGuideSent);
