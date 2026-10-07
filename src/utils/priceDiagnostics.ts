import type { ProductWholesalePriceResponse } from '../components/backendType';

/**
 * Logs why wholesale prices were not applied, grouped by reason, including the
 * backend's catalog version and lookup error for `slug_not_found` entries.
 * `backendHasDiagnostics=false` on a `slug_not_found` means the site is still
 * running an app version released before these fields were added.
 */
export function logPriceDiagnostics(
  prefix: string,
  requestedSlugs: string[],
  response: Record<string, ProductWholesalePriceResponse>
) {
  const reasonCounts: Record<string, number> = {};
  const failures: Array<Record<string, unknown>> = [];

  requestedSlugs.forEach((slug) => {
    const priceData = response?.[slug];
    const applied = Boolean(
      priceData?.eligible && priceData?.hasWholesalePrice && priceData?.formattedWholesalePrice
    );
    const reason = applied ? 'applied' : priceData?.reason || (priceData ? 'unknown' : 'missing_from_response');
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

    if (!applied) {
      failures.push({
        slug,
        reason,
        catalogVersion: priceData?.catalogVersion || 'none',
        lookupError: priceData?.lookupError || 'none',
        backendHasDiagnostics: priceData ? 'lookupError' in priceData : false,
      });
    }
  });

  const summary = `${prefix} Price diagnostics | requestedCount=${requestedSlugs.length} | responseCount=${Object.keys(response || {}).length} | reasonCounts=${JSON.stringify(reasonCounts)}`;

  if (failures.length === 0) {
    console.info(summary);
    return;
  }

  console.warn(`${summary} | failedCount=${failures.length}`);
  if (failures.length === requestedSlugs.length) {
    console.warn(`${prefix} All requested slugs failed | firstFailure=${JSON.stringify(failures[0])}`);
  }
  failures.forEach((failure) => {
    console.warn(`${prefix} Price not applied | ${JSON.stringify(failure)}`);
  });
}
