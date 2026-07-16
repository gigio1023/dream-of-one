import { installGracefulShutdown, startSessionServer } from "../api/http-server.js";
import { createSameOrderScriptedAdapter } from "../providers/testing/same-order-script.js";
import { createStudioReceptionScriptedAdapter } from "../providers/testing/studio-reception-script.js";
import { RunService } from "../runtime/run-service.js";
import { SessionService } from "../runtime/session/service.js";

const service = new SessionService({ proposalPort: createSameOrderScriptedAdapter() });
const runService = new RunService({ proposalPort: createStudioReceptionScriptedAdapter() });
const running = await startSessionServer({ service, runService });
installGracefulShutdown(running);
