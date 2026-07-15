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
and three reply suggestions. It also returns up to eight `citedRecordIds` for
record content meaningfully conveyed by that NPC utterance. The request-scoped
transport and Zod schemas admit only record ids visible to the speaking
resident; an empty visible-record set requires an empty citation list. The
suggestions are requested in fixed
`safe/local` → `uncertain/repair` → `risky/weird` order. When an otherwise
valid merged turn repeats one of those hidden labels, the envelope boundary
normalizes only the three labels by position before spending a repair call;
model-authored text, judgment, stance, and memory inputs remain unchanged.
Any visible-language, fiction, stable-id, shape, or other validation failure
still makes `ProviderService` retry once with the original grounded request
context plus field-specific issues, then fall back to composing the rule
judgment with the canned reply set. Citation scoping narrows only which known
record ids may be returned; it does not prescribe wording or judgment.

`ConversationProposal` contains an NPC utterance and three generated reply
suggestions, plus the same request-scoped record citations for an opening
utterance. Reply intent labels shape variety only; they never decide
suspicion. `ConversationJudgment` is the judging NPC's read of the player's
answer: a bounded suspicion/report delta, the signal classes that applied,
and a player-visible why-line. The runtime clamps deltas and scores;
it does not decide what the answer meant. `AgentStepProposal` contains at
most one tool call, an optional utterance, and a stop flag. The runtime
validates every tool against visibility, role authority, object state, and
the offered catalog.

The three suggestions are explicitly uncommitted candidate speech. Their intent
labels express relative social exposure, not truth: `safe/local` is the least
exposing plausible answer and may still be a modest cover claim,
`uncertain/repair` hedges or clarifies, and `risky/weird` may offer a bolder lie.
None of those candidates enters conversation history, memory, or judgment until
the player selects it; selection is identical to typing that line. NPC
utterances, reasons, and questions may never treat an unselected candidate as
true or mutate the world from it.

Conversation requests also carry a machine-readable `groundingContract` built
from supplied scene context, the player's supplied statements, visible object
and record facts, and heard speech. Visible record facts retain their stable id
and exact revision so the provider can cite without exposing either token in
player-visible prose. It is closed-world for player-visible prose:
an unlisted identity, role, possession, document, approval, appointment, or
past event is unknown, not missing or completed. The NPC may ask about an
unknown, but its speech, reasons, and questions may not turn it into a fact.
Suggested replies follow the separate uncommitted-candidate rule above and may
not introduce resident-only record content that the NPC has not spoken or the
player has not already supplied. This boundary is repeated in the provider
instructions and retained in the one repair request; model-authored wording
remains free inside that factual boundary.

The resident's public role may support generic job topics and ordinary
capabilities: a receptionist can conditionally ask whether a visit concerns a
schedule or paperwork and offer general reception guidance. Objectives, role
goals, policy, and private motivation remain non-evidence for concrete facts;
they cannot imply that this visitor has a register entry, required document,
appointment, approval, or completed next step. Questions are checked by the
same rule:
“who arranged this appointment?” presupposes that an appointment exists and
concerns the player, so the resident must establish that link before narrowing
its source or details.

Conversation generation repeats this boundary as a final silent self-check.
The provider reviews visitor-specific nouns and claimed access to concrete
records in NPC speech, reasons, questions, and world claims against an exact
supplied fact. It reviews suggestions separately so their relative exposure is
legible and every cover claim stays confined to unselected candidate speech. A request to learn
the steps before a hearing establishes that purpose and the hearing, but not an
appointment, reference number, notice, dossier, paperwork, visitor record, or
the resident's ability to check one.

The provider projection also gives every player conversation an explicit
`conversationFrame`: one resident speaker, the player interlocutor, and any
third-party actor ids. The resident's location never doubles as an inferred
player location; a speculative opening keeps the player location unknown, while
an active reply identifies only the face-to-face basis unless an engine-grounded
player-contact packet supplies the actual location. Prior resident
speech and NPC-to-NPC speech remain available as typed, attributed memory
evidence, but are marked as past evidence rather than lines in the current
exchange. This prevents an opening from silently recasting a heard resident as
the player or replaying an ambient utterance as the current speaker's new line.

