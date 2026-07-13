# AI Provider Ports and Adapters

Production gameplay is provider-first. Game logic depends only on
`NpcProposalPort`; vendor API shapes are isolated behind `TextGenPort`
adapters. A storylet supplies context and constraints, never a pre-authored
dialogue tree or ordered NPC action list.

## Layering

```text
conversation + agent loop
        │ NpcProposalPort
        ▼
ProviderService
  prompt shaping · zod envelope validation · one repair · timeout · budget
        │ TextGenPort
        ├── ResponsesAdapter ─────────────── OpenAI
        └── ChatCompletionsAdapter ───────── ModelScope / compatible endpoints

tests + fixture generation
        │ NpcProposalPort
        └── ScriptedNpcAdapter (never selectable from production config)
```

The domain port exposes six proposal operations plus a metadata-only audit
snapshot. During ordinary conversation, the
merged conversation-turn operation is the only provider work that blocks the
player. The scheduled terminal hearing deliberately blocks once more on
`judgeHearing`. Its localized procedure opening is deterministic runtime
content and makes no provider-port call; `judgeHearing` is the hearing's one
blocking provider resolution. Agent beats and ambient work continue to use
the split operations without adding another ordinary-play wait.

```ts
interface NpcProposalPort {
  auditSnapshot(scopeId): ProviderAuditSnapshot;
  proposeConversationTurn(request): Promise<ResolvedProposal<ConversationProposal>>;
  judgeConversationTurn(request): Promise<ResolvedProposal<ConversationJudgment>>;
  judgeAndProposeConversationTurn(request): Promise<ResolvedProposal<MergedConversationTurn>>;
  proposeNextStep(request): Promise<ResolvedProposal<AgentStepProposal>>;
  judgeAndProposeAmbientReply(request): Promise<ResolvedProposal<AmbientReplyJudgment>>;
  judgeHearing(request): Promise<ResolvedProposal<HearingJudgment>>;
}
```

`auditSnapshot` is metadata-only run accounting, not a transcript. `ProviderService`
records each actual `TextGenPort.generate` attempt at the transport boundary,
including failed calls and repair calls, then links those call sequence numbers
to the final high-level live/fallback resolution. It never stores prompts,
provider output, player text, credentials, or secrets. `callsUsed` and
`tokensUsed` reconcile with completed call charges plus the explicitly exposed
in-flight count/reservation. All transport calls are retained under the current
120-call run cap; high-level resolutions retain the first 256 and mark
`complete=false`, `truncated=true`, and `droppedCount` if that bound is exceeded.
Direct scripted/rule adapters expose an empty complete audit, while fallback
reached through `ProviderService` remains a recorded resolution even when it
made zero transport calls.
Each live resolution cites at least one call: its first call purpose matches
the resolution, later calls are ascending `repair` attempts, and a complete
audit references every completed call exactly once. Live or scripted proposal
metadata cannot carry a fallback reason.

`RunService` separately keeps a bounded `providerRuntimeTrace` of every
proposal metadata packet it actually consumes. This second trace catches a
different failure class: a response can be valid provider JSON and therefore
look live in `providerAudit`, then fail a runtime citation or tool-validity
check and be replaced by deterministic fallback. Terminal acceptance requires
both structures to be complete and free of fallback; a later live result
cannot hide an earlier provider failure or runtime semantic fallback. Neither
structure stores generated text. When the complete structures are non-empty,
the client acceptance surface also requires one runtime-trace entry per
high-level provider resolution and zero dropped entries; profile checks alone
cannot detect a missing consumed result.
If runtime procedure must replace otherwise valid model wording — for example,
forcing an abnormal hearing result below the evidenced-vouch floor — the
consumed proposal metadata becomes fallback even though the transport audit
correctly remains live.

`MergedConversationTurn` is judgment fields (bounded suspicion/report deltas,
signal classes, and a player-visible why-line) plus the NPC's next utterance
and three reply suggestions. If a live model breaks that schema, `ProviderService`
retries once, then falls back to composing the rule judgment with the
canned reply set — that merged-conversation schema is not request-shrunk.

`ConversationProposal` contains an NPC utterance and three generated reply
suggestions. Reply intent labels shape variety only; they never decide
suspicion. `ConversationJudgment` is the judging NPC's read of the player's
answer: a bounded suspicion/report delta, the signal classes that applied,
and a player-visible why-line. The runtime clamps deltas and scores;
it does not decide what the answer meant. `AgentStepProposal` contains at
most one tool call, an optional utterance, and a stop flag. The runtime
validates every tool against visibility, role authority, object state, and
the offered catalog.

