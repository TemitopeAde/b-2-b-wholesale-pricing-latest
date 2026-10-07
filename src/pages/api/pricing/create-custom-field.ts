import type { APIRoute } from 'astro';
import { createCustomField } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/create-custom-field — body `{ args: [...] }` is spread into `createCustomField`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'create-custom-field', createCustomField);
