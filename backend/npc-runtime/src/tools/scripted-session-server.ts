import { installGracefulShutdown, startSessionServer } from "../api/http-server.js";
import { createSameOrderScriptedAdapter } from "../providers/testing/same-order-script.js";
import { SessionService } from "../runtime/session/service.js";

const service = new SessionService({ proposalPort: createSameOrderScriptedAdapter() });
const running = await startSessionServer({ service });
installGracefulShutdown(running);
