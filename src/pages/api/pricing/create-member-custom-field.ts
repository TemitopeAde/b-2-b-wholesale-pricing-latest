import type { APIRoute } from 'astro';
import { createMemberCustomField } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/create-member-custom-field — body `{ args: [...] }` is spread into `createMemberCustomField`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'create-member-custom-field', createMemberCustomField);
