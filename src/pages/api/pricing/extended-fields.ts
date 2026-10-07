import type { APIRoute } from 'astro';
import { ExtendedFields } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/extended-fields — body `{ args: [...] }` is spread into `ExtendedFields`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'extended-fields', ExtendedFields);