For each agent-step request, `ProviderService` derives a strict JSON schema
from that request's effective tool catalog and current observe packet. Only
the offered tool branches and their currently reachable, visible, audible, or
administratively authorized target ids are sent. Run-scoped ordinary
`talk_to` narrows that set again to targets that also pass reciprocal
audibility, both speech cooldowns, no pending movement, and a shared authored
volume; an empty set remains explicit rather than widening back to visible
actors. A required ambient reply
narrows further to the exact `talk_to` actor id and `done=true`. A pending
Station interrogation is already a runtime-mandated grounded approach, so its
request is likewise narrowed to exactly `move_to(player)` and `done=true`;
unlike ambient speech, that movement requires no utterance. The envelope
always contains exactly
`toolCall`, `utterance`, `citedRecordIds`, `rationale`, and `done`, using `null`
for absent speech and `[]` for no record citation. A free-world utterance may
cite at most eight records visible to its current speaker, and must cite every
record whose content it meaningfully conveys. The same effective-tool
constraint is enforced by the local
Zod parse instead of trusting transport-side structured output. `move_to`,
`look`, ordinary `talk_to`, `read_record`, and administrative writes therefore
reject hidden or unavailable ids before a proposal enters the multi-step
runtime loop. Record calls select exactly one structural contract: retained
legacy world packets receive the legacy branch, while run-scoped
administrative packets receive only the M3R branch. When a report-bearing
source reaches a writable procedure, the request still offers both
`write_record` and `wait` but removes the nullable completion branch: the model
must make one explicit tool choice without the runtime preferring either one.
It also removes the nullable utterance branch for that request. The model must
say one concise, localized, in-fiction sentence that makes its chosen write or
deferral understandable without exposing stable ids. An explicit wait
therefore carries both its reason into resident memory and its natural wording
into the ordinary audible-speech path instead of escaping through a generic
`done` response. This requirement communicates the model's decision; it does
not make either branch more likely. Locale and request
validation report field-specific paths to the single repair attempt, and
repair must return a complete replacement JSON value. Runtime validation still
rechecks fresh visibility, audibility, role authority, record ownership,
clamps, and every world mutation at commit time.

M3R record requests also give the model one shared pressure ruler rather than
duplicating it per tool: `institutionalPressureDelta` is an integer from -25
through 25, negative lowers shared pressure, zero leaves it unchanged, and
positive raises it. Direction and magnitude remain model judgments from the
supplied evidence; the prompt prefers no direction and the runtime still
clamps before commit. One independent non-record memory may contribute a
positive pressure event only once across its complete record read/write
lineage. Later reads and derivative records remain legal, including zero or
negative judgments, but they cannot mint another positive event from the same
evidence root.

`AmbientReplyJudgment` is the second and final call in a bounded two-resident
exchange. It returns the listener's exact `talk_to` reply together with a
personal suspicion delta, proposed coarse stance, why-line, and optional open
question. It judges only the exact attributed speech and that listener's own
observe packet: it has no player-answer signals, report-pressure delta,
record mutation, or verdict authority. The runtime stores the exact source
speech memory before applying the listener judgment, clamps suspicion, and
never lets hearsay create meaningful-firsthand provenance. This replaces the
old second `proposeNextStep`; it does not add another provider call. Agent-step
and ambient-reply utterances are transient world subtitles, so their transport
schemas cap them at 64 Unicode code points and repair an overlong line before
it reaches the client. Modal conversation and hearing prose keep their separate
surfaces and are not subject to this transient cap.

