import type { APIRoute } from 'astro';
import { sendInstallGuideEmail } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/send-install-guide-email — body `{ args: [...] }` is spread into `sendInstallGuideEmail`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'send-install-guide-email', sendInstallGuideEmail);
