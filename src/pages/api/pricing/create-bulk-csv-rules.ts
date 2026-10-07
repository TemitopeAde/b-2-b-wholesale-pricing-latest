import type { APIRoute } from 'astro';
import { createBulkCsvRules } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/create-bulk-csv-rules — body `{ args: [...] }` is spread into `createBulkCsvRules`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'create-bulk-csv-rules', createBulkCsvRules);