For each agent-step request, `ProviderService` derives a strict JSON schema
from that request's effective tool catalog and current observe packet. Only
the offered tool branches and their currently reachable, visible, audible, or
administratively authorized target ids are sent. Run-scoped ordinary
`talk_to` narrows that set again to targets that also pass reciprocal
audibility, both speech cooldowns, no pending movement, and a shared authored
volume; an empty set remains explicit rather than widening back to visible
actors. A required ambient reply
narrows further to the exact `talk_to` actor id and `done=true`. The envelope
always contains exactly
`toolCall`, `utterance`, `rationale`, and `done`, using `null` for an absent
nullable value. The same effective-tool constraint is enforced by the local
Zod parse instead of trusting transport-side structured output. `move_to`,
`look`, ordinary `talk_to`, `read_record`, and administrative writes therefore
reject hidden or unavailable ids before a proposal enters the multi-step
runtime loop. Record calls select exactly one structural contract: retained
legacy world packets receive the legacy branch, while run-scoped
administrative packets receive only the M3R branch. Locale and request
validation report field-specific paths to the single repair attempt, and
repair must return a complete replacement JSON value. Runtime validation still
rechecks fresh visibility, audibility, role authority, record ownership,
clamps, and every world mutation at commit time.

`AmbientReplyJudgment` is the second and final call in a bounded two-resident
exchange. It returns the listener's exact `talk_to` reply together with a
personal suspicion delta, proposed coarse stance, why-line, and optional open
question. It judges only the exact attributed speech and that listener's own
observe packet: it has no player-answer signals, report-pressure delta,
record mutation, or verdict authority. The runtime stores the exact source
speech memory before applying the listener judgment, clamps suspicion, and
never lets hearsay create meaningful-firsthand provenance. This replaces the
old second `proposeNextStep`; it does not add another provider call.

`HearingJudgment` contains exactly six resident assessments, a proposed
ordinary/abnormal verdict, the Station officer's final line, and record/ledger
citations. The provider sees only the final defense and the run's normalized
resident memories, records, and ledger events. `RunService` validates the
exact actor set and every cited id, clamps unsupported or uncited stance
movement, checks each structured `contactBasis` against that resident's actual
meaningful player-conversation memory, and enforces four evidenced vouches as
a floor. The three exact states are `meaningful_firsthand` when any player
conversation is meaningful, `limited_firsthand` when direct conversation
exists but none is meaningful, and `never_conversed` when no player
conversation exists. The model still owns the testimony wording and may cite
attributed ambient memories, but limited contact cannot claim substantive
firsthand grounds. The provider prompt requires a never-conversed line to say
so, while the client always presents the validated structured basis beside the
model wording rather than pretending to semantically parse prose. A
contact-basis mismatch or invalid semantic citation switches the whole
judgment to visibly marked deterministic fallback and the runtime trace
records that replacement. Four vouches do not force an ordinary result: with
the floor met, the selected model still owns the verdict.

## Production profiles

Profiles live in `backend/npc-runtime/providers.config.json`. The checked-in
default is `openai/gpt-5.4-mini`; `NPC_PROVIDER_PROFILE` switches profiles
without changing game code. Model IDs remain opaque profile data and must be
verified by an opt-in live smoke.

Available adapter shapes:

| Profile | Adapter | Credentials |
| --- | --- | --- |
| `openai/gpt-5.4-mini` | Responses | `OPENAI_API_KEY` |
| `modelscope/qwen3.7-plus` (`Qwen-Ambassador/Qwen3.7-Plus`) | Chat Completions | ModelScope env vars |
| `local/openai-compatible` | Chat Completions | `LOCAL_LLM_BASE_URL` |

Secrets are environment variables and never appear in config, logs, fixtures,
or committed files.
The ModelScope profile reads `MODELSCOPE_BASE_URL` and `MODELSCOPE_API_KEY`.
It uses the private `Qwen-Ambassador/Qwen3.7-Plus` model id and disables Qwen
thinking for the bounded JSON envelope; this keeps reasoning tokens from
consuming the response budget before the JSON body is emitted. Its output cap
is 1,600 tokens so the exact-six hearing envelope is not truncated; this is a
ceiling, not a request to lengthen ordinary dialogue. The profile also raises
its finite transport and service timeout to 30 seconds; profiles without an
override retain the 12-second runtime default. ModelScope calls were observed
crossing the old 12-second boundary during live play. Background calls do not
pause the world and conversation openings are preloaded, so the extra network
margin avoids false fallback for most traffic. A merged response after the
player answers can still block the modal, but it now has a finite 30-second
ceiling rather than turning ordinary ModelScope latency into mandatory
fallback.

## Live prompt calibration

