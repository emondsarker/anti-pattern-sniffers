import { loadPlugin } from '../plugins/plugin-loader.js';
import type { SnifferEntry, PluginEntry, FrameworkDefinition } from '../sniffers/sniffer-interface.js';
import { warn } from '../utils/logger.js';
import { REACT_FRAMEWORK } from '../sniffers/react/index.js';
import { EXPRESS_FRAMEWORK } from '../sniffers/express/index.js';
import { NESTJS_FRAMEWORK } from '../sniffers/nestjs/index.js';

const BUILT_IN_FRAMEWORKS: FrameworkDefinition[] = [REACT_FRAMEWORK, EXPRESS_FRAMEWORK, NESTJS_FRAMEWORK];

interface RegistryEntry {
  snifferPath: string;
  config: Record<string, unknown>;
}

export class SnifferRegistry {
  private sniffers = new Map<string, RegistryEntry>();
  private frameworks = new Map<string, FrameworkDefinition>();

  /**
   * Register a framework and all its sniffers.
   * Sniffers are stored with both namespaced (framework/name) and un-namespaced (name) keys
   * for backward compatibility.
   */
  registerFramework(framework: FrameworkDefinition): void {
    this.frameworks.set(framework.name, framework);

    for (const sniffer of framework.sniffers) {
      const namespacedName = `${framework.name}/${sniffer.name}`;
      this.sniffers.set(namespacedName, {
        snifferPath: sniffer.path,
        config: sniffer.defaultConfig ?? {},
      });

      // Also register without namespace for backward compat
      if (!this.sniffers.has(sniffer.name)) {
        this.sniffers.set(sniffer.name, {
          snifferPath: sniffer.path,
          config: sniffer.defaultConfig ?? {},
        });
      }
    }
  }

  /**
   * Register built-in frameworks. If enabledFrameworks is specified,
   * only register those. Otherwise register all.
   */
  registerBuiltIn(enabledFrameworks?: string[]): void {
    for (const fw of BUILT_IN_FRAMEWORKS) {
      if (!enabledFrameworks || enabledFrameworks.includes(fw.name)) {
        this.registerFramework(fw);
      }
    }
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

  getAvailableFrameworks(): FrameworkDefinition[] {
    return [...this.frameworks.values()];
  }

  getEnabledSniffers(
    snifferConfig: Record<string, Record<string, unknown>>,
  ): SnifferEntry[] {
    const enabled: SnifferEntry[] = [];
    const seen = new Set<string>(); // avoid duplicates from namespaced + un-namespaced

    for (const [name, entry] of this.sniffers) {
      // Skip un-namespaced duplicates if the namespaced version is also registered
      if (!name.includes('/')) {
        // Skip un-namespaced entry if any namespaced version exists
        const hasNamespaced = [...this.sniffers.keys()].some(k => k.endsWith(`/${name}`));
        if (hasNamespaced && !snifferConfig[name]) continue;
      }

      // Check config — try both namespaced and un-namespaced keys
      const userConfig = snifferConfig[name]
        ?? (name.includes('/') ? snifferConfig[name.split('/')[1]] : undefined);

      if (userConfig && userConfig.enabled === false) {
        continue;
      }

      // Use the short name (without framework prefix) for dedup
      const shortName = name.includes('/') ? name.split('/')[1] : name;
      if (seen.has(shortName)) continue;
      seen.add(shortName);

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
