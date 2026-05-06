import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DefaultCodexBroker } from "../../src/broker/codex-broker.js";
import {
  OpenAiProposalGateway,
  type FetchLike,
} from "../../src/broker/codex-tool-gateway.js";
import { InMemoryThreadStore } from "../../src/broker/thread-store.js";
import {
  decodeOpenAiProposalGatewayConfig,
  loadConfig,
  OPENAI_PROPOSAL_GATEWAY_COMMAND,
  type OpenAiProposalConfig,
  type RuntimeConfig,
} from "../../src/config.js";
import type { PerceptionPacket } from "../../src/contracts/types.js";
import { evaluateRuntimeReadiness } from "../../src/runtime/readiness.js";

function buildPacket(landmarkId = "Store"): PerceptionPacket {
  return {
    sessionId: "session-openai",
    npcId: "npc-openai",
    landmarkId,
    nearbyActors: ["player"],
    recentEvents: ["procedure_check"],
    organizationContext: { organization: "Station", role: "Officer" },
    playerSignals: { suspicion: 0.4, exposure: 0.2 },
  };
}

function buildOpenAiConfig(overrides: Partial<OpenAiProposalConfig> = {}): OpenAiProposalConfig {
  return {
    apiKey: "test-key",
    baseUrl: "https://api.openai.test/v1",
    preferredModel: "gpt-5.4-nano",
    fallbackModels: ["gpt-5-nano"],
    modelCheckTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    maxOutputTokens: 700,
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown, statusText = status >= 400 ? "error" : "ok") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    npcId: "npc-openai",
    npcLineCandidates: ["State the record in one line."],
    stationPressureWording: ["Restate the record in one procedure."],
    localizedVariants: [{ locale: "en", text: "Keep to the visible record." }],
    fallbackTextVariants: ["The officer checks the form again."],
    ...overrides,
  };
}

test("OpenAI proposal gateway uses preferred model and maps text proposal into backend-owned intent", async () => {
  const responseBodies: Array<Record<string, unknown>> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-nano" }, { id: "gpt-5-nano" }],
      });
    }

    assert.ok(url.endsWith("/responses"));
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    responseBodies.push(body);
    return jsonResponse(200, {
      id: "resp-preferred",
      output_text: JSON.stringify(proposal()),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket("Station"));

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.transport, "codex");
  assert.equal(result.meta.threadId, "resp-preferred");
  assert.equal(result.intent.actionType, "Ask");
  assert.equal(result.intent.utterance, "Restate the record in one procedure.");
  assert.deepEqual(result.intent.reasonCodes, ["openai_text_proposal"]);
  assert.equal(result.intent.confidence, 0.5);

  assert.equal(responseBodies.length, 1);
  assert.equal(responseBodies[0]?.model, "gpt-5.4-nano");
  assert.match(String(responseBodies[0]?.instructions), /Do not decide Exposure delta/);
  const text = responseBodies[0]?.text as { format?: { schema?: { properties?: Record<string, unknown> } } };
  assert.deepEqual(
    Object.keys(text.format?.schema?.properties ?? {}).sort(),
    [
      "fallbackTextVariants",
      "localizedVariants",
      "npcId",
      "npcLineCandidates",
      "stationPressureWording",
    ],
  );
});

test("OpenAI proposal gateway falls back to first configured available model after availability check", async () => {
  const responseModels: string[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5-nano" }],
      });
    }

    const body = JSON.parse(init?.body ?? "{}") as { model?: string };
    responseModels.push(body.model ?? "");
    return jsonResponse(200, {
      id: "resp-fallback-model",
      output_text: JSON.stringify(proposal()),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.threadId, "resp-fallback-model");
  assert.deepEqual(responseModels, ["gpt-5-nano"]);
});

test("OpenAI proposal wording cannot select backend action type", async () => {
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-nano" }],
      });
    }

    return jsonResponse(200, {
      id: "resp-wording-only",
      output_text: JSON.stringify(proposal({
        stationPressureWording: ["Station-style wording outside Station."],
        fallbackTextVariants: ["Fallback-style wording outside Station."],
      })),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket("Store"));

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.intent.actionType, "Talk");
  assert.deepEqual(result.intent.reasonCodes, ["openai_text_proposal"]);
});

test("OpenAI model missing returns deterministic fallback without calling responses API", async () => {
  let responseCallCount = 0;
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "other-nano" }],
      });
    }

    responseCallCount += 1;
    return jsonResponse(200, {
      id: "unexpected",
      output_text: JSON.stringify(proposal()),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.reason, "tool_failure");
  assert.equal(responseCallCount, 0);
});

test("OpenAI rate limit returns deterministic fallback", async () => {
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-nano" }],
      });
    }

    return jsonResponse(429, {
      error: { message: "rate limited" },
    }, "rate_limited");
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.reason, "tool_failure");
});

