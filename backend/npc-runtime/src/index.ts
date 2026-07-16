import { SessionService } from "./runtime/session/service.js";
import { RunService } from "./runtime/run-service.js";
import { installGracefulShutdown, startSessionServer } from "./api/http-server.js";
import { createProviderFromEnvironment } from "./providers/registry.js";

async function main(): Promise<void> {
  const { proposalPort } = createProviderFromEnvironment();
  const service = new SessionService({ proposalPort });
  const runService = new RunService({ proposalPort });
  const running = await startSessionServer({ service, runService });
  installGracefulShutdown(running);
}

main().catch(error => {
  console.error("npc-runtime failed to start:", error);
  process.exit(1);
});
