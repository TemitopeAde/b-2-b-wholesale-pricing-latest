import type { APIRoute } from 'astro';
import { processBulkCsvData } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/process-bulk-csv-data — body `{ args: [...] }` is spread into `processBulkCsvData`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'process-bulk-csv-data', processBulkCsvData);
