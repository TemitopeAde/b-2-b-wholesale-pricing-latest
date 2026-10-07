import type { APIRoute } from 'astro';
import { sendNewApplicationNotificationToOwner } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/send-new-application-notification-to-owner — body `{ args: [...] }` is spread into `sendNewApplicationNotificationToOwner`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'send-new-application-notification-to-owner', sendNewApplicationNotificationToOwner);
