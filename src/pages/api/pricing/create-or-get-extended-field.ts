import type { APIRoute } from 'astro';
import { createOrGetExtendedField } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/create-or-get-extended-field — body `{ args: [...] }` is spread into `createOrGetExtendedField`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'create-or-get-extended-field', createOrGetExtendedField);
