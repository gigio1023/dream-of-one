# Characters And Dialogue

Detailed source lines live in `docs/scenario/content/dialogue-line-bank.md`.

## Player

The player is an outsider who wakes in the central park. They know only that
a Studio review schedule might concern them; they do not know what happened
before waking or whether the booking is theirs. Those uncertainties are the
pressure under conversation, not a mystery with a discoverable solution and
not a fetch quest. No resident initially knows about the memory gap or the
player's uncertainty unless the player says so through validated speech.

## Current M3R Roster

Exactly six residents persist through a run. Their private pressures shape
what they may want to ask or discuss; they are not collectible secrets,
mandatory evidence, or authored triggers for reports and stance changes.

| Actor | Name and role | Public goal | Private pressure and knowledge | Korean voice |
|---|---|---|---|---|
| `NPC_Studio_Receptionist` | 미라 (Mira), Studio receptionist | Understand why a visitor arrived and keep reception procedure clear. | Mira personally saw one Studio review slot with no confirmed assignee. She cannot tell whether she omitted a name or the visitor arrived without a booking. | Gentle service `해요체`; one concrete fact or question at a time. |
| `NPC_Studio_Manager` | 이보 (Ivo), Studio manager | Keep review work orderly and resolve exceptions through attributable procedure. | Ivo once approved an exception whose source was insufficient. He is reluctant to discuss it and now overcorrects toward explicit source, owner, and reason. This is motivation, not leverage for the player to collect. | Short, dry, review-oriented clauses; source/owner/reason cadence without jargon parody. |
| `NPC_Office_Worker` | 노라 (Nora), Office worker | Complete confirmations while separating known facts from hearsay. | Nora has received two separately attributed confirmations that conflict on the time or assigned person. She cannot establish which is current and does not ask the player to solve it for her. | Careful `해요체`; marks what was confirmed, what was heard, and what remains unverified. |
| `NPC_Park_Caretaker` | 솔 (Sol), Park caretaker | Keep the park usable and describe public activity without inventing motives. | Before opening, Sol personally saw an unidentified person on the path from the Station. Sol has no basis for identifying that person as the player. | Soft civic `해요체`; separates observation from inference and avoids early accusation. |
| `NPC_Station_Officer` | 엘리안 (Elian), Station officer (`스테이션 담당관`) | Reconcile attributable records and conduct a revisable, bounded procedure. | Elian knows the initial intake account came through attributed hearsay rather than a direct witness. New attributable speech or records may change the assessment. | Flat `하십시오체` and institutional passive forms; calm, source-specific, non-colloquial. |
| `NPC_Roaming_Liaison` | 토마 (Toma), district liaison | Connect residents through real conversation while preserving attribution. | Toma once compressed a relayed message enough to alter its meaning. Toma knows this and now names the speaker or source before summarizing. | Concise source-first `해요체`; no unsupported synthesis. |

## Knowledge Boundary

- Mira's slot, Ivo's prior exception, Nora's confirmations, Sol's
  observation, Elian's intake provenance, and Toma's relay mistake begin only
  in their owner's backend-held context. This static context motivates speech;
  it is not a run memory, stance reason, record source, ledger event,
  provenance chain, or hearing citation by itself.
- A relationship fact may be shared by both participants, but one resident's
  private pressure is never copied into another resident's starting context.
- The player's memory gap and booking uncertainty begin only in the player
  brief. Residents learn them solely from validated player speech or an
  attributable record they are allowed to read.
- Personal information moves through real, validated NPC-to-NPC utterances.
  Record reading may add factual knowledge and institutional pressure, but it
  does not stand in for conversation or directly move a stance.
- Canon supplies motives and scene facts, never a required disclosure,
  report, conversation order, or hearing outcome. The provider decides what a
  resident says and attempts; runtime validation decides whether the action
  can affect the world.

## Relationship Lines

These are familiar channels, not scripted gossip chains. They correspond to
the current scheduled meeting windows:

| Pair | Relationship pressure |
|---|---|
| Ivo–Sol | Practical mutual respect. Ivo values a direct public observation; Sol resists turning it into a conclusion. |
| Mira–Sol | Familiar park-break conversation. Mira can speak less formally, while Sol still distinguishes what was seen from what was assumed. |
| Nora–Toma | Confirmation handoff. Nora wants exact attribution; Toma knows compression can change meaning. |
| Toma–Elian | Formal relay channel. Elian accepts named sources, not a liaison's unsupported conclusion. |

Mira and Ivo also know one another as receptionist and manager, but the canon
does not invent a guaranteed exchange outside the runtime's actual schedule
and spatial validation.

## Generic AI Dialogue Ban

Reject lines that:

- explain lore instead of applying a procedure;
- say "that is suspicious" without naming the observed mismatch;
- overuse dream words;
- make NPCs sound like quest givers;
- apologize for the system;
- add facts not backed by current artifacts;
- use English bureaucratic phrasing translated awkwardly into Korean.

## Legacy Regression Dialogue

Store-era barks, interrogation prompts, repair phrases, and expected answers
belong to the `Same Order` M1 regression packet and scripted adapters. They do
not define M3R production dialogue or a safe answer. Reuse their procedural
distance through the line bank only when writing bounded fallback; live
wording, judgment, and next actions remain provider-owned.
