import type { APIRoute } from 'astro';
import { resetConfigurationToDefaults } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/reset-configuration-to-defaults — body `{ args: [...] }` is spread into `resetConfigurationToDefaults`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'reset-configuration-to-defaults', resetConfigurationToDefaults);
