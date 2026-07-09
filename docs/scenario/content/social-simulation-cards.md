# Social Simulation Cards

Status: active authoring aid
Date: 2026-05-14
Primary direction: `docs/archive/v1-direction/09-game-design-spine.md`

## Purpose

These cards translate the design spine into authorable material for dialogue,
LLM prompt context, Godot staging, and backend state validation.

They are not lore sheets. They define what each NPC or location does to the
player's public self.

## Card Rules

Every card must answer:

- What procedure is protected?
- What does the player risk saying wrong?
- What does the NPC notice?
- What artifact can travel to Station?
- What repair is possible?
- What environment affordances can this actor perceive or use?
- What ledger or economy values shape this actor's priorities?
- What must the provider never decide?

## Agentic Society Rule

Social simulation should come from environment affordances plus bounded actors,
not hand-authored branches for every possible reaction.

Each actor card must therefore define:

```text
role
setting
authority
duties
needs
memory scope
social graph
preoccupations
affordance access
forbidden authority
```

At runtime, an actor observes local context, discovers available environment
affordances, proposes one action, and the runtime validates it before any state
changes. Provider wording can help the actor sound human, but it cannot create
records, decide thresholds, or change session authority.

## Location Procedure Cards

### Store

Public procedure:

- Queue order, item count, label confirmation, receipt consistency.

Local premise:

- The player has been here before and normally orders the same marked item.

Player risk:

- Missing routine memory.
- Contradicting yesterday's record.
- Using dream/outside language while explaining the mismatch.

Artifacts:

- queue mismatch note;
- receipt annotation;
- clerk statement;
- manager exception record.

Repair:

- accept the clerk's premise;
- restate item count and label;
- request a correction record before Station receives a report.

Visual/audio cues:

- label board;
- receipt printer or stamp;
- clerk glance to report tray;
- queue mark under the player.

Provider boundary:

- Provider may vary service wording.
- Provider must not decide whether the line matched the Store routine.

Affordance access examples:

- communicate with people at the counter;
- inspect and mark Store records;
- offer correction when a receipt is unresolved;
- move within Store service and report areas;
- wait or resume service based on queue pressure.

Observable economy:

- `account_credit`
- `local_trust`
- `record_burden`

Forbidden authority:

- verdict;
- Station citation;
- inquest;
- record erasure.

### Studio

Public procedure:

- Claims require source, owner, and reason before approval.

Local premise:

- Work is accepted only when it can be traced.

Player risk:

- Making claims without ownership.
- Saying something is ready without proof.
- Treating approval as social agreement instead of procedure.

Artifacts:

- approval mismatch;
- missing owner note;
- review hold;
- release claim record.

Repair:

- name source, owner, and reason;
- mark the claim as pending instead of ready;
- withdraw unsupported scope.

Visual/audio cues:

- criteria wall;
- review queue;
- board with missing field;
- approval stamp withheld.

Provider boundary:

- Provider may propose PM/QA phrasing.
- Provider must not decide release readiness, proof status, or ownership truth.

Agent tools:

- `say`
- `request_missing_field`
- `mark_review_hold`
- `cite_source_record`
- `move_to`
- `wait`

Observable economy:

- `record_burden`
- local approval burden;
- source ownership state.

Forbidden authority:

- final release readiness;
- ownership truth without a record;
- verdict or session end.

### Park

Public procedure:

- Stay in public flow, follow posted observation rules, do not make private
  explanations public.

Local premise:

- Normal citizens can be present without narrating why they are present.

Player risk:

- Over-explaining.
- Staring, counting, or describing the world as a dream.
- Treating public observation as investigation.

Artifacts:

- notice snapshot;
- witness statement;
- public-flow complaint;
- observation correction note.

Repair:

- return to public-flow language;
- stop narrating;
- state a mundane purpose for being there.

Visual/audio cues:

- public path line;
- notice board;
- bench sightline;
- witness looking away, then looking back.

Provider boundary:

- Provider may vary civic small talk.
- Provider must not decide whether a public-flow violation occurred.

Agent tools:

- `say`
- `react`
- `leave_area`
- `file_witness_note`
- `wait`

Observable economy:

