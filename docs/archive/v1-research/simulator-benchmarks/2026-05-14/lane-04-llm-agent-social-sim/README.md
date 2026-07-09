# Lane 04: LLM Agent Social Simulation Benchmarks

Date: 2026-05-14

## 1. Scope and source policy

This lane researches English-language sources for using LLMs, generative agents, drama managers, and social simulation patterns on top of a deterministic simulator baseline. It is research guidance only. It does not change Dream of One product truth, active runtime paths, or implementation authority.

Dream of One constraints for this read:

- The player is not an investigator. NPCs and Station systems investigate the player.
- Text is where the danger starts. Player utterances are observed, tested, reported, and escalated.
- Godot is the active presentation runtime. The TypeScript backend/runtime owns deterministic validation, fallback selection, scheduling, Evidence semantics, suspicion signals, reports, Exposure, Station intake, inquest, verdict, and session termination.
- Provider and LLM output may supply wording only: NPC line candidates, Station pressure language, repair phrasing, localized variants, and ambient social texture. It must not own game truth.
- Current narrow prototype remains Same Order Store -> Station.

Source policy:

- Prefer primary research papers, official project pages, official docs, GDC/Valve developer material, and credible industry reporting.
- Treat product docs such as Inworld as pattern references, not dependencies.
- Treat AI Dungeon as a cautionary example of model-owned open text, not as a target architecture.
- Do not use user forum claims as source authority.
- No long verbatim quotes are copied here; claims are summarized with inline URLs.

## 2. Benchmark/research cards

### Stanford Generative Agents

