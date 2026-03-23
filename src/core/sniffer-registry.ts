import { join } from 'node:path';
import { loadPlugin } from '../plugins/plugin-loader.js';
import type { SnifferEntry, PluginEntry, SnifferExport } from '../sniffers/sniffer-interface.js';
import { warn } from '../utils/logger.js';

const SNIFFERS_DIR = join(__dirname, '..', 'sniffers');

interface RegistryEntry {
  snifferPath: string;
  config: Record<string, unknown>;
}

export class SnifferRegistry {
  private sniffers = new Map<string, RegistryEntry>();

  registerBuiltIn(): void {
    this.sniffers.set('prop-explosion', {
      snifferPath: join(SNIFFERS_DIR, 'prop-explosion-sniffer.js'),
      config: {},
    });

    this.sniffers.set('god-hook', {
      snifferPath: join(SNIFFERS_DIR, 'god-hook-sniffer.js'),
      config: {},
    });

    this.sniffers.set('prop-drilling', {
      snifferPath: join(SNIFFERS_DIR, 'prop-drilling-sniffer.js'),
      config: {},
    });
  }

  registerPlugin(pluginEntry: PluginEntry, basePath: string): void {
    try {
      const loaded = loadPlugin(pluginEntry, basePath);
      const name = loaded.module.name;

      if (this.sniffers.has(name)) {
        warn(`Plugin "${name}" overrides an existing sniffer with the same name`);
      }

      this.sniffers.set(name, {
        snifferPath: loaded.snifferPath,
        config: loaded.config,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warn(`Failed to register plugin "${pluginEntry.path}": ${message}`);
    }
  }

  getEnabledSniffers(
    snifferConfig: Record<string, Record<string, unknown>>,
  ): SnifferEntry[] {
    const enabled: SnifferEntry[] = [];

    for (const [name, entry] of this.sniffers) {
      const userConfig = snifferConfig[name];

      // If the sniffer is explicitly disabled, skip it
      if (userConfig && userConfig.enabled === false) {
        continue;
      }

      // Merge user config over defaults (excluding the 'enabled' flag)
      const mergedConfig: Record<string, unknown> = {
        ...entry.config,
        ...(userConfig ?? {}),
      };

      enabled.push({
        name,
        snifferPath: entry.snifferPath,
        config: mergedConfig,
      });
    }

    return enabled;
  }
}
