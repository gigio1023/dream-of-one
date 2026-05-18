import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
  OPENAI_CODEX_BASE_URL,
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
    provider: "openai-api",
    apiKey: "test-key",
    baseUrl: "https://api.openai.test/v1",
    preferredModel: "gpt-5.4-mini",
    fallbackModels: [],
    reasoningEffort: "low",
    storeResponses: false,
    modelCheckTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    maxOutputTokens: 700,
    budget: {
      maxEstimatedInputTokens: 6000,
      maxEstimatedTotalTokens: 8000,
      maxEstimatedCostUsd: 0.01,
      inputUsdPerMillionTokens: 0.75,
      outputUsdPerMillionTokens: 4.5,
    },
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

function codexStreamResponse(id: string, responseBody: unknown = proposal(), usage = {
  input_tokens: 120,
  output_tokens: 30,
  total_tokens: 150,
}) {
  const outputText = JSON.stringify(responseBody);
  const sse = [
    "data: " + JSON.stringify({
      type: "response.output_text.delta",
      response: { id },
      delta: outputText.slice(0, 30),
    }),
    "data: " + JSON.stringify({
      type: "response.output_text.delta",
      response: { id },
      delta: outputText.slice(30),
    }),
    "data: " + JSON.stringify({
      type: "response.completed",
      response: {
        id,
        usage,
      },
    }),
    "data: [DONE]",
    "",
  ].join("\n");

  return {
    ok: true,
    status: 200,
    statusText: "ok",
    async json() {
      return {};
    },
    async text() {
      return sse;
    },
  };
}

