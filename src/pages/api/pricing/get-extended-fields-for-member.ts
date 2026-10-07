import type { APIRoute } from 'astro';
import { getExtendedFieldsForMember } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-extended-fields-for-member — body `{ args: [...] }` is spread into `getExtendedFieldsForMember`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-extended-fields-for-member', getExtendedFieldsForMember);
