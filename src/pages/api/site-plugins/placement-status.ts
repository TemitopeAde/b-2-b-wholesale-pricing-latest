import type { APIRoute } from 'astro';
import { getSitePluginPlacementStatus } from '../../../backend/site-plugins.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/site-plugins/placement-status — `{ result: { [pluginId]: placedInSlot } }`. */
export const POST: APIRoute = ({ request }) =>
  handleRpc(request, 'site-plugins/placement-status', getSitePluginPlacementStatus);