test("OpenAI proposal gateway uses preferred model and maps text proposal into backend-owned intent", async () => {
  const responseBodies: Array<Record<string, unknown>> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-mini" }],
      });
    }

    assert.ok(url.endsWith("/responses"));
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    responseBodies.push(body);
    return jsonResponse(200, {
      id: "resp-preferred",
      output_text: JSON.stringify(proposal()),
      usage: {
        input_tokens: 111,
        output_tokens: 22,
        total_tokens: 133,
      },
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
  assert.equal(result.meta.providerUsage?.model, "gpt-5.4-mini");
  assert.equal(result.meta.providerUsage?.actualInputTokens, 111);
  assert.equal(result.meta.providerUsage?.actualOutputTokens, 22);
  assert.equal(result.meta.providerUsage?.actualTotalTokens, 133);
  assert.ok((result.meta.providerUsage?.estimatedCostUsd ?? 0) > 0);

  assert.equal(responseBodies.length, 1);
  assert.equal(responseBodies[0]?.model, "gpt-5.4-mini");
  assert.deepEqual(responseBodies[0]?.reasoning, { effort: "low" });
  assert.equal(responseBodies[0]?.store, false);
  assert.match(String(responseBodies[0]?.instructions), /Do not decide Exposure delta/);
  assert.match(String(responseBodies[0]?.instructions), /Speak only as the NPC named by PerceptionPacket\.npcId/);
  assert.match(String(responseBodies[0]?.instructions), /For waiting-customer roles, use observer wording/);
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

test("OpenAI proposal prompt separates role voice from player choices", async () => {
  const prompts: string[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-mini" }],
      });
    }

    const body = JSON.parse(init?.body ?? "{}") as {
      input?: Array<{ content?: Array<{ text?: string }> }>;
    };
    prompts.push(String(body.input?.[0]?.content?.[0]?.text ?? ""));
    return jsonResponse(200, {
      id: "resp-role-voice",
      output_text: JSON.stringify(proposal({
        npcId: "NPC_Waiting_Customer",
        npcLineCandidates: ["줄은 그대로 가면 되겠네요."],
      })),
    });
  };

  const packet: PerceptionPacket = {
    sessionId: "session-openai",
    npcId: "NPC_Waiting_Customer",
    landmarkId: "Store",
    nearbyActors: ["player", "NPC_Store_Clerk"],
    recentEvents: ["tool:대기 표식: 일상 수락 -> 줄 안정"],
    organizationContext: {
      organization: "Store",
      role: "waiting_customer",
      roleVoicePolicy: "Use waiting-customer observer voice. Never confess as the player.",
      availableChoices: ["같은 걸로 주세요."],
      actorMemory: {
        actorId: "NPC_Waiting_Customer",
        actorRole: "waiting_customer",
        memoryPolicy: "only own validated actions plus observed ledger events",
        ownRecentActions: [
          { ledgerEventId: "civic-ledger-8", affordance: "refuse_contact", validation: "accepted" },
        ],
        observedRecentActions: [
          {
            observedLedgerEventId: "civic-ledger-6",
            observedActorRole: "station_officer",
            observedAffordance: "cite_record",
            resultingAffordance: "refuse_contact",
          },
        ],
      },
      actorPolicy: {
        stableGoals: ["keep_queue_moving", "avoid_public_disruption"],
        priorityShifts: ["station_citation_can_unlock_refusal"],
        actionSelectionPolicy: "react only to visible queue, public records, actorMemory, and current tool catalog",
        forbiddenClaims: ["do_not_infer_private_player_intent", "do_not_create_records_or_ledger_events"],
      },
    },
    playerSignals: { suspicion: 0, exposure: 0 },
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig(), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(packet);

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.intent.npcId, "NPC_Waiting_Customer");
  assert.equal(result.intent.utterance, "줄은 그대로 가면 되겠네요.");
  assert.equal(prompts.length, 1);
  assert.match(prompts[0] ?? "", /Role voice policy:/);
  assert.match(prompts[0] ?? "", /availableChoices, when present, are player speech options, not NPC lines to repeat/);
  assert.match(prompts[0] ?? "", /actorMemory, when present, is bounded observed memory only/);
  assert.match(prompts[0] ?? "", /do not infer hidden events, private intent, or unobserved ledger facts/);
  assert.match(prompts[0] ?? "", /actorPolicy, when present, defines stable goals, priority shifts, action-selection policy, and forbidden claims/);
  assert.match(prompts[0] ?? "", /must not be used to invent new affordances, authority, records, or state mutations/);
  assert.match(prompts[0] ?? "", /station_citation_can_unlock_refusal/);
  assert.match(prompts[0] ?? "", /observedRecentActions/);
  assert.match(prompts[0] ?? "", /Use waiting-customer observer voice/);
});

test("OpenAI Codex proposal gateway streams responses with gpt-5.4-mini", async () => {
  const responseBodies: Array<Record<string, unknown>> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    assert.ok(url.endsWith("/responses"));
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    responseBodies.push(body);
    return codexStreamResponse("resp-codex-stream");
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig({
    provider: "openai-codex",
    baseUrl: "https://chatgpt.com/backend-api/codex",
  }), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket("Station"));

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.threadId, "resp-codex-stream");
  assert.equal(result.intent.actionType, "Ask");
  assert.equal(result.intent.utterance, "Restate the record in one procedure.");
  assert.equal(responseBodies[0]?.model, "gpt-5.4-mini");
  assert.equal(responseBodies[0]?.stream, true);
  assert.equal(responseBodies[0]?.store, false);
  assert.equal("max_output_tokens" in (responseBodies[0] ?? {}), false);
  assert.deepEqual(responseBodies[0]?.reasoning, { effort: "low" });
  assert.equal(result.meta.providerUsage?.model, "gpt-5.4-mini");
  assert.equal(result.meta.providerUsage?.actualInputTokens, 120);
  assert.equal(result.meta.providerUsage?.actualOutputTokens, 30);
  assert.equal(result.meta.providerUsage?.actualTotalTokens, 150);
});

