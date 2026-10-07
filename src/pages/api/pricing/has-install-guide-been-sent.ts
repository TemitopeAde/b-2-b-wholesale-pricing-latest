import type { APIRoute } from 'astro';
import { hasInstallGuideBeenSent } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/has-install-guide-been-sent — body `{ args: [...] }` is spread into `hasInstallGuideBeenSent`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'has-install-guide-been-sent', hasInstallGuideBeenSent);
