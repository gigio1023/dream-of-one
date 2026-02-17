import { DefaultCodexBroker } from "./broker/codex-broker.js";
import { CommandCodexToolGateway } from "./broker/codex-tool-gateway.js";
import { FileThreadStore } from "./broker/thread-store.js";
import { loadConfig } from "./config.js";
import { startHttpServer } from "./api/http-server.js";
import { DecisionService } from "./runtime/decision-service.js";
import { FileActorWorkspaceStore } from "./memory/actor-workspace-store.js";
import { MineflayerRuntime } from "./runtime/mineflayer-runtime.js";
import { RuntimeTelemetryCollector } from "./runtime/telemetry.js";

const config = loadConfig();
const gateway = new CommandCodexToolGateway({
  command: config.codexCommand,
  args: config.codexArgs,
  timeoutMs: config.codexTimeoutMs,
});
const threadStore = new FileThreadStore(config.threadStorePath);
const workspaceStore = new FileActorWorkspaceStore(config.workspaceRootPath);
const broker = new DefaultCodexBroker(gateway, threadStore, workspaceStore);
const decisionService = new DecisionService(broker, {
  maxBrokerInFlight: config.maxBrokerInFlight,
  maxPendingPerBot: config.schedulerMaxPendingPerBot,
  maxPendingGlobal: config.schedulerMaxPendingGlobal,
});
const telemetryCollector = config.telemetryEnabled
  ? new RuntimeTelemetryCollector({
      maxRecords: config.telemetryMaxRecords,
      evidenceOutputDir: config.evidenceOutputDir,
    })
  : undefined;

const mineflayerRuntime = new MineflayerRuntime(config, {
  onEvent: event => {
    telemetryCollector?.recordMineflayerEvent(event);
  },
});

if (telemetryCollector) {
  const snapshotTimer = setInterval(() => {
    telemetryCollector.recordSchedulerSnapshot(decisionService.getSchedulerSnapshot());
  }, config.schedulerSnapshotIntervalMs);
  snapshotTimer.unref?.();
}

if (config.mineflayerEnabled) {
  void mineflayerRuntime.start().catch(error => {
    console.error("[mineflayer-runtime] failed to start", error);
  });
}

startHttpServer(
  config,
  decisionService,
  undefined,
  config.mineflayerEnabled
    ? async (decision, actionId) => await mineflayerRuntime.dispatchDecision(decision, actionId)
    : undefined,
  telemetryCollector,
  () => decisionService.getSchedulerSnapshot(),
);