test("OpenAI Codex proposal gateway resumes same NPC with local workspace memory by default", async () => {
  const responseBodies: Array<Record<string, unknown>> = [];
  const prompts: string[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    assert.ok(url.endsWith("/responses"));
    const body = JSON.parse(init?.body ?? "{}") as {
      input?: Array<{ content?: Array<{ text?: string }> }>;
    } & Record<string, unknown>;
    responseBodies.push(body);
    prompts.push(String(body.input?.[0]?.content?.[0]?.text ?? ""));
    return codexStreamResponse(responseBodies.length === 1 ? "resp-codex-first" : "resp-codex-second");
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig({
    provider: "openai-codex",
    baseUrl: "https://chatgpt.com/backend-api/codex",
  }), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const first = await broker.decide(buildPacket("Station"));
  const second = await broker.decide(buildPacket("Station"));

  assert.equal(first.meta.usedFallback, false);
  assert.equal(first.meta.transport, "codex");
  assert.equal(first.meta.threadId, "resp-codex-first");
  assert.equal(second.meta.usedFallback, false);
  assert.equal(second.meta.transport, "codex-reply");
  assert.equal(second.meta.threadId, "resp-codex-second");
  assert.equal(responseBodies.length, 2);
  assert.equal("previous_response_id" in (responseBodies[0] ?? {}), false);
  assert.equal("previous_response_id" in (responseBodies[1] ?? {}), false);
  assert.equal(responseBodies[0]?.store, false);
  assert.equal(responseBodies[1]?.store, false);
  assert.equal(responseBodies[1]?.model, "gpt-5.4-mini");
  assert.deepEqual(responseBodies[1]?.reasoning, { effort: "low" });
  assert.equal(responseBodies[1]?.stream, true);
  assert.match(prompts[1] ?? "", /WorkspaceArtifacts:/);
  assert.match(prompts[1] ?? "", /openai_text_proposal/);
});

test("OpenAI proposal gateway can opt into stored previous response id", async () => {
  const responseBodies: Array<Record<string, unknown>> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    assert.ok(url.endsWith("/responses"));
    const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
    responseBodies.push(body);
    return codexStreamResponse(responseBodies.length === 1 ? "resp-stored-first" : "resp-stored-second");
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig({
    provider: "openai-codex",
    baseUrl: "https://chatgpt.com/backend-api/codex",
    storeResponses: true,
  }), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  await broker.decide(buildPacket("Station"));
  const second = await broker.decide(buildPacket("Station"));

  assert.equal(second.meta.usedFallback, false);
  assert.equal(second.meta.transport, "codex-reply");
  assert.equal(responseBodies[0]?.store, true);
  assert.equal(responseBodies[1]?.store, true);
  assert.equal(responseBodies[1]?.previous_response_id, "resp-stored-first");
});

test("OpenAI proposal gateway falls back to first explicitly configured available model", async () => {
  const responseModels: string[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "configured-fallback-model" }],
      });
    }

    const body = JSON.parse(init?.body ?? "{}") as { model?: string };
    responseModels.push(body.model ?? "");
    return jsonResponse(200, {
      id: "resp-fallback-model",
      output_text: JSON.stringify(proposal()),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig({
    preferredModel: "configured-preferred-model",
    fallbackModels: ["configured-fallback-model"],
  }), { fetch: fetchImpl });
  const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

  const result = await broker.decide(buildPacket());

  assert.equal(result.meta.usedFallback, false);
  assert.equal(result.meta.threadId, "resp-fallback-model");
  assert.deepEqual(responseModels, ["configured-fallback-model"]);
});

