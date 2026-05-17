# Quality Bar And Validation

Detailed playtest flow and narrative QA rubric live in `docs/scenario/playtest/scenario-qa-rubric.md`.

## Scenario Readiness

A scenario is ready for implementation only when each beat has:

- location;
- player goal;
- examiner NPC;
- Dream Law;
- conversation prompt;
- three dialogue choices or an explicit recorded-statement affordance;
- suspicion signal candidates;
- detector trigger;
- allowed player verbs;
- player-line effects;
- artifact output;
- why-line;
- fail-forward consequence;
- Korean source text;
- English localized intent;
- implementation hook in Godot or backend.

## Provider Gameplay Readiness

The game is not live-provider-backed until these pass:

- API proposal is generated from current ObservationFrame, conversation state, and NPC role context.
- Runtime preflight proves configured provider and model availability.
- Backend schema validates or rejects the proposal.
- Rejected provider output produces deterministic fallback and Evidence reason.
- Accepted provider line changes wording only.
- Exposure, intake, Inquest, verdict, and termination remain backend-owned.
- Two runs can show varied NPC phrasing with the same deterministic outcome under the same state.

## Indie Quality Bar

| Bar | Pass |
|---|---|
| Authored constraint | The scenario uses a narrow loop and every element serves pressure. |
| Procedural clarity | The player can learn a rule before being punished for it. |
| Social stealth | NPCs test normality through behavior and speech, not combat. |
| Text danger | Text surfaces, barks, prompts, and why-lines can change or explain state. |
| Fail-forward | Mistakes become records, not dead ends. |
| Environmental story | Props, routes, lights, and signs communicate procedure before dialogue explains it. |
| Korean tone | Korean lines sound like authored institutional language. |
| Determinism | Exposure, intake, Inquest, verdict, and termination are rule-owned. |

## Rejection Checklist

Reject scenario content if:

- the player is asked to investigate the case;
- an NPC exists only to explain lore;
- a weird image has no procedure or pressure role;
- a failure has no artifact or state consequence;
- a line says "suspicious" without naming the mismatch;
- a verdict appears without a reconstructable trigger/witness/record chain;
- English text is written first and Korean is a literal afterthought;
- Godot scene dressing hides the relevant text surface.

## Three Required Test Runs

| Run | Purpose | Required Result |
|---|---|---|
| Clean Cover | Verify defuse path. | Exposure stays repairable; why-lines show compliance. |
| Messy Repair | Verify fail-forward path. | Intake/Inquest can open without immediate session end. |
| Lucid Fracture | Verify verdict path. | Verdict ready cites exact non-procedural and contradictory records. |

## Implementation Evidence

| Artifact | Purpose |
|---|---|
| `data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json` | Proves scenario loop reaches visible Station state. |
| `data/evidence/godot/shell/dre_171_shell_evidence.json` | Proves world shell has required landmarks, zones, actors, and text surfaces. |
| `data/evidence/godot/runtime-slice/dre_171_runtime_slice_evidence.json` | Proves runtime command, fallback, and Evidence semantics. |
| `data/evidence/godot/screenshots/main-shell.png` | Opening visual proof. |
| `data/evidence/godot/screenshots/03-active-conversation-hud.png` | Conversation prompt and three choices visual proof. |
| `data/evidence/godot/screenshots/06-inquest-session-end.png` | Inquest/session-end visual proof. |

## Validation Commands

```bash
npm run check --prefix backend/npc-runtime
godot --headless --import --path godot
bash /Users/user/.agents/skills/godot-best-practice/scripts/check_gd_syntax.sh godot
godot --headless --path godot --script res://tools/scene_load_smoke.gd
godot --headless --path godot --script res://tools/evidence_run.gd
godot --headless --path godot --script res://tools/runtime_slice_smoke.gd
godot --headless --path godot --script res://tools/playable_slice_smoke.gd
godot --headless --path godot --script res://tools/localization_smoke.gd
godot --headless --path godot --script res://tools/keyboard_look_smoke.gd
godot --path godot --script res://tools/visual_capture.gd
```

## Playtest Questions

Ask after a 15-minute blind run:

- What did you think the Station wanted from you?
- Which text did you fear answering?
- Which NPC felt like they were examining you?
- Why did Exposure change?
- What record caused the final Station state?
- Did any object feel decorative but meaningless?
- Did Korean text feel natural, institutional, and cold?
