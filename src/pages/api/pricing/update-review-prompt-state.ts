import type { APIRoute } from 'astro';
import { updateReviewPromptState } from '../../../backend/pricing.server';
import { handleRpc } from '../../../backend/rpc';

/** POST /api/pricing/update-review-prompt-state — body `{ args: [...] }` is spread into `updateReviewPromptState`. */
export const POST: APIRoute = ({ request }) => handleRpc(request, 'update-review-prompt-state', updateReviewPromptState);