Judgment deltas are model-owned but calibrated to the runtime's 0–125 score
scale. The prompt gives magnitude examples for ordinary, mismatched, explicit
outside/dream, and severe refusal cases; they are a ruler, not a deterministic
classifier. This prevents providers that naturally emit 1–5 ratings from
making report and Station pressure unreachable while leaving the actual
meaning judgment with the NPC model.

M3R prompts derive every player-visible output instruction from the run's
supported locale and carry that locale into `AgentStepRequest`; they still
tell the model to stop after a successful goal-satisfying tool result instead
of repeating the same successful read or look until the iteration budget ends.
Tool names and ids stay unchanged for validation. The generic agent-loop
validator also suppresses an identical call after it has already succeeded or
been blocked within the same beat, returning that result to the model so it can
stop or choose a genuinely different next action.

One locale-aware validation stage covers
player-visible dialogue, reply suggestions, judgment reasons, NPC utterances,
and record/ledger prose. Korean keeps its modern-Korean script check; the other
locales use bounded structural and locale instructions without introducing a
second language detector. A mismatch will use the existing single repair
attempt; ids and tool names remain excluded. Supported gameplay locales are
`ko-KR`, `en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP`.

A run fixes its locale at creation. That tag is part of opening-cache and
request-idempotency signatures and flows through conversation, ambient agent
steps, records, hearing/recap, and fallback selection. Adapters remain
locale-agnostic transports; no
vendor SDK, base URL, or provider profile is added per language. Localized
fallback is structurally bounded in all six locales, while its legacy
keyword signal classifier remains Korean/partial-English and is not treated
as native-quality non-Korean judgment.

## Envelope and failure handling

Adapters return text and usage only. `ProviderService` parses the text with the
zod schemas in `src/providers/envelope.ts`. Invalid JSON receives one bounded
repair request. The following conditions use deterministic fallback and are
reported in `ProposalMeta`:

- missing credentials or unavailable profile;
- timeout (a profile `timeoutMs` override when present, otherwise
  `runtime.timeoutMs`; sized for judgment-grade calls, not the old 2.5-second
  bark budget);
- rate limiting or transport failure;
- invalid envelope after repair;
- per-session call or token budget exhaustion.

Fallback is resilience, not the production policy. For player judgment, fallback is
the deterministic signal classifier in
`src/runtime/conversation-suspicion.ts`; for conversation and agent steps it
is the bounded rule adapter. The HUD shows the selected profile,
`live`/`fallback`/`scripted` transport, and fallback reason.
The same cumulative metadata remains available run-wide as `providerAudit` and
`providerRuntimeTrace` on snapshots, successful preload responses, every typed
NPC-decision result, ordinary answer responses, hearing responses, and the
terminal run-end response. Provider-bearing builders refresh accounting before
cloning the pair; the one-second advance lane does not repeat the growing
arrays. A structurally resolved preload is traced even if fresh semantic
validation rejects its opening as stale. This prevents a later successful call
from hiding an earlier error, repair, or fallback during live acceptance.

Ambient-reply fallback is deliberately neutral: one localized in-fiction
reply, zero suspicion movement, the existing stance, and a dedicated
six-locale reason that the heard statement is insufficient to change the
listener's view. It never reuses player-answer wording or manufactures social
drama during an outage. Provider audit records this operation under the
distinct `ambient_reply` purpose, including repair calls and budget fallback.

## Scripted tests

Fixed dialogue, tool sequences, and failure sets live only in
`src/providers/testing/`. `ScriptedNpcAdapter` implements the same domain port
and is injected by integration tests, fixture generation, and the HTTP parity
server. It does not exist in `providers.config.json`, so normal runtime
selection cannot silently become scripted gameplay.

The `Same Order` script is a deterministic regression scenario. It proves the
Godot UI, Session API, tool validation, records, citations, and four authority
outcomes. It is not a production NPC policy.

## Verification

```bash
bun run --cwd backend/npc-runtime check
GODOT_BIN="$GODOT_BIN" backend/npc-runtime/scripts/live-route-parity.sh

# Manual and spend-bearing; never CI
bun run --cwd backend/npc-runtime provider:smoke -- --profile openai/gpt-5.4-mini
bun run --cwd backend/npc-runtime provider:smoke -- --profile modelscope/qwen3.7-plus
```

Under the scripted test adapter, route outcomes are deterministic for a given
answer history — that is what the regression fixtures assert. Under a live
provider, judgment, wording, and validated world attempts are the model's, so
neither routes nor world state are required to be identical across runs; the
guarantees that hold everywhere are validity (visibility, tool validation,
clamps) and a session that ends.
