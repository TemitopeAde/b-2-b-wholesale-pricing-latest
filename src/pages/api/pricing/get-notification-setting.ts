import type { APIRoute } from 'astro';
import { getNotificationSetting } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-notification-setting — body `{ args: [...] }` is spread into `getNotificationSetting`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-notification-setting', getNotificationSetting);