test("OpenAI proposal gateway shares one decision deadline across model check and response", async () => {
  const realNow = Date.now;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const requestedTimeouts: number[] = [];
  const timeoutHandles: ReturnType<typeof setTimeout>[] = [];
  let nowMs = 10_000;

  Date.now = () => nowMs;
  globalThis.setTimeout = ((callback: Parameters<typeof setTimeout>[0], timeout?: number, ...args: unknown[]) => {
    requestedTimeouts.push(Number(timeout));
    const handle = realSetTimeout(callback, 60_000, ...args);
    timeoutHandles.push(handle);
    return handle;
  }) as typeof setTimeout;

  try {
    const fetchImpl: FetchLike = async (url) => {
      if (url.endsWith("/models")) {
        nowMs += 80;
        return jsonResponse(200, {
          data: [{ id: "gpt-5.4-mini" }],
        });
      }

      return jsonResponse(200, {
        id: "resp-shared-deadline",
        output_text: JSON.stringify(proposal()),
      });
    };

    const gateway = new OpenAiProposalGateway(buildOpenAiConfig({
      modelCheckTimeoutMs: 1000,
      requestTimeoutMs: 1000,
    }), { fetch: fetchImpl });
    const broker = new DefaultCodexBroker(gateway, new InMemoryThreadStore());

    const result = await broker.decide(buildPacket(), { deadlineMs: 100 });

    assert.equal(result.meta.usedFallback, false);
    assert.deepEqual(requestedTimeouts.slice(0, 2), [100, 20]);
  } finally {
    Date.now = realNow;
    globalThis.setTimeout = realSetTimeout;
    for (const handle of timeoutHandles) {
      realClearTimeout(handle);
    }
  }
});

