import type { APIRoute } from 'astro';
import { updateNotificationSetting } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/update-notification-setting — body `{ args: [...] }` is spread into `updateNotificationSetting`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'update-notification-setting', updateNotificationSetting);