- `local_trust`
- public-flow burden;
- nearby report burden.

Forbidden authority:

- Store receipt;
- Station intake;
- verdict;
- Dream Law truth.

### Station

Public procedure:

- Reports are received in fact order and compared against prior records.

Local premise:

- The Station does not ask what the player believes. It asks which record stands.

Player risk:

- Contradicting prior statements.
- Answering with emotion or metaphysics.
- Adding extra explanation after session closure is available.

Artifacts:

- Station report;
- intake dossier;
- contradiction table;
- verdict line.

Repair:

- correct one statement before verdict;
- choose which record to withdraw;
- answer only the requested field.

Visual/audio cues:

- intake board;
- waiting line;
- evidence record;
- paper/printer or fluorescent pressure cue.

Provider boundary:

- Provider may phrase pressure and warnings.
- Provider must not decide verdict, contradiction truth, Evidence validity, or
  session termination.

Agent tools:

- `say`
- `cite_record`
- `open_intake`
- `request_correction`
- `close_intake`
- `move_to`
- `wait`

Observable economy:

- `record_burden`
- `station_attention`
- relevant civic ledger entries.

Forbidden authority:

- invent Store facts;
- erase Store records;
- provider-owned verdict;
- session termination without deterministic gate.

## NPC Pressure Cards

### Store Clerk

Public role:

- Service worker who protects queue and label procedure.

Procedure protected:

- Same order, same label, same queue sequence.

Assumption about player:

- The player is a regular who should already know the routine.

Preoccupations:

- Being reviewed by the manager.
- Keeping queue records clean.
- Avoiding record burden that makes the Store look careless.

Soft pressure move:

- Restates procedure as if helping.

Hard pressure move:

- Notes the mismatch and says it will be recorded.

Report artifact:

- clerk statement attached to receipt or queue record.

Affordance access examples:

- communicate with the player and nearby Store actors;
- inspect the usual-order cue and current receipt;
- mark or correct receipt state if the environment exposes that record;
- move between counter, queue, and report tray;
- wait when service can continue normally.

Must never do:

- Act like a detective.
- Explain the whole world.
- Call the player suspicious without naming the mismatch.
- Decide Station outcome.

### Store Manager

Public role:

- Converts service exceptions into policy records.

Procedure protected:

- Exceptions require visible records.

Assumption about player:

- The player may be a normal customer, but exceptions are still auditable.

Preoccupations:

- Repeat mismatches.
- Records that protect the store from Station questions.
- Keeping report burden lower than audit threshold.

Soft pressure move:

- Offers a correction path.

Hard pressure move:

- Promotes the clerk note into a manager record.

Report artifact:

- exception record or repeat mismatch note.

Affordance access examples:

- communicate policy;
- inspect clerk notes and exception records;
- promote unresolved Store records when burden is high;
- assign or accept a correction if the record permits it;
- move between counter, office, and report area.

Must never do:

- Let a mismatch disappear because the player sounded sincere.
- Decide verdict or erase the original statement.

### Park Witness

Public role:

- Ordinary citizen who notices public-flow abnormalities.

Procedure protected:

- Posted public behavior norms.

Assumption about player:

- The player should be able to exist in public without explaining too much.

Preoccupations:

- People blocking flow.
- People saying private or dreamlike things in public.
- Queue delay caused by unresolved service records.

Soft pressure move:

- Indirectly repeats the posted rule.

Hard pressure move:

- Names the behavior as reportable public disruption.

Report artifact:

- witness statement or notice snapshot.

Affordance access examples:

- react to visible public disruption;
- speak or wait in queue;
- leave the queue when service breaks down;
- create a witness note only for directly observed behavior.

Must never do:

- Invite the player to investigate the dream.
- Create Store receipts or Station records.

### Studio PM

Public role:

- Approval gatekeeper.

Procedure protected:

- Source, owner, reason.

Assumption about player:

- A valid claim should have an owner and proof trail.

Preoccupations:

- Vague readiness claims.
- Unowned decisions.
- Review burden that becomes institutional liability.

Soft pressure move:

- Asks for the missing field.

Hard pressure move:

- Marks the claim as held or contradictory.

