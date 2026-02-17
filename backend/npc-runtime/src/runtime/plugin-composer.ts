import type { Bot, Plugin } from "mineflayer";

export interface MineflayerPluginSpec {
  name: string;
  plugin: Plugin;
  enabled?: boolean;
}

export type PluginSkipReason = "disabled" | "duplicate" | "already_loaded";

export interface PluginCompositionReport {
  requested: string[];
  loaded: string[];
  skipped: Array<{
    name: string;
    reason: PluginSkipReason;
  }>;
}

export function composeMineflayerPlugins(
  bot: Bot,
  plugins: readonly MineflayerPluginSpec[],
): PluginCompositionReport {
  const requested = plugins.map(plugin => plugin.name);
  const loaded: string[] = [];
  const skipped: PluginCompositionReport["skipped"] = [];
  const seen = new Set<Plugin>();
  const toLoad: Plugin[] = [];

  for (const entry of plugins) {
    if (entry.enabled === false) {
      skipped.push({ name: entry.name, reason: "disabled" });
      continue;
    }

    if (seen.has(entry.plugin)) {
      skipped.push({ name: entry.name, reason: "duplicate" });
      continue;
    }
    seen.add(entry.plugin);

    if (bot.hasPlugin(entry.plugin)) {
      skipped.push({ name: entry.name, reason: "already_loaded" });
      continue;
    }

    toLoad.push(entry.plugin);
    loaded.push(entry.name);
  }

  if (toLoad.length > 0) {
    bot.loadPlugins(toLoad);
  }

  return {
    requested,
    loaded,
    skipped,
  };
}
