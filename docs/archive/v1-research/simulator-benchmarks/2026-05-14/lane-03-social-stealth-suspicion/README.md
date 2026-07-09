# Lane 03: Social Stealth, Suspicion, And Being Watched

## 1. Scope and source policy

This lane benchmarks English-language games where the player hides intent, role, route, identity, or wording while another actor watches, infers, reports, or punishes. The useful comparison is not "detective game" in general. Dream of One's current direction is player-as-suspect: NPCs and Station systems investigate the player, text is where the danger starts, and deterministic backend/runtime owns suspicion signals, Evidence, reports, inquest, verdict, and session end. Provider or LLM output may only vary wording.

Source preference for this pass: official sites, Steam pages, developer posts, platform blogs carrying developer-authored material, and reputable interviews. Fan wikis and walkthroughs were not used as authority. No long verbatim quotes are reproduced; all benchmark takeaways below are paraphrased with source URLs inline.

## 2. Benchmark cards

### SpyParty

- Source URLs: official about page (http://www.spyparty.com/about/), Steam page (https://store.steampowered.com/app/329070/SpyParty/), FAQ (http://www.spyparty.com/faq/), developer post on tells and anti-tells (http://www.spyparty.com/2016/03/09/some-subtle-tells-and-anti-tells-and-some-fonts-leakage-release-v0-1-4434-0/).
- What is being hidden: the human Spy's identity and mission intent inside a crowd of plausible partygoers.
- Who watches: a human Sniper observing from outside, with one decisive shot.
- Suspicious actions: deviations from party norms, mission actions performed under social cover, timing, pathing, animation tells, and "anti-tells" where NPC-only behavior can accidentally clear a suspect.
- Feedback: laser attention, sniper shot, round outcome, replay/spectation, and repeated short rounds that let players learn the grammar of suspicion.
- Fail/recovery model: if the Sniper shoots correctly the Spy loses immediately; if the Sniper hesitates or shoots an innocent the Spy can survive. Recovery happens before the shot through better blending, not after failure.
- What Dream of One can steal: make "normal behavior" explicit enough that deviations are readable. Same Order should establish a small social script, then let wording, timing, and procedural mismatch become deterministic tells. Evidence should name the tell category without exposing hidden math.
- What to avoid: do not make the player a sniper, investigator, or pixel-perfect tell reader. Dream of One needs watched speech pressure, not a PvP identification duel.

### Among Us

- Source URLs: Steam page (https://store.steampowered.com/app/945360/Among_Us/), Innersloth beginner guide (https://innersloth.zendesk.com/hc/en-us/articles/7794240573460-Beginner-s-Guide-to-Among-Us).
- What is being hidden: Impostor role, murder route, sabotage intent, and post-hoc alibi.
- Who watches: crewmates through direct sight, Admin map, Security cameras, reports, meetings, and voting.
- Suspicious actions: fake tasks, venting, being alone near a death, path contradictions, self-reporting, odd silence or over-defense in discussion, and sabotages that split the group.
- Feedback: body reports, emergency meetings, accusation talk, vote ejection, sabotage alarms, optional visual tasks, and social vouching.
- Fail/recovery model: suspicion can be redirected through alibi, sabotage, framing, or killing trusted witnesses. Hard failure is ejection or crew extinction, but dead players still participate through limited ghost tasks or sabotage.
- What Dream of One can steal: Station inquest questions should be about where the player was, who saw them, what they said, and why their account contradicts a report. NPC reports can function like "soft meetings" without giving the player an accusation role.
- What to avoid: do not import group voting, hidden-role party-game blame, or player-led deduction. Dream of One's pressure should come from being questioned by systems, not from persuading other players to eject someone.

### HITMAN World of Assassination

- Source URLs: Steam page (https://store.steampowered.com/app/1659040/HITMAN_World_of_Assassination/), IO-authored PlayStation Blog post on disguises and blending (https://blog.playstation.com/2012/10/19/dressed-to-kill-disguises-in-hitman-absolution/), IOI patch note showing blend-in legality and visible illegal items as systemic concerns (https://ioi.dk/hitman/patch-notes/2026/game-update-3-260-1).
- What is being hidden: Agent 47's unauthorized identity, lethal intent, illegal inventory, and presence in restricted social spaces.
- Who watches: guards, civilians, cameras, role-aware NPCs, and local permission systems.
- Suspicious actions: wearing the wrong disguise, entering the wrong zone, carrying visible contraband, performing illegal actions, leaving bodies, or lingering near NPCs who can see through a cover.
- Feedback: suspicion arcs, guard callouts, trespass/hostile states, compromised states, combat escalation, and post-mission stealth ratings.
- Fail/recovery model: partial suspicion can be managed by blending in, changing route, changing disguise, hiding evidence, or leaving the area. Some mistakes cost rating or trigger combat without instantly ending the mission.
- What Dream of One can steal: use an authorization matrix for ordinary procedure. A Same Order customer, clerk, manager, witness, and Station intake officer should not all notice the same things. "Correct cover behavior" can reduce exposure only when it matches the watcher and place.
- What to avoid: assassination fantasy, costume inventory sprawl, and broad action stealth. Dream of One should keep the danger in speech, procedure, and reports rather than physical takedowns.

### The Occupation

- Source URLs: official site (https://www.occupation-game.com/), Steam page (https://store.steampowered.com/app/765880/The_Occupation/), Unreal Engine interview with White Paper Games (https://www.unrealengine.com/en-US/developer-interviews/the-clock-is-ticking-in-the-occupation-by-white-paper-games), PCGamesN interview (https://www.pcgamesn.com/the-occupation/the-occupation-ether-one).
- What is being hidden: the journalist's trespass, route, evidence-gathering intent, and preparation for interviews.
- Who watches: security guards, staff schedules, interview appointments, and the clock.
- Suspicious actions: restricted areas, breaking into offices, hacking or using codes, missed appointments, being seen where one should not be, and choosing risky routes for evidence.
- Feedback: staff reaction, security warnings, escort/time loss, watch alarms, real-time events, and interview consequences.
- Fail/recovery model: the story continues even when the player misses evidence or gets delayed. Failure often means reduced leverage, weaker interview options, worse outcomes, or lost time rather than a binary restart.
- What Dream of One can steal: scheduled social pressure. A store report, Station intake slot, or reconciliation prompt can advance without waiting for the player, as long as the player understands what clock or appointment is moving.
- What to avoid: making the player a journalist-investigator. Also avoid a large real-time sim before Same Order teaches the player how NPC reports, Exposure, and Station intake are read.

### The Ship: Murder Party

- Source URLs: Steam page (https://store.steampowered.com/app/2400/The_Ship_Murder_Party/), GameWatcher interview with Outerlight's Chris Peck (https://www.gamewatcher.com/interviews/the-ship-interview/11506).
- What is being hidden: target relationship, murder intent, current hunter/quarry status, and disguise changes.
- Who watches: the quarry, the player's hunter, other passengers, security guards, cameras, and witnesses.
- Suspicious actions: carrying or using weapons, killing under observation, trespassing, costume changes, bribes, security camera zones, and needs that push players into vulnerable spaces.
- Feedback: fines, guards, cameras, target reassignment, changing weapon rewards, needs pressure, and death or success in the hunt.
- Fail/recovery model: the player may be killed while hunting, can misread who is dangerous, can disguise to throw off a hunter, and is forced out of camping by needs.
- What Dream of One can steal: triangular pressure. The player should not only answer a clerk; they should also be pulled by errands, social obligations, and Station deadlines that make "just stay safe" impossible.
- What to avoid: target roulette, murder-comedy tone, and needs meters that compete with text danger.

### Unheard - Voices of Crime

- Source URLs: Steam page (https://store.steampowered.com/app/942970/Unheard__Voices_of_Crime/).
- What is being hidden: identity, motive, relationships, and chronology inside an audio reconstruction.
- Who watches: the player as an acoustic detective, after the fact.
- Suspicious actions: overheard speech, timing, movement between rooms, and contradictions between voices.
- Feedback: replayable audio, timeline movement, name/voice matching, and answer validation.
- Fail/recovery model: there is almost no live danger. The player can replay, re-listen, and revise until the case is solved.
- What Dream of One can steal: fairness of transcript evidence. If Station cites a suspicious phrase, the player should be able to inspect the exact recorded statement and why-line later.
- What to avoid: passive replay as the main loop. Dream of One needs live speech risk and consequence, not only postmortem audio deduction.

### The Forgotten City

- Source URLs: official site (https://forgottencitygame.com/), Steam page (https://store.steampowered.com/app/874260/The_Forgotten_City/), Game Developer interview on looping narrative structure (https://www.gamedeveloper.com/design/delving-into-the-narrative-structure-of-the-forgotten-city).
- What is being hidden: who will break the Golden Rule, what counts as sin, and how citizens' motives connect.
- Who watches: the city's law, divine enforcement, and the player-investigator through time-loop knowledge.
- Suspicious actions: theft, violence, morally ambiguous choices, dialogue leverage, and intervention in citizens' lives.
- Feedback: rule breach, catastrophic transformation, loop reset, retained knowledge, and changed dialogue or quest shortcuts.
- Fail/recovery model: failure resets the day while preserving player knowledge and some progress. The loop makes experimentation safe but can also turn consequence into optimization.
- What Dream of One can steal: a deterministic law can be morally ambiguous to characters while still mechanically authoritative. Dream Law, Cover Test, Exposure, and verdict can feel mysterious without letting the provider decide outcomes.
- What to avoid: time-loop power, moral detective fantasy, and reset-based consequence erasure. Dream of One's player should answer for speech rather than master the city through omniscience.

### Return of the Obra Dinn

- Source URLs: official site (https://obradinn.com/), Steam page (https://store.steampowered.com/app/653530/Return_of_the_Obra_Dinn/), Game Developer IGF interview (https://www.gamedeveloper.com/business/road-to-the-igf-lucas-pope-s-i-return-of-the-obra-dinn-i-).
- What is being hidden: crew identities, causes of death, relationships, and chain of events.
- Who watches: the player as insurance investigator; the scene itself is already over.
- Suspicious clues: frozen evidence, overheard fragments, spatial placement, uniforms, accents, names, and inference across deaths.
- Feedback: logbook entries, sentence-style fate assignments, batch confirmation, and slow accumulation of certainty.
- Fail/recovery model: wrong deductions sit unresolved until corrected; there is no live social threat.
- What Dream of One can steal: compact Evidence UI. Reports and inquest records should compress "speaker, statement, watcher, reason code, consequence" into a readable form.
- What to avoid: making the player the official investigator with perfect forensic access. Obra Dinn is a contrast benchmark, not a role model for Dream of One's player fantasy.

## 3. Cross-game pattern extraction

- Normality must be teachable before suspicion is fair. SpyParty, Hitman, and Among Us all work because players learn what ordinary movement, tasking, role permission, or alibi sounds like before deviations matter.
- Watchers should be partial, local, and opinionated. Hitman proves that not every NPC needs the same perception; Among Us proves that a witness's location and memory matter; The Occupation proves that schedules can watch indirectly.
- Suspicion should be tied to concrete facts. Good triggers include route, timing, restricted-place mismatch, task/procedure mismatch, visible item, witnessed contradiction, and exact wording. Bad triggers are hidden vibes or provider-authored intent.
- Feedback can preserve uncertainty while still naming consequence. "The clerk filed a soft report because your statement named a back-room detail" is better than a raw suspicion meter or a vague ominous reaction.
- Recovery is strongest before hard failure. SpyParty and Hitman let players manage attention before collapse; The Occupation lets mistakes cost time or leverage. Dream of One needs repair lines, partial reports, and Station reconciliation before verdict.
- Short loops carry harsh consequences. A one-shot SpyParty round or Among Us meeting can be brutal because rounds are compact. Dream of One should prove consequence first in Same Order before expanding world scale.
- Detective games are useful mainly as evidence UI contrasts. Unheard and Obra Dinn show fair reconstruction and readable records, but they put the player in the investigator role that Dream of One must reject.

## 4. Dream of One adoption plan: make player-as-suspect readable and playable without turning player into investigator

Director lens: preserve the player promise as "survive being read" rather than "solve what happened." The core repeated action is choosing or typing ordinary-seeming speech under procedural pressure, then living with the deterministic reading of that speech.

Systems lens: implement Same Order as a small authorization and report graph. Watcher classes should include clerk, nearby customer, manager/system log, and Station intake. Each watcher owns a small set of reason codes such as `cover_mismatch`, `procedure_detail`, `witness_contradiction`, `panic_marker`, `station_keyword`, and `repair_success`. Provider wording can decorate NPC and Station lines, but these codes and consequences must come from backend/runtime.

UX lens: teach one normal order script before punishing deviation. Then show a clear consequence chain: player statement -> NPC read -> Evidence why-line -> report or Exposure delta -> Station question. The player should never need to inspect hidden model state; they should understand the immediate social reason a watcher became interested.

Prototype adoption sequence:

1. Store baseline: play a clean Same Order route where a clerk accepts a normal order and no report fires.
2. Soft tell: add a line that is not criminal but socially mismatched, producing a mild clerk reaction and Evidence why-line.
3. Repair: allow one follow-up statement that can reduce or contextualize the signal without deleting the record.
4. Report handoff: let a soft report travel to Station with speaker, statement, watcher, and reason code.
5. Inquest: Station asks about the contradiction. The player answers as a suspect maintaining cover, not as an investigator collecting clues.
6. Verdict pressure: expose deterministic thresholds through outcome language, not through a visible RPG meter.

Specific steals by source:

- From SpyParty: tells are deviations from a taught social script.
- From Among Us: inquest pressure asks for pathing, witnesses, and alibi consistency.
- From Hitman: watcher authority depends on role, place, and visible context.
- From The Occupation: schedules and appointments can create pressure without combat.
- From The Ship: obligations should force exposure; staying inert should not be optimal.
- From Unheard and Obra Dinn: Evidence records must be compact, inspectable, and fair.
- From The Forgotten City: deterministic law can feel philosophically charged without giving away authority to prose generation.

## 5. UX/game-feel proof gates and cut rules

Proof gates:

- Baseline read gate: in a fresh Same Order capture, a player can state the expected store procedure before any suspicious branch appears.
- Suspicion cause gate: after a soft report, a player can identify the exact statement or action that triggered concern, plus the broad reason category, without seeing hidden numbers.
- Watcher legibility gate: two watcher types react differently to the same line because they have different authority or context.
- Recovery gate: one uncertain branch supports a repair response that changes later Station wording or Exposure delta while preserving the original Evidence record.
- Report continuity gate: Station intake references the same statement, watcher, and reason code recorded in Evidence.
- Text danger gate: changing only the player's wording can change the deterministic signal while the provider fallback preserves the same outcome.
- No-investigator gate: the player never receives an objective framed as "find the culprit," "solve the case," or "prove who did it."

Cut rules:

- Cut any feature that makes the player an investigator, detective, sniper, prosecutor, or group-vote leader.
- Cut any suspicion rule that cannot produce a short why-line tied to route, timing, procedure, witness, or exact wording.
- Cut any provider/LLM behavior that changes suspicion, Evidence, Exposure, report routing, inquest result, verdict, or session end.
- Cut any real-time schedule that hides the first proof loop or prevents the player from understanding recovery.
- Cut any UI that turns suspicion into a generic meter to optimize instead of a social consequence to interpret.
- Cut any broad stealth, disguise, combat, or inventory feature that makes text stop being where the danger starts.

## 6. Source list

- SpyParty official about: http://www.spyparty.com/about/
- SpyParty Steam: https://store.steampowered.com/app/329070/SpyParty/
- SpyParty FAQ: http://www.spyparty.com/faq/
- SpyParty tells and anti-tells developer post: http://www.spyparty.com/2016/03/09/some-subtle-tells-and-anti-tells-and-some-fonts-leakage-release-v0-1-4434-0/
- Among Us Steam: https://store.steampowered.com/app/945360/Among_Us/
- Innersloth beginner guide: https://innersloth.zendesk.com/hc/en-us/articles/7794240573460-Beginner-s-Guide-to-Among-Us
- HITMAN World of Assassination Steam: https://store.steampowered.com/app/1659040/HITMAN_World_of_Assassination/
- IO-authored PlayStation Blog disguise post: https://blog.playstation.com/2012/10/19/dressed-to-kill-disguises-in-hitman-absolution/
- IOI 3.260.1 patch notes: https://ioi.dk/hitman/patch-notes/2026/game-update-3-260-1
- The Occupation official site: https://www.occupation-game.com/
- The Occupation Steam: https://store.steampowered.com/app/765880/The_Occupation/
- Unreal Engine interview with White Paper Games: https://www.unrealengine.com/en-US/developer-interviews/the-clock-is-ticking-in-the-occupation-by-white-paper-games
- PCGamesN interview on The Occupation AI and time systems: https://www.pcgamesn.com/the-occupation/the-occupation-ether-one
- The Ship: Murder Party Steam: https://store.steampowered.com/app/2400/The_Ship_Murder_Party/
- GameWatcher interview with Outerlight: https://www.gamewatcher.com/interviews/the-ship-interview/11506
- Unheard - Voices of Crime Steam: https://store.steampowered.com/app/942970/Unheard__Voices_of_Crime/
- The Forgotten City official site: https://forgottencitygame.com/
- The Forgotten City Steam: https://store.steampowered.com/app/874260/The_Forgotten_City/
- Game Developer interview on The Forgotten City: https://www.gamedeveloper.com/design/delving-into-the-narrative-structure-of-the-forgotten-city
- Return of the Obra Dinn official site: https://obradinn.com/
- Return of the Obra Dinn Steam: https://store.steampowered.com/app/653530/Return_of_the_Obra_Dinn/
- Game Developer IGF interview with Lucas Pope: https://www.gamedeveloper.com/business/road-to-the-igf-lucas-pope-s-i-return-of-the-obra-dinn-i-
