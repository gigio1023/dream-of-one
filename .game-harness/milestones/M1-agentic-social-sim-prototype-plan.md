# M1 Agentic Social Simulation Prototype Plan

Status: active target proposal
Date: 2026-05-15
Stage: M1 Protocol Proof
Verdict: `READY_WITH_CONCERNS` for issue split after human acceptance

## Name

Same Order Agentic Environment Prototype

## Goal

Rewrite the Same Order prototype target around one authored environment that
role agents can use freely through validated affordances, while keeping
conversation as the player's main action.

## Direction Sources

- `docs/direction/13-operation-sim-quality-floor.md`
- `docs/direction/14-minimal-civic-economy-model.md`
- `docs/direction/15-agentic-social-simulation-model.md`
- `docs/direction/16-agentic-prototype-target.md`
- `docs/scenario/content/environment-affordance-map.md`
- `docs/scenario/content/same-order-storylet-packet.md`

## Prototype Claim

M1 proves this claim only:

```text
A small Store/Station environment can create varied social reactions from
conversation-driven state changes, without hand-authoring every reaction branch.
```

It does not prove a full autonomous town, full economy, final AI NPC behavior,
or public demo readiness.

## Milestone Proof

The proof passes when the build shows:

1. player can read the Store procedure before speaking;
2. player speech changes a Store object and ledger event;
3. Store Clerk chooses a validated environment affordance;
4. Manager or Waiting Customer reacts to visible burden or queue pressure;
5. Station cites exact Store ledger event;
6. clean, repair, soft report, and inquest routes still diverge;
7. fresh player or proxy explains the social cause chain.

## Work Packages

| ID | Package | Owner lane | Done means |
|---|---|---|---|
| `AS-01` | Environment affordance data | Systems + Narrative | Store/Station objects, states, affordances, visibility, and ledger mappings are in data or docs ready for runtime. |
| `AS-02` | Civic ledger schema | Backend | ledger event type covers Store sale, correction, report, escalation, Station citation, economy deltas, validation result. |
| `AS-03` | Store object states | Godot | queue/counter/usual-order/receipt/correction/report objects have visible states in the scene/HUD. |
| `AS-04` | Store Clerk deterministic agent tick | Backend + Godot | clerk observes current object/ledger state and chooses normal receipt, correction, pause, or note through validation. |
| `AS-05` | Store-side actor reaction | Backend + Godot + Narrative | manager or waiting customer reacts to burden/delay without omniscient facts. |
| `AS-06` | Station citation | Backend + Godot + Narrative | Station dossier cites exact Store ledger event and asks one constrained question. |
| `AS-07` | Provider-off evidence pack | QA + Backend | route evidence includes perception, affordance, validation, ledger, and outcome. |
| `AS-08` | Visual capture and comprehension | QA + UX | captures and tester/proxy note prove player understood environment -> speech -> record -> social reaction -> Station. |

## Current Implementation Status

Backend seed implemented:

- `backend/npc-runtime/src/runtime/agentic-environment.ts`
- `backend/npc-runtime/src/runtime/same-order-agentic-routes.ts`
- `backend/npc-runtime/test/integration/agentic-environment.integration.test.ts`
- `backend/npc-runtime/test/integration/same-order-agentic-routes.integration.test.ts`

