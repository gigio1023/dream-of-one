import { randomUUID } from "node:crypto";
import type { EventEmitter } from "node:events";
import mineflayer, { type Bot, type BotOptions } from "mineflayer";
import type { DecisionEnvelope } from "../contracts/types.js";
import type { RuntimeConfig } from "../config.js";
import type { ActionFailure } from "./action-runner.js";
import {
  awaitLifecycleGates,
  type LifecycleEventSource,
  type LifecycleGateResult,
} from "./lifecycle-gates.js";
import {
  createMineflayerEventNormalizer,
  type EventNormalizerHandle,
  type NormalizedMineflayerEvent,
} from "./event-normalizer.js";
import { dispatchDecisionToMineflayer, type DecisionDispatchResult } from "./decision-bridge.js";
import { composeMineflayerPlugins, type MineflayerPluginSpec, type PluginCompositionReport } from "./plugin-composer.js";
import { MineflayerActionRunner } from "./action-runner.js";

export interface MineflayerRuntimeOptions {
  createBot?: (options: BotOptions) => Bot;
  plugins?: readonly MineflayerPluginSpec[];
  onEvent?: (event: NormalizedMineflayerEvent) => void;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface MineflayerRuntimeState {
  enabled: boolean;
  started: boolean;
  ready: boolean;
  lifecycleResult?: LifecycleGateResult;
  pluginReport?: PluginCompositionReport;
}

interface EventSource extends LifecycleEventSource {
  removeAllListeners?(): void;
}

function asEventSource(value: unknown): EventSource | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const maybe = value as Record<string, unknown>;
  if (typeof maybe.on !== "function") {
    return undefined;
  }
  return value as EventSource;
}

function toLifecycleSource(bot: Bot): LifecycleEventSource {
  const botSource = asEventSource(bot);
  const clientSource = asEventSource((bot as unknown as { _client?: EventEmitter })._client);

  return {
    on(eventName, listener) {
      if (eventName === "connect" && clientSource) {
        clientSource.on(eventName, listener);
        return;
      }
      botSource?.on(eventName, listener);
    },
    off(eventName, listener) {
      if (eventName === "connect" && clientSource?.off) {
        clientSource.off(eventName, listener);
        return;
      }
      botSource?.off?.(eventName, listener);
    },
    removeListener(eventName, listener) {
      if (eventName === "connect" && clientSource?.removeListener) {
        clientSource.removeListener(eventName, listener);
        return;
      }
      botSource?.removeListener?.(eventName, listener);
    },
  };
}

function toBotOptions(config: RuntimeConfig): BotOptions {
  return {
    host: config.mineflayerHost,
    port: config.mineflayerPort,
    username: config.mineflayerUsername,
    password: config.mineflayerPassword,
    auth: config.mineflayerAuth,
    version: config.mineflayerVersion,
  };
}

export class MineflayerRuntime {
  private readonly createBot: (options: BotOptions) => Bot;
  private readonly logger: Pick<Console, "log" | "warn" | "error">;

  private bot?: Bot;
  private eventNormalizer?: EventNormalizerHandle;
  private actionRunner?: MineflayerActionRunner;
  private lifecycleResult?: LifecycleGateResult;
  private pluginReport?: PluginCompositionReport;
  private started = false;

  constructor(
    private readonly config: RuntimeConfig,
    private readonly options: MineflayerRuntimeOptions = {},
  ) {
    this.createBot = options.createBot ?? mineflayer.createBot;
    this.logger = options.logger ?? console;
  }

  getState(): MineflayerRuntimeState {
    return {
      enabled: this.config.mineflayerEnabled,
      started: this.started,
      ready: this.lifecycleResult?.status === "ready",
      lifecycleResult: this.lifecycleResult,
      pluginReport: this.pluginReport,
    };
  }

  getBot(): Bot | undefined {
    return this.bot;
  }

  getActionRunner(): MineflayerActionRunner | undefined {
    return this.actionRunner;
  }

  async dispatchDecision(envelope: DecisionEnvelope, actionId?: string): Promise<DecisionDispatchResult> {
    const resolvedActionId = actionId ?? randomUUID();
    if (!this.bot || !this.actionRunner) {
      const unavailableResult: ActionFailure = {
        ok: false,
        actionId: resolvedActionId,
        reasonCode: "MINEFLAYER_RUNTIME_NOT_READY",
        reasonCategory: "server-state",
      };
      return {
        actionId: resolvedActionId,
        command: {
          type: "noop",
          args: {},
        },
        result: unavailableResult,
      };
    }

    return await dispatchDecisionToMineflayer(this.bot, this.actionRunner, envelope, resolvedActionId);
  }

  async start(): Promise<LifecycleGateResult | undefined> {
    if (!this.config.mineflayerEnabled) {
      return undefined;
    }
    if (this.started) {
      return this.lifecycleResult;
    }

    this.started = true;
    const bot = this.createBot(toBotOptions(this.config));
    this.bot = bot;

    bot.on("error", error => {
      this.logger.error("[mineflayer-runtime] bot error", error);
    });
    bot.on("end", reason => {
      this.logger.warn(`[mineflayer-runtime] bot ended: ${reason}`);
    });

    this.pluginReport = composeMineflayerPlugins(bot, this.options.plugins ?? []);
    this.logger.log(
      `[mineflayer-runtime] plugin loaded=${this.pluginReport.loaded.length} skipped=${this.pluginReport.skipped.length}`,
    );

    if (this.options.onEvent) {
      this.eventNormalizer = createMineflayerEventNormalizer(bot, { onEvent: this.options.onEvent });
    }

    const lifecycleSource = toLifecycleSource(bot);
    this.lifecycleResult = await awaitLifecycleGates(lifecycleSource, {
      timeoutMs: this.config.mineflayerLifecycleTimeoutMs,
    });

    if (this.lifecycleResult.status === "ready") {
      this.actionRunner = new MineflayerActionRunner(bot);
      this.logger.log("[mineflayer-runtime] lifecycle ready, action runner initialized");
    } else {
      this.logger.warn(
        `[mineflayer-runtime] lifecycle not ready: ${this.lifecycleResult.reasonCode} (${this.lifecycleResult.reasonCategory})`,
      );
    }

    return this.lifecycleResult;
  }

  async stop(reason = "runtime_shutdown"): Promise<void> {
    this.eventNormalizer?.detach();
    this.eventNormalizer = undefined;
    this.actionRunner = undefined;

    if (this.bot) {
      this.bot.quit(reason);
      (this.bot as unknown as EventSource).removeAllListeners?.();
      asEventSource((this.bot as unknown as { _client?: EventEmitter })._client)?.removeAllListeners?.();
      this.bot = undefined;
    }

    this.started = false;
  }
}
