import { auth } from '@wix/essentials';
import { plugins } from '@wix/site-plugins';

const elevatedGetPlacementStatus = auth.elevate(plugins.getPlacementStatus);

/** Placement status of this app's site plugins on the current site (read-only, app identity). */
export async function getSitePluginPlacementStatus(): Promise<Record<string, boolean>> {
  const { placementStatuses = [] } = await elevatedGetPlacementStatus();
  const result: Record<string, boolean> = {};
  placementStatuses.forEach((status) => {
    if (status.pluginId) {
      result[status.pluginId] = Boolean(status.placedInSlot);
    }
  });
  return result;
}