test("OpenAI response timeout returns deterministic timeout fallback", async () => {
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-nano" }],
      });
    }

    return await new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig({ requestTimeoutMs: 10 }), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket(), { deadlineMs: 10 });

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.reason, "codex_timeout");
});

test("OpenAI authority fields in proposal are rejected before intent mapping", async () => {
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-nano" }],
      });
    }

    return jsonResponse(200, {
      id: "resp-authority",
      output_text: JSON.stringify(proposal({ verdict: "detained" })),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.reason, "tool_failure");
});

test("OpenAI authority wording in proposal text is rejected before display", async () => {
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-nano" }],
      });
    }

    return jsonResponse(200, {
      id: "resp-authority-text",
      output_text: JSON.stringify(proposal({
        npcLineCandidates: ["The verdict is already set."],
        stationPressureWording: [],
      })),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, true);
  assert.equal(result.meta.transport, "fallback");
  assert.equal(result.meta.reason, "tool_failure");
});

test("OpenAI provider config is selected through runtime env/config, not game logic", () => {
  const config = loadConfig({
    NPC_RUNTIME_PROPOSAL_PROVIDER: "openai-api",
    OPENAI_API_KEY: "env-key",
    OPENAI_BASE_URL: "https://api.openai.test/v1/",
    OPENAI_PROPOSAL_PREFERRED_MODEL: "configured-preferred",
    OPENAI_PROPOSAL_MODEL_FALLBACKS: "configured-fallback-a,configured-fallback-b",
  });

  assert.equal(config.proposalProvider, "openai-api");
  assert.equal(config.codexCommand, OPENAI_PROPOSAL_GATEWAY_COMMAND);
  const decoded = decodeOpenAiProposalGatewayConfig(config.codexArgs[0]);
  assert.equal(decoded.apiKey, "env-key");
  assert.equal(decoded.baseUrl, "https://api.openai.test/v1");
  assert.equal(decoded.preferredModel, "configured-preferred");
  assert.deepEqual(decoded.fallbackModels, ["configured-fallback-a", "configured-fallback-b"]);
});

test("runtime defaults to OpenAI API proposal provider, not direct Codex CLI", () => {
  const config = loadConfig({});

  assert.equal(config.proposalProvider, "openai-api");
  assert.equal(config.codexCommand, OPENAI_PROPOSAL_GATEWAY_COMMAND);
  assert.equal(config.openAiProposal.preferredModel, "gpt-5.4-nano");
  assert.deepEqual(config.openAiProposal.fallbackModels, ["gpt-5-nano"]);
});

test("readiness reports selected OpenAI fallback model when preferred model is unavailable", async t => {
  const tempDir = await mkdtemp(join(tmpdir(), "npc-runtime-openai-ready-"));
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const config: RuntimeConfig = {
    ...loadConfig({
      NPC_RUNTIME_PROPOSAL_PROVIDER: "openai-api",
      OPENAI_API_KEY: "ready-key",
      OPENAI_PROPOSAL_PREFERRED_MODEL: "gpt-5.4-nano",
      OPENAI_PROPOSAL_MODEL_FALLBACKS: "gpt-5-nano",
    }),
    threadStorePath: join(tempDir, "threads.json"),
    workspaceRootPath: join(tempDir, "workspaces"),
  };
  const fetchImpl: FetchLike = async () => jsonResponse(200, {
    data: [{ id: "gpt-5-nano" }],
  });

  const readiness = await evaluateRuntimeReadiness(config, { fetch: fetchImpl });

  assert.equal(readiness.status, "ready");
  assert.deepEqual(readiness.reasons, []);
  assert.equal(readiness.checks.provider.ok, true);
  assert.equal(readiness.checks.provider.openAi?.selectedModel, "gpt-5-nano");
  assert.equal(readiness.checks.codexCommand.ok, true);
});

test("readiness reports missing OpenAI API key before model checks", async t => {
  const tempDir = await mkdtemp(join(tmpdir(), "npc-runtime-openai-missing-key-"));
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  let fetchCallCount = 0;
  const config: RuntimeConfig = {
    ...loadConfig({
      NPC_RUNTIME_PROPOSAL_PROVIDER: "openai-api",
    }),
    threadStorePath: join(tempDir, "threads.json"),
    workspaceRootPath: join(tempDir, "workspaces"),
  };
  const fetchImpl: FetchLike = async () => {
    fetchCallCount += 1;
    return jsonResponse(200, { data: [] });
  };

  const readiness = await evaluateRuntimeReadiness(config, { fetch: fetchImpl });

  assert.equal(readiness.status, "not_ready");
  assert.deepEqual(readiness.reasons, ["openai_api_key_missing"]);
  assert.equal(readiness.checks.provider.ok, false);
  assert.equal(readiness.checks.provider.reason, "openai_api_key_missing");
  assert.equal(fetchCallCount, 0);
});
