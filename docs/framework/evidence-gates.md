# Evidence Gates

Evidence gates are internal validation points. They convert game-development
claims into observable proof by requiring concrete artifacts such as captures,
build IDs, playtest notes, QA results, release checks, and decision records.

Public-facing product language should use proof, playable proof, proof target,
proof budget, and validation. Use evidence only for internal artifact ledgers
and concrete captures.

## Evidence Types

- Playable build
- Screenshot or capture
- Save file or replay
- Telemetry sample
- Schema fixture
- Test output
- Playtest report
- Decision record
- Asset list with license notes
- Accessibility review
- Release promise audit
- Bug triage log
- Narrative state or branch coverage notes

## Evidence Classes

### Implementation Evidence

Implementation evidence proves that a technical path runs, parses, imports,
loads, builds, or produces expected data.

### Design Evidence

Design evidence proves that mechanics, dynamics, feedback, scope, and player
experience claims are connected.

### Player Evidence

Player evidence proves what a player did, noticed, misunderstood, felt, avoided,
or repeated.

### Release Evidence

Release evidence proves that public claims match build truth, known limitations,
accessibility support, localization, credits, and support expectations.

## Minimum Internal Artifacts by Stage

### Entry Route

- Entry mode record
- Direction source or taste source
- Stop condition when user authority is needed

### Concept Slate

- 3 to 5 comparable concepts
- First playable proof for each candidate
- Proof budget for each candidate
- Rejection reason for each candidate

### Creative Brief

- Selected concept
- Player promise
- Core verb
- First playable proof
- Proof budget
- Decision record or candidate status

### Constraint Ladder

- Capacity, taste, experience, mechanic, content, and release constraints
- Parked ambition with revisit conditions
- Cut rules tied to the proof budget

### First Prototype Question

- Prototype question
- Player moment to prove
- What to build
- What to ignore
- What to capture
- Stop condition

### Direction Lock

- Thesis
- Pillars
- Anti-pillars
- Player experience targets
- Release strategy
- Concept playability review verdict

### First Playable Proof

- Executable build or playable runtime
- Player action, system response, visible consequence, and next choice
- Failure or recovery path
- Gameplay capture
- QA walkthrough
- First playable review verdict

### Protocol Proof

- Minimal playable or simulated path
- Deterministic rules proof
- Internal evidence output
- Gate verdict

### Core Loop Prototype

- Player can complete the core loop
- Failure state exists
- Feedback exists
- Loop can be repeated
- Core loop proof gate verdict

### Pre-production Exit

- Core loop has playable proof
- Scope, cut candidates, dependencies, and capacity assumptions are named
- Technical, content, QA, accessibility, localization, and release risks are
  assigned
- Next milestone has quality criteria and fallback proof

### Presentation Value Gate

- The chosen camera, input, spatial layout, visual tone, and audio direction
  justify the presentation format.
- Moment-to-moment capture proves verb, read, risk, response, learning, camera,
  visual hierarchy, audio priority, and recovery.

### Vertical Slice

- A short play session represents the intended shipped quality bar.

### Demo Candidate

- External player can install, start, play, and understand limitations.

### Release Candidate

- Known limitations are documented.
- Blocking bugs are closed or explicitly waived.
- Store, build, localization, accessibility, and support promises are aligned.
- Public claims map to concrete internal evidence artifacts.

## Review Strength

- One source means hypothesis only.
- Two source types mean a pattern worth scheduling or prioritizing.
- Three source types mean a high-confidence finding that can block or drive a
  fix depending on severity.

Source types are observation, metric, and interview. Before a playable build
exists, walkthroughs, paper prototypes, and reference analysis are weak proof.
After first playable proof exists, observed player behavior outranks opinion.
