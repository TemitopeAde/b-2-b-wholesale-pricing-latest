import React, { type FC, useCallback, useEffect, useState } from 'react';
import { dashboard } from '@wix/dashboard';
import { httpClient } from '@wix/essentials';
import { Badge, Button, Card, Notice, Text } from './ui';
import { DashIcons } from './Dashboard/icons';

/** The app's site plugins. IDs must match the `id` in each plugin's `.extension.ts`. */
const SITE_PLUGINS = [
  {
    id: '397c558e-1cb3-4af9-a776-6740d058b237',
    name: 'Wholesale Gallery Price',
    location: 'Store gallery and category pages',
  },
  {
    id: '6a4f07fa-6865-42ab-b448-507bcc573a3b',
    name: 'Wholesale Product Price',
    location: 'Product pages',
  },
] as const;

type PluginId = (typeof SITE_PLUGINS)[number]['id'];

// Kept in a variable on purpose: Vite rewrites `new URL(<literal>, import.meta.url)` into an asset lookup.
const MODULE_URL = import.meta.url;

/** Placement statuses from the backend route, which calls the Site Plugins SDK as the app. */
async function fetchPlacementStatus(): Promise<Record<string, boolean>> {
  const url = new URL('/api/site-plugins/placement-status', MODULE_URL).href;
  const res = await httpClient.fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args: [] }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `placement-status failed with status ${res.status}`);
  }
  return body?.result ?? {};
}

/** Messages for the documented `addSitePlugin()` error codes. */
const ADD_PLUGIN_ERRORS: Record<number, string> = {
  3001: 'Every slot for this plugin is already in use. Free one up in the Editor and try again.',
  3002: 'No matching slot was found. Make sure Wix Stores is on your site.',
  3007: 'Publish your site first, then add the plugin.',
};
const ADD_PLUGIN_ABORTED = 3006;

export const SitePluginsCard: FC = () => {
  const [placed, setPlaced] = useState<Partial<Record<PluginId, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<PluginId | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setPlaced(await fetchPlacementStatus());
    } catch (error) {
      console.error('[SitePluginsCard] placement status failed', error);
      setLoadError('Could not check where the plugins are placed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleAdd = async (pluginId: PluginId) => {
    setAddingId(pluginId);
    setAddError(null);
    try {
      // No slot given: Wix uses the first free slot from the plugin's placements.
      await dashboard.addSitePlugin(pluginId, {});
      dashboard.showToast({ message: 'Plugin added to your site.', type: 'success' });
      await loadStatus();
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code !== ADD_PLUGIN_ABORTED) {
        console.error('[SitePluginsCard] addSitePlugin failed', error);
        setAddError(
          (code !== undefined && ADD_PLUGIN_ERRORS[code]) || 'The plugin could not be added. Please try again.'
        );
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Card aria-label="Site plugins">
      <Card.Header
        title="Site plugins"
        subtitle="Show wholesale prices on your store pages."
        suffix={
          <Button
            variant="ghost"
            size="small"
            prefixIcon={<DashIcons.Refresh size={14} />}
            onClick={() => void loadStatus()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />
      <Card.Content>
        {loadError && <Notice tone="error">{loadError}</Notice>}
        {addError && <Notice tone="warning">{addError}</Notice>}
        {SITE_PLUGINS.map((plugin) => {
          const isPlaced = placed[plugin.id];
          return (
            <div
              key={plugin.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text tagName="div" weight="bold">{plugin.name}</Text>
                <Text tagName="div" size="small" secondary>{plugin.location}</Text>
              </div>
              {isLoading ? (
                <Badge tone="neutral">Checking…</Badge>
              ) : isPlaced ? (
                <Badge tone="success">Added to site</Badge>
              ) : (
                <>
                  <Badge tone="warning">Not added</Badge>
                  {!loadError && (
                    <Button
                      size="small"
                      prefixIcon={<DashIcons.Plus size={14} />}
                      loading={addingId === plugin.id}
                      disabled={addingId !== null}
                      onClick={() => void handleAdd(plugin.id)}
                    >
                      Add plugin
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
};