Source: Park et al., "Generative Agents: Interactive Simulacra of Human Behavior" ([arXiv](https://arxiv.org/abs/2304.03442)); Stanford HCI lists it as a UIST 2023 best paper with project/demo links ([Stanford HCI](https://hci.stanford.edu/)).

Simulation unit: Individual agents in a sandbox town. Agents observe events, store natural-language memories, reflect over them, plan daily behavior, and interact with other agents and users through natural language.

Authorial control: Medium. Authors seed personas, environment, schedules, and scenario prompts, then allow emergent social behavior. The famous party example starts from one user-specified seed, but believability depends on many generated decisions that are not directly authored.

Memory/context model: Memory stream plus retrieval. The paper frames useful memory around complete event records, reflection into higher-level summaries, and dynamic retrieval for planning. This is powerful for social texture but dangerous if used as authority for game consequences.

Player input model: Natural-language user interaction in a visible simulated town. The user can talk to agents or inject scenario information.

Failure risks: High cost if every agent thinks every tick; hallucinated social causality; false confidence from believable behavior; agent omniscience if context is too broad; poor replayability if generated plans own outcome state.

What Dream of One can steal: Use natural-language memory as prompt context for NPC voice and gossip, not as truth. Use reflection-like summaries as backend-authored report digests. Give each NPC a compact identity, preoccupation, local knowledge, and recent Evidence-derived context. Cache ambient NPC-NPC chatter so Same Order feels socially alive without making every background exchange a live authority call.

What to avoid: Do not run a free multi-agent life sim for M1. Do not let reflection create new facts, suspicion deltas, or reports. Do not make the player a social scientist observing a town; the player should feel watched by local NPC and Station systems.

### Social Simulacra

Source: "Social Simulacra: Creating Populated Prototypes for Social Computing Systems" ([Google Research](https://research.google/pubs/social-simulacra-creating-populated-prototypes-for-social-computing-systems/), [arXiv](https://arxiv.org/abs/2208.04024)).

Simulation unit: A simulated online community populated by generated personas, posts, replies, moderator interventions, and antisocial behaviors.

Authorial control: Medium-high for research prototyping. Designers specify community goal, rules, and member personas, then inspect generated social traces and "what if" interventions.

Memory/context model: Prompted community specification plus generated interaction traces. This is closer to synthetic social testing than a live game memory architecture.

Player input model: Designer intervention rather than player embodiment. The user changes rules or interventions and reviews predicted social behavior.

Failure risks: Synthetic behavior can look plausible while being invalid. The technique is useful for ideation and risk discovery, but not a substitute for fresh-player comprehension, QA, or deterministic runtime proof.

What Dream of One can steal: Use offline LLM social-simulacra runs to stress-test Same Order storylets: What rumors emerge if the player repeats wrong wording? What report language would bystanders use? What rule changes reduce confusion? Feed the findings back into authored cards and deterministic backend tests.

What to avoid: Do not cite synthetic social traces as evidence that players understand Dream Law, Cover Test, Exposure, or Station intake. Do not import generated social norms directly into the game without human direction review and backend fixtures.

### Facade drama management

Source: Mateas and Stern, "Structuring Content in the Facade Interactive Drama Architecture" ([AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/18722)); Cornell preserves the released software record ([Cornell eCommons](https://ecommons.cornell.edu/entities/publication/12456066-628f-4a33-8f34-9bffd4202e93)).

Simulation unit: A one-act interactive drama built from joint dialog behaviors, story beats, character behavior, broad/shallow NLP, and a drama manager.

Authorial control: High. The system is not free improvisation; it uses authored beats and authored character behavior, then selects and sequences them in response to moment-to-moment player input.

Memory/context model: Dramatic state, discourse context, beat history, and relationship/tension variables. Memory exists to choose and perform authored beats, not to invent the truth of the drama.

Player input model: Typed natural language plus embodied presence in a small apartment scene.

Failure risks: Heavy authoring cost; brittle natural-language interpretation; player frustration when freeform input implies more agency than the beat system can honor; drama-manager opacity if the player cannot read why tension changed.

What Dream of One can steal: Put a deterministic drama/tension controller above the LLM. Use acts and beats such as calm cover, probing question, repair chance, soft report, Station intake, and inquest. Let the provider fill wording for the selected beat only.

What to avoid: Do not build a broad "marriage-drama" style parser for M1. Do not imply unlimited conversational agency if the runtime can only prove three choices plus bounded typed free input.

### Prom Week and Comme il Faut social physics

Source: Prom Week official "Gameplay and Social Physics" note ([UCSC](https://promweek.soe.ucsc.edu/2011/11/12/gameplay-and-social-physics/)); AIIDE playable-experience paper ([AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/12662)); publication list for CiF and Prom Week papers ([UCSC](https://promweek.soe.ucsc.edu/about/academic-publications/)).

Simulation unit: Social exchanges between characters. CiF tracks social facts, relationships, traits, histories, statuses, and rule-based considerations that shape desired actions and reactions.

Authorial control: High through social rules, characters, goals, authored dialogue instantiations, and templates. Emergence comes from recombining social actions and state, not from surrendering the world to text generation.

Memory/context model: Social history is explicit and queryable. The game remembers actions and uses history to affect future reactions and dialogue.

Player input model: The player chooses social actions for characters to perform toward one another in pursuit of social goals. The player is a manipulator of social state, not primarily a typed natural-language actor.

Failure risks: Large rule authoring burden; content coverage gaps when rare social states lack good dialogue; genre mismatch if imported too literally; player confusion if social consequences are invisible.

What Dream of One can steal: Treat reports, suspicion, and Station intake as social physics: explicit facts, observer identities, reason codes, and propagation rules. "The store knows" and "the Station knows" can be deterministic equivalents of Prom Week's school-wide social memory. Use the LLM to verbalize deterministic social facts into overheard remarks, not to decide the facts.

What to avoid: Do not widen Same Order into a general relationship sandbox. Do not let romantic/social-comedy assumptions leak into Dream Law or Cover Test semantics.

### Valve dynamic dialog and AI Director patterns

Source: Elan Ruskin's GDC 2012 talk on dynamic dialog through fuzzy pattern matching ([GDC Vault](https://www.gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through)); Mike Booth's "The AI Systems of Left 4 Dead" slides ([Valve archive](https://valvearchive.com/archive/Other%20Files/Publications/ai_systems_of_l4d_mike_booth.pdf)); Left 4 Dead design notes ([Valve Developer Community](https://developer.valvesoftware.com/wiki/Left_4_Dead_Design_Theory)).

Simulation unit: Runtime facts, tags, dialog lines, intensity values, pacing states, spawn/item decisions, and authored designer parameters.

Authorial control: High. Writers and designers author fact-sensitive lines, special cases, parameters, and pacing constraints; the runtime selects the best fit at play time.

Memory/context model: Facts about world state and history are tracked uniformly. The AI Director estimates player intensity, creates peaks and valleys, and adjusts pacing without changing the core truth of the map.

Player input model: Embodied action, movement, combat, damage, progress, and encounter history rather than typed conversation.

Failure risks: If the director is too visible, players feel manipulated. If facts are too broad, selected dialogue becomes uncanny. If pacing always escalates, players fatigue.

What Dream of One can steal: Use deterministic fact tags to drive NPC barks and provider prompts: `order_repeated`, `cover_repaired`, `witness_present`, `report_queued`, `station_intake_ready`. Use a simple intensity curve for conversation pressure: calm, probe, repair, report, intake. Let authored fallbacks cascade from specific to general when provider output fails.

What to avoid: Do not have the LLM select the route. Do not increase suspicion every turn just to make drama. Do not hide all cause and effect; Dream of One needs readable consequences.

### AI Dungeon

Source: Official App Store listing for AI Dungeon's current product positioning ([Apple App Store](https://apps.apple.com/us/app/ai-dungeon-rpg-story-maker/id1491268416)); TechCrunch on AI Dungeon and Latitude's open-ended AI RPG direction ([2021](https://techcrunch.com/2021/02/04/latitude-seed-funding/), [2026](https://techcrunch.com/2026/04/21/voyage-is-an-ai-rpg-platform-for-creating-custom-gaming-worlds-with-ai-generated-npc-interactions/)); Wired on content moderation and privacy failures around the product's open-ended generation history ([Wired](https://www.wired.com/story/ai-fueled-dungeon-game-got-much-darker/)).

Simulation unit: A generated text adventure continuation. The model narrates world events, NPC reactions, and consequences in response to arbitrary player text.

Authorial control: Low at the moment of play. Scenario setup, memory aids, story cards, and system prompting can shape generation, but the model is still asked to behave like the game master.

Memory/context model: Product memory features such as story cards and memory banks provide context, but the core value proposition is still open-ended generated adventure text.

Player input model: Freeform typed actions and dialogue.

Failure risks: The model can become the source of truth, causing incoherent state, unsafe output, moderation/privacy burdens, and consequences that feel unconstrained. The 2021 reporting is a direct warning that open-ended generation plus user text is a product-safety risk, not just a writing toy.

What Dream of One can steal: Bounded memory cards as prompt context, retry/fallback ergonomics for failed wording, and the lesson that players enjoy expressive text entry.

What to avoid: Do not make the provider a dungeon master. Do not allow arbitrary player text to directly mutate world state. Do not depend on moderation after the fact; fail closed before text becomes Evidence or player-facing consequence.

### Inworld Runtime character docs

Source: Inworld AI Characters overview ([Inworld docs](https://docs.inworld.ai/guides/runtime-character)); Unreal character template and runtime data docs ([Inworld docs](https://docs.inworld.ai/unreal-engine/runtime/templates/character)); character component reference ([Inworld docs](https://docs.inworld.ai/unreal-engine/runtime/character-reference/InworldCharacterComponent/InworldCharacterComponent)).

Simulation unit: Productized AI character components: character profile, role, voice, event history, relation state, emotion state, knowledge, knowledge filters, intents, goals, triggers, and conversation groups.

Authorial control: Medium-high when configured well. Designers define profile, knowledge, goals, intents, triggers, filters, and conversation-group rules, while the product handles orchestration.

Memory/context model: Event history, relation state, knowledge retrieval, knowledge filters, and goal runtime data. The docs explicitly separate always-on profile data from relevant retrieved knowledge and from intent-triggered goals.

Player input model: Conversational text or voice, often real-time.

Failure risks: Dependency lock-in; black-box behavior; hidden product state becoming hard to reconcile with Dream of One Evidence; over-trusting emotion/relationship variables that are not backed by backend proof.

What Dream of One can steal: Vocabulary and shape, not the dependency. Define local NPC profile, local knowledge, knowledge filter, event history, relation-to-player, preoccupations, intent triggers, and goal responses in project data. Keep those records auditable and backend-owned.

What to avoid: Do not let an external NPC platform own Station reports, Exposure, inquest, verdict, or session termination. Do not outsource proof gates.

## 3. Cross-source pattern extraction

LLMs work best here as social rendering engines, not social truth engines. Stanford Generative Agents and Social Simulacra show that language models can produce convincing social traces when given personas, context, and rules. Facade, Prom Week, Valve dialog, and Inworld all point to the same production lesson: convincing output still needs authored constraints, explicit state, and a runtime selector.

Authorial control should sit above generation. Facade has beats, Prom Week has social physics, Left 4 Dead has a director, Valve dialog has fact tags, and Inworld has goals/intents/filters. Dream of One's equivalent is Dream Law, Cover Test, suspicion signals, Evidence, reports, Exposure, Station intake, inquest, verdict, and session end.

Memory should be scoped, inspectable, and local. Generative Agents' memory stream is useful as a design reference, but Dream of One should store backend facts first, then provide a small prompt view: NPC identity, role, preoccupation, local knowledge, recent witnessed utterances, current route outcome, and allowed tone.

Free text is expressive but expensive. AI Dungeon and Facade show the risk of promising more language agency than the system can honor. Prom Week shows the opposite: constrained actions can still create rich social play if consequences are readable. For Same Order, three choices plus bounded typed recorded statement is the correct proof scale until manual input, consequence readability, and fallback are proven.

Believability is not validity. A generated NPC line can make a false chain of causality feel convincing. Therefore every provider line must be checked against backend state before it reaches the player.

Ambient society can be mostly cached. Stanford-style NPC life and Prom Week-style social repercussion can appear through pre-generated or fallback barks tied to deterministic report state. Live provider calls should be reserved for high-value moments: player-facing NPC response, repair prompt, report handoff, Station pressure, and localized variants.

## 4. Dream of One adoption plan

Deterministic sim first:

1. Backend receives player choice or typed statement and normalizes it.
2. Backend evaluates Dream Law, Cover Test fit, risk tag, suspicion signal, witness identity, Evidence type, why-line authority, Exposure/report delta, and next route.
3. Backend writes auditable Evidence and route events before provider wording is accepted.
4. Godot renders the selected route and visible consequence.

LLM wording second:

1. Backend builds a provider prompt from locked state: NPC profile, location procedure, preoccupation, local knowledge, recent conversation slice, deterministic outcome, allowed tone, forbidden claims, and max length.
2. Provider returns a schema-constrained wording proposal. OpenAI Structured Outputs are relevant because they enforce a JSON schema where supported and make refusals programmatically detectable ([OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)).
3. Backend validates the proposal: valid schema, no new facts, no forbidden authority claims, no hidden mechanical leakage, no invented Evidence, no route mutation, and localization parity if applicable.
4. If validation fails, backend uses deterministic authored fallback text and records the fallback reason.

OpenAI SDK/provider calls can add value in these places:

- NPC line candidate for a known deterministic reaction: clerk notices safe cover, hesitation, repair, or weirdness.
- Station pressure wording for a known deterministic intake state.
- Report paraphrase from fixed Evidence fields and reason codes.
- Ambient overheard line from queued social report facts.
- Tone variants driven by a deterministic drama manager: calm, probing, repair, clipped report, Station formal.
- Korean/English wording variants after backend parity checks.
- Offline authoring assistance for social-simulation cards, not runtime truth.

Provider calls should not add value in these places:

- Deciding suspicion, Evidence type, report eligibility, Exposure threshold, inquest trigger, verdict, or session end.
- Inventing new facts, witnesses, locations, NPC goals, Dream Laws, or Station procedures.
- Replacing backend validation, route selection, or fallback selection.
- Running background autonomous agents that can change Same Order state without an explicit deterministic event.

Recommended prompt contract:

```text
INPUT: locked deterministic event, allowed facts, NPC profile, tone directive.
OUTPUT: JSON wording proposal only.
MUST NOT: change route, add facts, expose hidden scores, decide suspicion, decide Evidence.
FALLBACK: deterministic authored line if schema, safety, latency, or authority checks fail.
```

## 5. Backend/provider proof gates and cut rules

Proof gates:

- Authority gate: A provider response must never create or alter Evidence, suspicion signals, Exposure, reports, Station state, verdict, or session termination.
- Preflight gate: Missing API key, unavailable model, rate limit, timeout, unsupported structured output, or provider error must select deterministic fallback before gameplay consequence.
- Schema gate: Provider output must match the accepted response schema. JSON mode alone is insufficient for authority-critical fields because it does not guarantee schema adherence; use structured outputs where supported or validate and retry/fallback locally ([OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)).
- Fact gate: Every noun phrase that asserts game state must be traceable to prompt facts or approved character profile. No invented witnesses, policies, locations, motives, reports, or Station actions.
- Consequence parity gate: Provider-enabled and provider-disabled runs must produce the same Evidence JSON, route event sequence, suspicion/report deltas, inquest trigger, and session end state.
- Replay gate: A saved Evidence fixture must replay with provider disabled and still prove the same route. Provider text is a captured artifact, not the route oracle.
- Readability gate: Godot screenshots or renderer captures must show that the NPC/Station reaction makes the consequence understandable to a fresh reader.
- Localization gate: Korean source text and English consequence wording must preserve the same deterministic reason codes and player risk.
- Safety gate: User free text and provider output must be screened before display. Safety refusal, blocked content, or incompatible input becomes deterministic repair/fallback, not missing state.
- Cost/latency gate: Provider calls must fit the per-turn budget. Cache ambient lines and cut live calls from low-value moments before compromising route proof.

Cut rules:

- If provider integration makes M1 evidence flaky, cut live provider calls and ship deterministic authored/fallback wording for the proof.
- If typed free input cannot be validated and rendered cleanly, cut it to a recorded-statement fixture or keep only three choices for the current proof.
- If provider text invents authority twice in the same scenario class, remove that field from the provider contract and replace it with backend-authored text.
- If an NPC appears omniscient, reduce prompt context to local knowledge plus witnessed facts.
- If localization parity fails, cut generated localization and use authored bilingual templates.
- If ambient chatter consumes budget or confuses the route, cache it offline or remove it from the playable proof.
- If an external NPC product would own hidden state, memory, report logic, or escalation, reject the dependency for the active runtime path.

## 6. Source list

- Stanford Generative Agents: [arXiv](https://arxiv.org/abs/2304.03442), [Stanford HCI](https://hci.stanford.edu/).
- Social Simulacra: [Google Research](https://research.google/pubs/social-simulacra-creating-populated-prototypes-for-social-computing-systems/), [arXiv](https://arxiv.org/abs/2208.04024).
- Facade interactive drama architecture: [AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/18722), [Cornell eCommons](https://ecommons.cornell.edu/entities/publication/12456066-628f-4a33-8f34-9bffd4202e93).
- Prom Week and Comme il Faut: [Gameplay and Social Physics](https://promweek.soe.ucsc.edu/2011/11/12/gameplay-and-social-physics/), [AIIDE Prom Week](https://ojs.aaai.org/index.php/AIIDE/article/view/12662), [UCSC publications](https://promweek.soe.ucsc.edu/about/academic-publications/).
- Valve dynamic dialog and director patterns: [GDC Vault dynamic dialog](https://www.gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through), [The AI Systems of Left 4 Dead](https://valvearchive.com/archive/Other%20Files/Publications/ai_systems_of_l4d_mike_booth.pdf), [Valve Developer Community design theory](https://developer.valvesoftware.com/wiki/Left_4_Dead_Design_Theory).
- AI Dungeon caution: [Apple App Store](https://apps.apple.com/us/app/ai-dungeon-rpg-story-maker/id1491268416), [TechCrunch 2021](https://techcrunch.com/2021/02/04/latitude-seed-funding/), [TechCrunch 2026](https://techcrunch.com/2026/04/21/voyage-is-an-ai-rpg-platform-for-creating-custom-gaming-worlds-with-ai-generated-npc-interactions/), [Wired](https://www.wired.com/story/ai-fueled-dungeon-game-got-much-darker/).
- Inworld product pattern docs: [AI Characters](https://docs.inworld.ai/guides/runtime-character), [Character template](https://docs.inworld.ai/unreal-engine/runtime/templates/character), [Character component](https://docs.inworld.ai/unreal-engine/runtime/character-reference/InworldCharacterComponent/InworldCharacterComponent).
- OpenAI provider structure reference: [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