test("OpenAI proposal wording cannot select backend action type", async () => {
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-mini" }],
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

test("OpenAI proposal budget blocks response calls before live spending", async () => {
  let responseCallCount = 0;
  const fetchImpl: FetchLike = async (url) => {
    if (url.endsWith("/models")) {
      return jsonResponse(200, {
        data: [{ id: "gpt-5.4-mini" }],
      });
    }

    responseCallCount += 1;
    return jsonResponse(200, {
      id: "unexpected",
      output_text: JSON.stringify(proposal()),
    });
  };

  const gateway = new OpenAiProposalGateway(buildOpenAiConfig({
    budget: {
      maxEstimatedInputTokens: 1,
      maxEstimatedTotalTokens: 2,
      maxEstimatedCostUsd: 0.000001,
      inputUsdPerMillionTokens: 0.75,
      outputUsdPerMillionTokens: 4.5,
    },
  }), { fetch: fetchImpl });
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
        data: [{ id: "gpt-5.4-mini" }],
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
        data: [{ id: "gpt-5.4-mini" }],
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
        data: [{ id: "gpt-5.4-mini" }],
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
        data: [{ id: "gpt-5.4-mini" }],
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
  assert.equal(decoded.provider, "openai-api");
  assert.equal(decoded.apiKey, "env-key");
  assert.equal(decoded.baseUrl, "https://api.openai.test/v1");
  assert.equal(decoded.preferredModel, "configured-preferred");
  assert.deepEqual(decoded.fallbackModels, ["configured-fallback-a", "configured-fallback-b"]);
});

test("runtime defaults to OpenAI Codex proposal provider with gpt-5.4-mini only", () => {
  const config = loadConfig({});

  assert.equal(config.proposalProvider, "openai-codex");
  assert.equal(config.codexCommand, OPENAI_PROPOSAL_GATEWAY_COMMAND);
  assert.equal(config.openAiProposal.provider, "openai-codex");
  assert.equal(config.openAiProposal.baseUrl, OPENAI_CODEX_BASE_URL);
  assert.equal(config.openAiProposal.preferredModel, "gpt-5.4-mini");
  assert.deepEqual(config.openAiProposal.fallbackModels, []);
  assert.equal(config.openAiProposal.reasoningEffort, "low");
  assert.equal(config.openAiProposal.storeResponses, false);
  assert.equal(config.openAiProposal.budget.maxEstimatedCostUsd, 0.01);
});

test("OpenAI Codex provider config uses explicit Codex credential and base URL", () => {
  const config = loadConfig({
    OPENAI_CODEX_ACCESS_TOKEN: "codex-token",
    OPENAI_CODEX_BASE_URL: "https://codex.test/backend-api/codex/",
  });

  assert.equal(config.proposalProvider, "openai-codex");
  assert.equal(config.codexCommand, OPENAI_PROPOSAL_GATEWAY_COMMAND);
  const decoded = decodeOpenAiProposalGatewayConfig(config.codexArgs[0]);
  assert.equal(decoded.provider, "openai-codex");
  assert.equal(decoded.apiKey, "codex-token");
  assert.equal(decoded.baseUrl, "https://codex.test/backend-api/codex");
  assert.equal(decoded.preferredModel, "gpt-5.4-mini");
  assert.deepEqual(decoded.fallbackModels, []);
  assert.equal(decoded.reasoningEffort, "low");
  assert.equal(decoded.storeResponses, false);
});

test("OpenAI Codex provider config can read a repo-local auth profile store", async t => {
  const tempDir = await mkdtemp(join(tmpdir(), "npc-runtime-codex-auth-store-"));
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  const authStorePath = join(tempDir, "openai-codex-auth.json");
  await mkdir(tempDir, { recursive: true });
  await writeFile(authStorePath, JSON.stringify({
    profiles: {
      default: {
        credentials: {
          access: "profile-access-token",
        },
      },
    },
  }), "utf8");

  const config = loadConfig({
    OPENAI_CODEX_AUTH_STORE_PATH: authStorePath,
  });
  const decoded = decodeOpenAiProposalGatewayConfig(config.codexArgs[0]);

  assert.equal(config.proposalProvider, "openai-codex");
  assert.equal(decoded.apiKey, "profile-access-token");
  assert.equal(decoded.preferredModel, "gpt-5.4-mini");
  assert.deepEqual(decoded.fallbackModels, []);
});

test("OpenAI Codex provider health uses local catalog model policy", async () => {
  let fetchCallCount = 0;
  const config: RuntimeConfig = {
    ...loadConfig({
      OPENAI_CODEX_ACCESS_TOKEN: "codex-token",
    }),
    threadStorePath: join(tmpdir(), "npc-runtime-codex-health-threads.json"),
    workspaceRootPath: join(tmpdir(), "npc-runtime-codex-health-workspaces"),
  };
  const fetchImpl: FetchLike = async () => {
    fetchCallCount += 1;
    return jsonResponse(500, {});
  };

  const readiness = await evaluateRuntimeReadiness(config, { fetch: fetchImpl });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.checks.provider.provider, "openai-codex");
  assert.equal(readiness.checks.provider.openAi?.selectedModel, "gpt-5.4-mini");
  assert.equal(fetchCallCount, 0);
});

test("readiness reports selected explicitly configured OpenAI fallback model", async t => {
  const tempDir = await mkdtemp(join(tmpdir(), "npc-runtime-openai-ready-"));
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const config: RuntimeConfig = {
    ...loadConfig({
      NPC_RUNTIME_PROPOSAL_PROVIDER: "openai-api",
      OPENAI_API_KEY: "ready-key",
      OPENAI_PROPOSAL_PREFERRED_MODEL: "configured-preferred-model",
      OPENAI_PROPOSAL_MODEL_FALLBACKS: "configured-fallback-model",
    }),
    threadStorePath: join(tempDir, "threads.json"),
    workspaceRootPath: join(tempDir, "workspaces"),
  };
  const fetchImpl: FetchLike = async () => jsonResponse(200, {
    data: [{ id: "configured-fallback-model" }],
  });

  const readiness = await evaluateRuntimeReadiness(config, { fetch: fetchImpl });

  assert.equal(readiness.status, "ready");
  assert.deepEqual(readiness.reasons, []);
  assert.equal(readiness.checks.provider.ok, true);
  assert.equal(readiness.checks.provider.openAi?.selectedModel, "configured-fallback-model");
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
