import type { APIRoute } from 'astro';
import { getReviewPromptState } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/get-review-prompt-state — body `{ args: [...] }` is spread into `getReviewPromptState`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'get-review-prompt-state', getReviewPromptState);
