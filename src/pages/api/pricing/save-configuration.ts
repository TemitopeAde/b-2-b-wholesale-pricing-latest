import type { APIRoute } from 'astro';
import { saveConfiguration } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/save-configuration — body `{ args: [...] }` is spread into `saveConfiguration`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'save-configuration', saveConfiguration);
