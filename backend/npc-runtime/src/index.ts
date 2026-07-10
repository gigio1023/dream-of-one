import { SessionService } from "./runtime/session/service.js";
import { installGracefulShutdown, startSessionServer } from "./api/http-server.js";

async function main(): Promise<void> {
  const service = new SessionService();
  const running = await startSessionServer({ service });
  installGracefulShutdown(running);
}

main().catch(error => {
  console.error("npc-runtime failed to start:", error);
  process.exit(1);
});
