# Lane 01 - Bureaucratic and Surveillance Simulator Benchmarks

## 1. Scope and Source Policy

This lane studies English-language web sources for bureaucratic, procedure, surveillance, and consequence simulators that can benchmark Dream of One's current Same Order Store -> Station prototype. Sources are limited to official pages, Steam pages, developer or publisher pages, and reputable interviews or criticism where they clarify the loop. Research conclusions here are not product truth; they are benchmark inputs for Game Studio, game-director, and production judgment.

Selection favors games where the player performs a legible job through constrained cues: documents, profiles, feeds, dossiers, broadcast controls, inspection tools, or rule packets. The useful comparison is not theme alone. The useful comparison is how a small set of repeatable checks becomes pressure, consequence, and moral load.

Dream of One adoption must preserve the current direction:

- The player is not an investigator.
- NPCs and Station systems investigate the player.
- Text is where the danger starts.
- Provider or LLM output is wording only.
- Backend/runtime deterministically owns suspicion signals, Evidence, reports, inquest, verdict, and session termination.

The main inversion for this research is simple: most benchmark games put the player in the authority seat. Dream of One should steal their procedural clarity while keeping the player as the inspected subject.

## 2. Benchmark Cards

### Papers, Please

Source URLs: [Steam](https://store.steampowered.com/app/239030/Papers_Please/?curator_clanid=36850605&l=english), [official site](https://papersplea.se/)

Core player job: The player is an immigration inspector at the Grestin border checkpoint, deciding who enters, who is refused, and who is arrested.

Main loop: Receive an entrant, inspect their papers, compare details against current Ministry rules, ask follow-up questions or run searches when discrepancies appear, stamp the decision, then absorb pay, penalties, story events, and family costs.

Judgment cues: Passports, permits, identity supplements, rulebook updates, official bulletins, entrant dialogue, transcripts, inspection mode, search tools, fingerprinting, and stamps.

Pressure mechanism: Time and queue throughput collide with a growing rule stack. Each day adds document types, exception rules, security incidents, family expenses, and moral pressure from entrants.

Consequence model: Procedural mistakes trigger citations and lost pay. Correct decisions can still harm individuals. Narrative branches and multiple endings reflect accumulated choices, affiliations, finances, arrests, and escapes.

What Dream of One can steal: The one-station structure, the daily rule packet, the visible discrepancy check, and the fact that a tiny UI action can carry moral weight. Translate documents into utterances: the player speaks or selects a line, NPC/Station systems compare it against deterministic Cover Test and Dream Law rules, then the game shows the captured quote, reason code, Exposure/report delta, and next procedure.

What to avoid: Do not turn the player into the inspector. Do not build an opaque gotcha parser where the player cannot understand why a phrase was dangerous. Do not let the LLM improvise rule truth.

### Not Tonight

Source URLs: [Steam](https://store.steampowered.com/app/733790/Not_Tonight/?l=english)

Core player job: The player is assigned bouncer work in an alternate post-Brexit Britain, using gig jobs to survive under hostile bureaucracy.

Main loop: Pick shifts through the work app, man doors at venues, check IDs and guest lists, admit or deny patrons, manage unruly behavior, earn cash and experience, upgrade tools, and decide how far to comply with or resist the regime.

Judgment cues: IDs, guest lists, venue requirements, the BouncR job interface, apartment/status screens, work tools, and political messages.

Pressure mechanism: The door queue moves under time pressure while requirements vary by venue and shift. Survival pressure comes from money, residence status, tool upgrades, social control, and political story choices.

Consequence model: Shift accuracy affects pay, progression, and survival. Story decisions frame whether the player keeps their head down, aids resistance, or gets squeezed by the state.

What Dream of One can steal: The shift format. Same Order Store can be treated as a short work-procedure encounter with rules that fit on-screen: who is asking, what cover statement is expected, what phrase would trigger suspicion, and what repair option remains. The job instructions should be quick to read and stressful to execute.

What to avoid: Avoid copying the Papers, Please-like bouncer interface too directly. Avoid making the player's job enforcement fantasy central. Dream of One needs social self-protection under observation, not door control.

### Orwell: Keeping an Eye On You

Source URLs: [Osmotic official page](https://www.osmoticstudios.com/orwell-keeping-an-eye-on-you/), [Steam](https://store.steampowered.com/app/491950/Orwell_Keeping_an_Eye_On_You), [GameSpot review](https://www.gamespot.com/reviews/orwell-review/1900-6416580/)

Core player job: The player is a human researcher for a government surveillance system, selecting which discovered data is passed to security forces.

Main loop: Search public and private digital sources, extract highlighted information, resolve contradictions, upload selected data, and watch the advisor/security apparatus act on the supplied framing.

Judgment cues: Web pages, social posts, dating profiles, news articles, blogs, chats, emails, private computers, medical files, and contradiction markers.

Pressure mechanism: The player has broad access but narrow responsibility: security only sees what the player forwards. Ambiguous text fragments can become damning when stripped of context.

Consequence model: Uploaded information changes how suspects are profiled and acted on. The consequence is not just discovery; it is state interpretation of selected fragments.

What Dream of One can steal: Text-fragment capture. Dream of One should make the player's own wording become the artifact: an NPC reports a line, Station stores it as Evidence, and the inquest replays it with deterministic reason codes. Orwell's key lesson is that selection and context are gameplay.

What to avoid: Do not make the player the surveillance analyst. Do not build a mystery-board game where the player solves NPCs. Do not let provider text decide whether a quote is true, suspicious, or exculpatory.

### Do Not Feed the Monkeys

Source URLs: [Alawar official page](https://alawar.com/games/do-not-feed-the-monkeys), [Steam](https://store.steampowered.com/app/658850/Do_Not_Feed_the_Monkeys/?curator_clanid=43566729)

Core player job: The player joins a secret observation club and watches strangers through hacked cameras while being warned not to interfere.

Main loop: Watch camera feeds, collect keywords and clues, search the in-game web, buy more feeds, manage sleep/food/work resources, and decide whether to observe, help, exploit, expose, or ignore subjects.

Judgment cues: Surveillance feeds, subject routines, spoken snippets, searchable keywords, emails, purchases, club messages, and personal resource meters.

Pressure mechanism: Time-of-day schedules create missed opportunities. The player also needs money, food, sleep, and enough camera access to advance.

Consequence model: Interference can help, extort, sabotage, expose, or worsen a subject's situation. Non-interference is also a choice. Endings and per-feed outcomes depend on how much the player watches and acts.

What Dream of One can steal: Scheduled observation windows and the value of waiting. Same Order NPCs can have routine-driven question moments where silence, repetition, repair, and weirdness produce different reports. "Do nothing" should remain a playable response, not a missing input.

What to avoid: Avoid voyeur fantasy and hidden-camera sprawl. Dream of One should not put the player behind the cameras; it should make the player aware that others may turn routine speech into reports.

### Beholder

Source URLs: [Alawar official page](https://alawar.com/games/beholder)

Core player job: The player is a state-installed apartment manager whose public landlord role hides a surveillance assignment.

Main loop: Maintain the building, install bugs, search tenant rooms, listen in, profile tenants, report or blackmail violations, handle quests, and support the player's family.

Judgment cues: Apartment cross-section, tenant routines, stolen items, bug recordings, profiles, directives, reports, money, family needs, and quest timers.

Pressure mechanism: State directives, tenant requests, family survival, money, and timed tasks pull against one another. Laws can make ordinary tenant behavior reportable.

Consequence model: Reports, blackmail, help, and concealment affect tenants, family, state standing, and endings. The player's survival can require harming others.

What Dream of One can steal: The living-system pressure around changing directives. Dream Law can behave like a deterministic rule regime that makes normal utterances dangerous under specific context. NPC reports should feel like procedure, not random hostility.

What to avoid: Do not give the player landlord or informant power. Avoid broad apartment-management scope. Avoid cruelty as the hook; Dream of One's hook is being watched through language.

### Contraband Police

Source URLs: [Steam](https://store.steampowered.com/app/756800/Contraband_Police/?curator_clanid=10591434&l=english)

Core player job: The player is a border guard inspector in a 1980s communist state, checking travelers, vehicles, and cargo.

Main loop: Verify documents, inspect vehicle condition and cargo, compare intelligence against observed details, search for hidden contraband with tools, accept or refuse entry, arrest offenders, and maintain the border post.

Judgment cues: Driver documents, vehicle bodies, cargo manifests, intelligence notices, UV flashlight evidence, extraction tools, station upgrades, and mission prompts.

Pressure mechanism: The number and subtlety of document errors increase over time. Contraband searches add spatial inspection, post maintenance, money, chases, attacks, and away missions.

Consequence model: Correct inspections earn money and standing. Missed contraband, wrong entry decisions, escaped smugglers, and faction choices affect resources and story.

What Dream of One can steal: Layered inspection escalation. A Same Order exchange can start as one clean cover check, then add prior-session memory, repeated-order mismatch, observed wording, NPC confidence, report handoff, and Station reconciliation.

What to avoid: Avoid open-world patrol, FPS combat, vehicle inspection, and physical contraband as core fantasies. They create scope without strengthening the text-danger premise.

### Death and Taxes

Source URLs: [Steam](https://store.steampowered.com/app/1166290/_/)

Core player job: The player is a Grim Reaper doing an office job: read profiles and decide which people live or die.

Main loop: Receive daily profiles and instructions, mark outcomes, submit paperwork, talk to the boss, receive pay, buy office items, and watch the world shift through branching story feedback.

Judgment cues: Person profiles, daily rules, desk tools, stamps/marks, boss conversations, pay, shop items, and outcome summaries.

Pressure mechanism: A simple binary action becomes stressful through quotas, ambiguous profile details, boss oversight, and the awareness that abstract paperwork changes lives.

Consequence model: Choices affect the world, unlock branching endings, and define the player's relationship to the office hierarchy and larger plot.

What Dream of One can steal: Daily packet discipline. Same Order should use small, readable rule packets and outcome summaries: what was expected, what the player said, what NPCs recorded, what Station inferred, and what happens next.

What to avoid: Avoid reducing Dream of One to abstract dossier sorting. The player must feel implicated through their own spoken or selected text, not detached from consequences as a clerk.

### Mind Scanners

Source URLs: [Steam](https://store.steampowered.com/app/1389550/Mind%5C_Scanners/), [Game Developer interview](https://www.gamedeveloper.com/design/mind-scanners-dev-malte-burup-on-forcing-a-game-design-onto-a-concept-the-psychotherapy-of-the-1800s-and-the-player-s-struggle-to-become-a-hero)

Core player job: The player is a state-approved Mind Scanner who diagnoses and treats citizens in a controlled metropolis.

Main loop: Choose patients, interpret their views, diagnose, operate treatment devices, manage time and resources, upgrade equipment, and decide whether to serve the Structure or aid resistance.

Judgment cues: Patient worldviews, diagnosis prompts, arcade-like treatment devices, resource counters, map/patient list, upgrade tools, and regime/resistance messaging.

Pressure mechanism: The patient list is long, time and resources are scarce, and the player must work under a regime that frames treatment as social order. The developer interview is especially useful because it identifies a production lesson: theme alone was not enough, and clear game rules had to be built around the concept.

Consequence model: Patient outcomes, resource gains, trust with the Structure, relationship to Moonrise, and daughter access are shaped by diagnosis and treatment choices.

What Dream of One can steal: Diagnosis as a deterministic tag. NPC/Station systems can classify a line as clean cover, repair attempt, uncertain statement, contradiction, weirdness, or exposure. The player can then attempt a repair line before escalation.

What to avoid: Avoid mental-health treatment parallels unless a future direction decision explicitly approves them. Avoid complex minigame tools before the core conversation consequence is readable.

### Not For Broadcast

Source URLs: [Steam](https://store.steampowered.com/app/1147550/Not_For_Broadcast/), [Xbox Wire developer article](https://news.xbox.com/en-us/2023/02/17/making-live-tv-for-not-for-broadcast/)

Core player job: The player unexpectedly runs a live TV editing booth during political upheaval.

Main loop: Monitor multiple live feeds, select camera shots, censor objectionable words or political material, choose adverts, maintain audience attention, manage equipment problems, and absorb family/national narrative consequences.

Judgment cues: Video feeds, censor controls, broadcast monitor, ads, audience/rating signals, equipment hazards, headlines, and household story beats.

Pressure mechanism: The broadcast is live. Timing, attention, censorship, and technical failure make small control inputs feel urgent. The developer article is useful because it explains how production format supported the "live" feeling.

Consequence model: Camera choices, censorship, ads, and political framing affect public perception, branching narrative outcomes, and family consequences.

What Dream of One can steal: Live exposure and replay pressure. Station inquest can feel like a broadcast replay of the player's prior wording: the line is captured, contextualized, and acted on in front of an authority system.

What to avoid: Avoid FMV scale, broadcast-director fantasy, and real-time multitasking until the basic Same Order speech consequence is proven. Not For Broadcast is useful as a pressure reference, not a scope target.

## 3. Cross-Game Pattern Extraction

The best benchmark games make the job legible before the story becomes heavy. Inspector, bouncer, surveillance researcher, club observer, landlord, border guard, reaper clerk, mind scanner, and TV editor are all concrete roles with repeatable work verbs. Dream of One needs the same clarity, but inverted: the player is the person trying to survive a procedure carried out by NPCs and Station systems.

The judgment cues are the game. Documents, IDs, feeds, dossiers, profiles, camera controls, and treatment devices are not flavor; they are where the player acts. Dream of One's equivalent is the transcript: player line, NPC prompt, prior statement, rule tag, report, Evidence why-line, and Station procedure.

Escalation usually comes from a growing rule stack, not from a larger world. Papers, Please adds documents. Not Tonight adds venue requirements. Contraband Police adds inspection layers. Dream of One should add social/procedural layers: same order memory, cover consistency, NPC suspicion, report handoff, Station intake, inquest, verdict.

Pressure works when it compresses interpretation time. Clocks, queues, live broadcasts, food/sleep meters, family bills, and state demands all make otherwise simple checks consequential. Same Order can use shorter NPC patience windows, repeated questions, social embarrassment, and Station deadlines before adding new locations.

Consequences must be readable. The player needs to see the path from input to outcome: what was checked, what failed, who recorded it, and what changed. For Dream of One, this means every report/inquest route needs a captured quote, deterministic reason code, Exposure/report delta, and visible result.

Ethical weight emerges from procedure. These games rarely need a long speech about morality when the interface itself asks the player to stamp, upload, report, censor, diagnose, or ignore. Dream of One should make "saying the wrong thing under observation" the ethical and survival pressure.

Branching is affordable when it is built from deterministic state. The benchmark pattern is not unlimited simulation; it is small procedure plus tracked variables. Dream of One should prefer seeded route states, reason codes, NPC report confidence, and Station thresholds over freeform mystery systems.

The strongest adoption principle is inversion. Steal procedural readability from authority games, but keep authority outside the player. The player tries to pass a Cover Test; NPCs and Station decide whether the text holds.

## 4. Dream of One Adoption Plan: Simulator-First Baseline Before Dream/LLM Layer

Build the baseline as a deterministic social-procedure simulator first. The prototype promise is not "AI dream conversation." The prototype promise is "your wording is observed, classified, reported, and judged."

1. Define the Same Order work packet.
   - One store counter.
   - One expected routine order.
   - One NPC who tests cover through ordinary service dialogue.
   - One Station path that receives reports.
   - A compact rule card: safe cover, repair, contradiction, weirdness, exposure.

2. Make the transcript the primary play object.
   - Show the NPC prompt.
   - Let the player choose or enter a line.
   - Record the exact player line.
   - Show the NPC reaction and whether the line was clean, uncertain, repaired, or reportable.
   - Store the same data in backend Evidence.

3. Implement deterministic suspicion before adding provider prose.
   - Backend owns reason codes, thresholds, fallback selection, report creation, intake, inquest, verdict, and session end.
   - Godot shows the player-facing consequence.
   - Provider output, when later enabled, only rewrites NPC/Station wording inside a validated schema.

4. Prove three route families before expanding content.
   - Clean cover: routine line passes and no report is created.
   - Repair route: a weak or odd line creates uncertainty, then a repair statement lowers or redirects risk.
   - Report route: a risky line creates Evidence, triggers NPC report, and pushes the player toward Station intake or inquest.

5. Add procedural escalation in small layers.
   - Prior order memory.
   - NPC preoccupation or pressure style.
   - Store crowd/social context.
   - Report confidence.
   - Station reconciliation prompt.
   - Verdict thresholds.

6. Add dream/LLM presentation only after the baseline is readable.
   - Dream layer can thicken tone, image, and uncanny phrasing.
   - LLM can propose bounded wording variants.
   - Neither can create new suspicion semantics, reports, Evidence types, or verdict outcomes.

7. Keep the current narrow prototype stronger than the broad premise.
   - Same Order Store -> Station is enough if it proves text danger.
   - More NPCs, locations, dream imagery, or provider cleverness are not progress unless they strengthen the procedure.

## 5. Game Studio Proof Gates and Cut Rules

Current director call for this research lane: CONCERNS, not READY. The benchmark direction is coherent, but adoption is only valid if the next build proves the core loop player-facing, not just in backend traces.

Proof gates:

1. Core action proof: In Godot, the player chooses or enters a line, an NPC reacts, and the backend records a deterministic classification.
2. Evidence readability proof: A screenshot or capture shows the player-facing path from line -> reaction -> reason -> consequence.
3. Determinism proof: Same seed and same line produce the same reason code, Exposure/report delta, and route.
4. Route contrast proof: Clean cover, repair recovery, soft report, and hard inquest/session-end routes are all demonstrable in Same Order Store -> Station.
5. Station proof: A report created in the store is visible as Station intake or inquest material, not a hidden backend-only event.
6. Provider boundary proof: Missing key, timeout, invalid JSON, unsupported authority claim, or unavailable model falls back deterministically with Evidence. Provider wording never changes gameplay truth.
7. Comprehension proof: A fresh reader/player can explain why the line became safe, uncertain, repaired, or dangerous without reading implementation files.

Cut rules:

- Cut extra locations until Same Order -> Station is readable.
- Cut open-world patrol, vehicle inspection, apartment management, and TV-broadcast scope.
- Cut "player as investigator" verbs, including case boards, suspect profiling, surveillance dashboards, or evidence hunting.
- Cut live provider usage if static authored lines do not already prove text danger.
- Cut free typing if it blocks proof; use recorded statement choices until manual text entry is ready.
- Cut dream imagery if it hides the procedural consequence chain.
- Cut any system whose outcome cannot be expressed as captured text, reason code, Evidence, report, inquest, verdict, or session state.

Required internal evidence records for the next adoption step:

- Backend fixture for line classification and route output.
- Evidence JSON containing conversation identity, captured quote, reason code, suspicion signal, Exposure/report delta, and route.
- Godot smoke for clean, repair, soft report, and hard inquest routes.
- Renderer-backed screenshot/contact sheet showing NPC reaction and Station consequence.
- Provider preflight/fallback record once provider wording is introduced.

## 6. Source List

- Papers, Please - Steam: https://store.steampowered.com/app/239030/Papers_Please/?curator_clanid=36850605&l=english
- Papers, Please - official site: https://papersplea.se/
- Not Tonight - Steam: https://store.steampowered.com/app/733790/Not_Tonight/?l=english
- Orwell: Keeping an Eye On You - Osmotic official page: https://www.osmoticstudios.com/orwell-keeping-an-eye-on-you/
- Orwell: Keeping an Eye On You - Steam: https://store.steampowered.com/app/491950/Orwell_Keeping_an_Eye_On_You
- Orwell review - GameSpot: https://www.gamespot.com/reviews/orwell-review/1900-6416580/
- Do Not Feed the Monkeys - Alawar official page: https://alawar.com/games/do-not-feed-the-monkeys
- Do Not Feed the Monkeys - Steam: https://store.steampowered.com/app/658850/Do_Not_Feed_the_Monkeys/?curator_clanid=43566729
- Beholder - Alawar official page: https://alawar.com/games/beholder
- Contraband Police - Steam: https://store.steampowered.com/app/756800/Contraband_Police/?curator_clanid=10591434&l=english
- Death and Taxes - Steam: https://store.steampowered.com/app/1166290/_/
- Mind Scanners - Steam: https://store.steampowered.com/app/1389550/Mind%5C_Scanners/
- Mind Scanners developer interview - Game Developer: https://www.gamedeveloper.com/design/mind-scanners-dev-malte-burup-on-forcing-a-game-design-onto-a-concept-the-psychotherapy-of-the-1800s-and-the-player-s-struggle-to-become-a-hero
- Not For Broadcast - Steam: https://store.steampowered.com/app/1147550/Not_For_Broadcast/
- Not For Broadcast developer article - Xbox Wire: https://news.xbox.com/en-us/2023/02/17/making-live-tv-for-not-for-broadcast/
