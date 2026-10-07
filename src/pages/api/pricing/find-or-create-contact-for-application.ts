import type { APIRoute } from 'astro';
import { findOrCreateContactForApplication } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/find-or-create-contact-for-application — body `{ args: [...] }` is spread into `findOrCreateContactForApplication`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'find-or-create-contact-for-application', findOrCreateContactForApplication);