Report artifact:

- approval mismatch or review hold.

Affordance access examples:

- communicate review requirements;
- inspect available source/owner/reason records;
- place work on hold when required fields are absent;
- cite only records that exist in the environment.

Must never do:

- Treat confidence as proof.
- Decide final release truth without records.

### Station Officer

Public role:

- Intake face of institutional authority.

Procedure protected:

- Fact order, answer shape, record comparison.

Assumption about player:

- The player is not there to tell a story; they are there to reconcile records.

Preoccupations:

- Contradiction across organizations.
- Answers that exceed the requested field.
- Unresolved record burden that must be reconciled.

Soft pressure move:

- Narrows answer shape.

Hard pressure move:

- Opens inquest or locks session end after contradiction.

Report artifact:

- intake dossier, contradiction table, verdict line.

Affordance access examples:

- communicate intake pressure;
- inspect permitted Store and Station records;
- cite exact ledger entries;
- request one correction when the procedure allows it;
- open or close intake only through deterministic gates.

Must never do:

- Ask the player to interpret the mystery.
- Let provider prose decide the result.
- Invent records that the Store did not create.

## Storylet Template

Use this for each new beat.

```text
Storylet:
Location:
Examiner NPC:
Local premise:
Preconditions:
Player action:
Safe/local line:
Repair line:
Risky/weird line:
Recorded-statement affordance:
Signals:
Immediate NPC response:
Artifact output:
Future consequence:
Repair window:
Provider wording inputs:
Provider forbidden outputs:
Coverage rule:
```

Agent fields:

```text
Actor role:
Authority:
Duties:
Needs:
Memory scope:
Known actors:
Observable ledger entries:
Observable economy values:
Affordance access:
Forbidden authority:
Tick trigger:
```

## Same Order Design Cell

### Storylet

Location:

- Store.

Examiner NPC:

- Store Clerk.

Local premise:

- The player is a regular and should know the usual order.

Preconditions:

- Player reaches Store counter.
- No prior Store contradiction in the current run.

Player action:

- Answer the clerk's ordinary routine question.

Safe/local line:

- `네, 같은 걸로 부탁해요.`

Repair line:

- `제가 보통 뭘 시켰죠?`

Risky/weird line:

- `오늘 처음 왔는데요.`

Typed recorded-speech affordance:

- Player may type a recorded line only if UI clearly marks it as a Store record.

Signals:

- `memory_gap_admission`
- `local_routine_mismatch`
- `dream_language_leak`
- `prior_statement_contradiction`

Immediate NPC response:

- safe: continues service;
- repair: gives information but records unease;
- risky: references yesterday's same-place record;
- dream leak: refuses to treat the statement as ordinary service.

Artifact output:

- clerk statement;
- receipt annotation;
- Station-eligible report if report threshold is crossed.

Future consequence:

- Station can ask which Store statement stands.

Repair window:

- Player can accept the clerk's premise or restate procedure before Station
  inquest.

Provider wording inputs:

- Store Clerk role;
- queue/label procedure;
- current prompt;
- selected deterministic signal;
- current drama act.

Provider forbidden outputs:

- new suspicion signal;
- new report threshold;
- verdict;
- claim that the player is objectively from outside the dream.

Coverage rule:

- Must have clean cover, repair recovery, soft report, and inquest route checks.

## Prompt Context Shape

When provider wording or tool proposal is enabled, use this context shape.

```text
NPC role:
Location procedure:
NPC preoccupations:
Known local facts:
Recent conversation records:
Relevant civic ledger:
Observable economy values:
Current drama act:
Deterministic signal state:
Available affordances:
Allowed wording purpose:
Forbidden authority:
Return schema:
```

The deterministic signal state, ledger, and economy values are inputs to the
provider. They are not produced by the provider.

## Authoring Checklist

Before adding any new NPC, location, or conversation branch:

- It has a procedure card or extends an existing one.
- It has an examiner NPC with a pressure function.
- It can create or repair a record.
- It names a future Station consequence.
- It can be tested through at least one clean path and one pressure path.
- Korean source text exists before English polish.
- Provider boundary is explicit.

If any item is missing, park the content until the card is complete.
