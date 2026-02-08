import { DefaultCodexBroker } from "./broker/codex-broker.js";
import { CommandCodexToolGateway } from "./broker/codex-tool-gateway.js";
import { FileThreadStore } from "./broker/thread-store.js";
import { loadConfig } from "./config.js";
import { startHttpServer } from "./api/http-server.js";
import { DecisionService } from "./runtime/decision-service.js";
import { ReliabilityTelemetry } from "./runtime/reliability-telemetry.js";

const config = loadConfig();
const telemetry = new ReliabilityTelemetry();
const gateway = new CommandCodexToolGateway({
  command: config.codexCommand,
  args: config.codexArgs,
  timeoutMs: config.codexTimeoutMs,
});
const threadStore = new FileThreadStore(config.threadStorePath);
const broker = new DefaultCodexBroker(gateway, threadStore, {
  promptCharBudget: config.promptCharBudget,
  maxToolRuntimeMs: config.codexGlobalBudgetMs,
  telemetry,
});
const decisionService = new DecisionService(broker, telemetry);

startHttpServer(config, decisionService);