`HearingJudgment` contains exactly six resident assessments, a proposed
ordinary/abnormal verdict, the Station officer's final line, and record/ledger
citations. The provider sees only the final defense and the run's normalized
resident memories, records, and ledger events. `RunService` validates the
exact actor set and every cited id, clamps unsupported or uncited stance
movement, checks each structured `contactBasis` against that resident's actual
meaningful player-conversation memory, and enforces four evidenced vouches as
a floor. Before a transport result is accepted as live, `ProviderService`
applies that same authoritative validation against the exact request and gives
a semantic failure the existing single repair attempt with the original
hearing evidence packet attached. If fewer than four residents can possibly
supply meaningful firsthand evidence, the request JSON schema also excludes
an ordinary proposal. A failed repair becomes explicit `invalid_envelope`
fallback; `RunService` still repeats the validation at commit and remains the
final authority. The three exact states are `meaningful_firsthand` when any player
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
and record/ledger prose. Every nonempty Korean player-visible field must contain
at least one Hangul code point. This lightweight presence check rejects pure
English, pure Chinese/Hanja, digits-only, and punctuation-only output while
allowing natural Korean to include names in Latin script, established acronyms,
numerals, and occasional Hanja. Multi-letter Latin words are limited to
title-case names or short uppercase acronyms, so a stray lowercase English word
does not pass merely because the sentence also contains Hangul. Korean output
containing Japanese hiragana or katakana is also rejected, even when another
part of the field contains Hangul.
These are envelope-validity guards, not a general language quality classifier:
wording and style remain provider-owned and content-review owned. An independent
all-locale guard rejects canonical internal stable-ID
shapes such as actor, memory, record-surface, movement, and semantic-anchor ids
from every player-visible field while leaving tool arguments and internal
rationale untouched. The same validity layer rejects explicit game/model framing
(`player`, `user`, `NPC`, AI/model/prompt terminology, and localized equivalents)
so a resident cannot expose the simulation while remaining schema-valid. Every
locale also annotates each player-visible JSON Schema field with the requested
language and requires at least one code point from that locale's permitted
writing systems. This lightweight mismatch guard catches unchanged Hangul cast
text in non-Korean requests; it is not a language classifier. English, Italian,
and French share Latin script, while Han is valid in both Chinese and Japanese,
so exact language and wording remain provider-owned. A failed guard uses the
existing single repair attempt. Supported gameplay locales are `ko-KR`,
`en-US`, `it-IT`, `zh-CN`, `fr-FR`, and `ja-JP`.

Each provider request also carries a final `playerVisibleOutputContract` after
the Korean-authored actor context. It repeats the immutable gameplay locale,
names the required output language, and tells the provider to translate or
naturally re-express source-language voice instead of copying it. Repair calls
retain that contract and point to it explicitly.

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
repair request containing the original grounded request context, the invalid
envelope, and field-specific validation issues. Player-visible JSON-schema
fields also describe the no-internal-ID contract so compatible structured-output
providers can avoid the repair in the first place. The following conditions use deterministic fallback and are
reported in `ProposalMeta`:

- missing credentials or unavailable profile;
- timeout (a profile `timeoutMs` override when present, otherwise
  `runtime.timeoutMs`; sized for judgment-grade calls, not the old 2.5-second
  bark budget);
- rate limiting or transport failure;
- invalid envelope after repair;
- per-session call or token budget exhaustion.

Budget admission distinguishes the provider's hard per-session limit from a
caller-supplied ceiling that protects foreground capacity from background
work. Before preflight, and again immediately before reserving a transport
call, `ProviderService` checks the projected call plus that exact request's
token reservation. Crossing the hard limit remains a visible deterministic
`budget_exhausted` fallback. If a caller ceiling denies the first call,
`ProviderService` instead throws `ProviderBudgetReservedError`: no transport,
fallback adapter, audit call, or audit resolution occurred. If the first live
call completed but its one repair no longer fits, the final fallback remains
linked to that call sequence rather than leaving an unresolved audit call.

If both the original envelope and its single repair fail validation,
`ProviderService` emits one diagnostic warning containing only the request
purpose and bounded Zod `path` / `code` / `message` entries for both attempts.
It never logs the prompt, player line, or generated output, and the public
audit continues to expose only `invalid_envelope`. This is enough to diagnose
a live schema mismatch without turning provider text into a log surface.

Fallback is resilience, not the production policy. For player judgment, fallback is
the deterministic signal classifier in
`src/runtime/conversation-suspicion.ts`; for conversation and agent steps it
is the bounded rule adapter. A merged conversation fallback may preserve an
already-earned stance, but it cannot promote an uncertain or opposed resident
to `vouch`; transport or format failure is not positive social evidence. The HUD shows the selected profile,
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
