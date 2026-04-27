import { DefaultCodexBroker } from "./broker/codex-broker.js";
import { CommandCodexToolGateway } from "./broker/codex-tool-gateway.js";
import { FileThreadStore } from "./broker/thread-store.js";
import { loadConfig } from "./config.js";
import { startHttpServer } from "./api/http-server.js";
import { DecisionService } from "./runtime/decision-service.js";
import { FileActorWorkspaceStore } from "./memory/actor-workspace-store.js";
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

if (telemetryCollector) {
  const snapshotTimer = setInterval(() => {
    telemetryCollector.recordSchedulerSnapshot(decisionService.getSchedulerSnapshot());
  }, config.schedulerSnapshotIntervalMs);
  snapshotTimer.unref?.();
}

startHttpServer(
  config,
  decisionService,
  undefined,
  undefined,
  telemetryCollector,
  () => decisionService.getSchedulerSnapshot(),
);