This partially satisfies `AS-01` and `AS-02` for backend authority. The seed
defines Same Order objects, role visibility, affordance validation, ledger event
kinds, civic economy deltas, and exact Station citation rules.
It now also exposes available action candidates from the current environment
state, so tests can prove role perception, object state, authority, and known
ledger citations shape what an actor may choose before mutation.
It also partially satisfies `AS-07` at backend contract level by generating
clean, repair, soft report, and inquest route proofs from validated environment
actions and proving those proofs can be attached to the existing Godot Evidence
Pack shape.
`godot/tools/playable_slice_smoke.gd` now writes those proofs to
`playability.agenticRouteProofs`, and the current playable slice artifact
contains them.
`backend/npc-runtime/src/runtime/same-order-provider-action-comparison.ts` now
adds a provider-shaped comparison lane: scripted provider proposals choose from
available actions, unsupported state/authority fields are rejected, and the
resulting route proofs must preserve provider-off ledger, object-state, and
civic economy outcomes. The current playable slice artifact carries
`playability.providerActionComparison`.
`backend/npc-runtime/src/runtime/same-order-provider-scheduling.ts` now turns
that comparison into a provider scheduling contract: 27 bounded role-agent jobs
carry current available actions, allowed provider fields, forbidden authority
fields, deterministic fallback wording, accepted locked actions, and exact
Station citation. The current playable slice artifact carries
`playability.providerSchedulingPlan`, and the harness note lives at
`.game-harness/provider/same-order-provider-scheduling-contract-2026-05-16.md`.
This is contract evidence, not live Godot dispatch.
`backend/npc-runtime/src/runtime/same-order-provider-dispatch-contract.ts` now
turns scheduled jobs into `/v1/npc/decision` packets: each packet parses as a
`PerceptionPacket`, rejects caller-authored conversation authority fields, and
passes bounded behavior with wording-only decisions. The current playable slice
artifact carries `playability.providerDispatchContract`, and the harness note
lives at
`.game-harness/provider/same-order-provider-dispatch-contract-2026-05-16.md`.
This is packet contract evidence, not live HTTP/Godot dispatch.
`backend/npc-runtime/src/runtime/same-order-comprehension-proxy.ts` now adds a
pre-playtest comprehension proxy: current route evidence, world props,
agent-action logs, ledger events, provider-shaped comparison, provider
scheduling contract, provider dispatch packet contract, and ordered
affordance trail are checked against C1-C7, while explicitly keeping the
external comprehension blocker open. The
current playable slice artifact carries
`playability.comprehensionProxy`, and the harness note lives at
`.game-harness/comprehension/same-order-comprehension-proxy-2026-05-16.md`.
`backend/npc-runtime/src/runtime/same-order-visual-evidence-proxy.ts` now
verifies existing renderer capture artifacts against the visual-capture
manifest: required Store conversation roles, PNG signatures, dimensions, file
size, contact sheet, and human-readability flags. The current playable slice
artifact carries `playability.visualEvidenceProxy`, and the harness note lives
at `.game-harness/visual/same-order-visual-evidence-proxy-2026-05-16.md`.
`backend/npc-runtime/src/runtime/same-order-asset-bill-of-materials.ts` now
verifies the Store/Station asset bill of materials: Kenney CC0 source packs,
local license files, referenced local files, project-authored procedural record
props, HUD files, and M1 audio scope. The current playable slice artifact
carries `playability.assetBillOfMaterials`, and the harness note lives at
`.game-harness/assets/same-order-asset-bom-2026-05-16.md`.
`godot/scripts/runtime/playable_session.gd` now exports `recordObjects`,
`civicEconomy`, and `civicLedger`, while `godot/scripts/ui/social_stealth_hud.gd`
renders the compact record-state line. `godot/scripts/world/world_generator.gd`
now spawns Store/Station world prop slots for receipt, correction slip, report
tray, Station dossier, civic ledger, and civic economy; `PlayableSession`
updates their labels, colors, and state metadata; and
`godot/tools/playable_slice_smoke.gd` validates the world prop snapshot.
This partially satisfies `AS-03` for HUD and scene readability, but still lacks
fresh Godot CLI smoke and fresh screenshot proof. Existing renderer captures
now verify through a backend proxy, but that is not a new capture from the
latest Godot runtime.
`godot/scripts/runtime/playable_session.gd` now also records
`agentActionLog`: Same Order object and ledger mutations go through
deterministic role-agent validation for actor role, perceived objects,
affordance state, role authority, record id, cited ledger event, and why-line.
The log now carries available action candidates and a selection reason for each
accepted mutation.
`godot/data/world_layout.json` includes `NPC_Store_Manager`, and the playable
smoke now requires soft report to include a Store Manager action and inquest to
end with Station Officer `cite_record`; it also checks that each selected
action was present in the available candidate list. This partially satisfies
`AS-04`, `AS-05`, and `AS-06` at deterministic Godot-loop level.

It does not satisfy `AS-03` through `AS-08` as a player-facing proof. Godot
still needs a fresh Godot smoke run, screenshots, comprehension proof, and live
provider dispatch inside the runtime before this milestone can pass. The
provider-shaped backend comparison, scheduling plan, and dispatch packet plan
are contract proof, not live provider availability.

## Required Evidence Artifacts

| Artifact | Path or target | Must show |
|---|---|---|
| route evidence JSON | `data/evidence/godot/` | selected line, object state, agent action, validation, ledger event, route outcome. |
| screenshot/contact sheet | `data/evidence/godot/visual-capture/` | existing capture proxy verifies files and dimensions; fresh route screenshot capture still required. |
| asset BOM | `docs/scenario/content/same-order-asset-bill-of-materials.md` and `.game-harness/assets/same-order-asset-bom-2026-05-16.md` | local source, license, procedural prop, UI, audio-scope, and replacement plan proof. |
| agent action log | backend/Godot evidence export | perception -> available action candidates -> selected affordance -> validation result -> ledger event. |
| comprehension note | `.game-harness/review-log.md` or verification ledger | proxy proves the current artifact exposes the cause chain; fresh player notes still required for product closure. |
| provider boundary note | `.game-harness/verification-ledger.md`, `.game-harness/provider/same-order-provider-scheduling-contract-2026-05-16.md`, and `.game-harness/provider/same-order-provider-dispatch-contract-2026-05-16.md` | provider-shaped proposal path preserves provider-off ledger outcomes; scheduled role-agent jobs and backend dispatch packets exist; live provider availability remains separate. |

## Verification Commands

Required existing checks:

```bash
PATH=/opt/homebrew/bin:$PATH npm run check --prefix backend/npc-runtime
node /Users/naem1023/git/game-studio/tools/check-project.mjs /Users/naem1023/git/dream-of-one
git diff --check
```

Godot checks remain required when the local `godot` binary is available:

```bash
godot --headless --import --path godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
```

## Cut Rules

- no Studio/Park playable expansion;
- no full economy;
- no staff management;
- no always-on LLM citizens;
- no provider-owned state mutation;
- no public AI/Codex claim;
- no vertical slice label.

## Exit Gate

`READY`: evidence proves one small environment with 2-3 role agents can produce
varied validated social reactions from conversation-driven state.

`CONCERNS`: environment and ledger proof pass, but comprehension or visual proof
needs targeted repair.

`NOT_READY`: proof still depends on hand-authored reaction branches, invisible
records, omniscient agents, or uncited Station pressure.
