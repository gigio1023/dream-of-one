# Simulator Benchmark Synthesis

Status: synthesis draft pending lane reviews
Date: 2026-05-14

## Executive Verdict

Dream of One should be treated as a simulator-first game before it is treated as
an LLM or dream-narrative game.

The practical baseline should be closer to a tiny procedural job simulator than
to an open conversation RPG:

```text
The player is performing ordinary social procedure badly enough that society
starts to notice.
```

This framing gives the creator and agents something concrete to judge. Instead
of asking whether the game design document is "good," each proposed feature must
answer:

- What ordinary procedure is being simulated?
- What does the player do?
- What judgment cues let the player reason?
- What mismatch can an NPC notice?
- What record carries forward?
- What later system cites that record?
- What proof shows the player understood it?

## Benchmarked Source Anchors

The following sources anchor the synthesis and are expanded in lane documents:

| Source | Why it matters for Dream of One |
|---|---|
| Papers, Please via MobyGames: https://www.mobygames.com/game/62666/papers-please/ | Document checking turns small discrepancies into moral, financial, and state consequences. |
| Do Not Feed the Monkeys on Steam: https://store.steampowered.com/app/658850/Do_Not_Feed_the_Monkeys/ | Surveillance can be playable through limited observation feeds and forbidden interaction. |
| Orwell via MobyGames: https://www.mobygames.com/game/84583/orwell-keeping-an-eye-on-you/ | Data fragments become institutional interpretation; uploaded evidence changes how people are seen. |
| Death and Taxes on Steam: https://store.steampowered.com/app/1166290/Death_and_Taxes/ | A simple office job can carry world-scale consequence if the paperwork loop is clear. |
| Strange Horticulture on Steam: https://store.steampowered.com/app/1574580/Strange_Horticulture/ | A shop-counter routine can support mystery through customer requests, reference material, and choice consequence. |
| The Sims official site: https://thesims-api.ea.com/game-info/powerful-creative-tools | Life simulation works when people, careers, relationships, neighborhoods, and goals create repeated ordinary action. |
| Stardew Valley official site: https://www.stardewvalley.net/about/ | Routines gain depth through daily schedule, community, skills, seasonal repetition, and restoration goals. |
| SpyParty official site: https://www.spyparty.com/ | Social stealth can be about subtle behavior, perception, and deception rather than combat. |
| SpyParty manual: https://cdn.spyparty.com/wp-content/uploads/2011/03/SpyParty-Manual.pdf | A suspect performance becomes readable when normal crowd behavior, tells, watcher attention, and asymmetric roles are clear. |
| Among Us official site: https://www.innersloth.com/games/among-us/ | Blending in is supported by fake tasks, group suspicion, meetings, and simple visible goals. |
| Generative Agents paper: https://arxiv.org/abs/2304.03442 | LLM-backed agents become believable through memory, reflection, planning, and sandbox context, not raw chat alone. |
| Facade architecture paper: https://eis.ucsc.edu/papers/MateasSternAIIDE05.pdf | Interactive drama needs beat structure and a drama manager above moment-level response. |
| Prom Week social physics post: https://promweek.soe.ucsc.edu/2011/11/12/gameplay-and-social-physics/ | Social interaction becomes game-like when relationships and histories are represented as manipulable social state. |

## Pattern 1: Procedure First, Fiction Second

The strongest benchmark games make the player perform a job before they make a
claim about theme.

For Dream of One, that means the Store cannot begin as "a surreal dream
location." It begins as:

- there is a queue;
- there is a usual order;
- there is a receipt or label;
- the clerk has a record;
- the player's answer either fits or does not fit;
- a mismatch can be written down.

The dream layer becomes meaningful only after the ordinary procedure is legible.
If the ordinary procedure is vague, the player cannot tell whether danger came
from social rules, dream lore, bad UI, or arbitrary writer intent.

## Pattern 2: Judgment Cues Are The Game Board

In procedure sims, the signs, documents, feeds, and records are not decoration.
They are the board.

Dream of One needs a small but explicit set of judgment cues for each location:

| Location | Required cue | Player use |
|---|---|---|
| Store | queue sign, usual-order record, receipt/label, clerk prompt | infer what answer preserves cover. |
| Station | cited Store record, statement field, comparison prompt, outcome why-line | understand how speech became formal pressure. |
| Future Studio | asset/source/approval record | preserve ownership and release-proof consistency. |
| Future Park | posted norm, public flow cue, witness statement | avoid over-explaining or blocking ordinary behavior. |

This suggests a design correction: do not spend implementation effort on broad
NPC chatter until the player can read the local rule.

## Pattern 3: Pressure Needs A Record To Travel

Benchmarked games rarely rely on an invisible meter alone. They give pressure a
record or object the player can point to:

- a passport stamp;
- a surveillance datachunk;
- a receipt or report;
- a fake task;
- a witness tell;
- a job quota;
- a relationship state;
- a scheduled appointment.

Dream of One should use the public record for that job.

Every important dialogue consequence should leave one of these behind:

- no record change;
- clerk note;
- correction receipt;
- social report;
- Station citation;
- inquest transcript;
- verdict reason.

Without a record, suspicion feels like a meter. With a record, suspicion feels
like society investigating the player.

## Pattern 4: Recovery Is A Design Feature, Not Mercy

Good simulator tension is not just failure. It is the possibility of repair
under cost.

Dream of One should prove these recovery types before expanding content:

| Recovery type | Example |
|---|---|
| Social repair | The player accepts the clerk's premise after a memory-gap line. |
| Record repair | A correction receipt is attached before the report threshold. |
| Station repair | The player explains a Store mismatch in a constrained statement format. |
| Failed repair | A truthful but alien line makes the explanation worse. |

Repair should not erase risk. It should create a new, smaller record that the
player must keep consistent.

## Pattern 5: LLMs Should Add Social Texture After The Loop Works

LLM social simulation sources point toward memory, reflection, planning, drama
beats, and social context. They do not justify making the provider the game
master.

Dream of One should use OpenAI SDK/provider calls only after the deterministic
loop has already chosen:

- current location procedure;
- NPC pressure function;
- active storylet beat;
- selected player line;
- detected signal or no-signal;
- allowed consequence;
- artifact to cite;
- current drama act.

The provider can then propose:

- NPC wording variants;
- Station pressure phrasing;
- ambient overheard lines;
- localized variants;
- preoccupation-flavored responses.

It must not decide:

- whether a mismatch exists;
- whether a report is created;
- whether repair succeeds;
- whether an artifact is admissible;
- whether the session ends.

## Benchmark Adoption Ladder

| Step | Build | Proof |
|---|---|---|
| 1 | One Store procedure with readable signs/records. | Fresh player can state what the clerk expects. |
| 2 | Three choice lanes plus optional fixed recorded statement. | Player can explain why one line was safer. |
| 3 | Visible receipt/report artifact. | Player can see what will be cited later. |
| 4 | Station reconciliation cites exact Store record. | Player can connect prior speech to formal pressure. |
| 5 | Deterministic route contrast. | Clean cover, repair, soft report, and inquest all pass. |
| 6 | Provider wording layer. | Fallback and live/provider wording preserve identical consequence. |
| 7 | One new location using same grammar. | The grammar transfers without redesigning the game. |

## Game Studio Gate

Current verdict:

| Scope | Verdict | Reason |
|---|---|---|
| Simulator benchmark research | `READY` | Enough public source anchors exist to guide a benchmark-first design pass. |
| Same Order simulator-first revision | `READY_WITH_CONCERNS` | The current storylet packet matches the pattern, but the playable build still needs player-facing artifact clarity and comprehension proof. |
| Broad dream-society expansion | `NOT_READY` | The simulator baseline has not yet proven that players understand record propagation. |
| LLM-forward marketing or Codex/OpenAI packaging | `NOT_READY` | Provider value is not proven until deterministic fallback and wording parity are shown in the build. |

## Required Next Proof

The next proof should not be "more lore" or "more AI."

It should be a simulator adoption proof:

```text
Can a fresh player understand the Store as a procedure simulator,
then understand that their line became a record the Station can cite?
```

Required artifacts:

- Store procedure guide screenshot.
- Store conversation route video or contact sheet.
- receipt/report artifact screenshot.
- Station citation screenshot.
- route Evidence JSON.
- one-page comprehension note from a fresh tester or proxy dry run.
- provider-off fallback run proving the same outcomes.

## Open Risks

- The project can still drift into a beautiful but arbitrary conversation demo.
- The dream premise can obscure the procedure instead of sharpening it.
- LLM output can make the world feel broader while weakening player trust in
  consequence.
- A large reference list can create taste confusion unless each reference is
  reduced to a specific steal/avoid/proof implication.
- Existing M1 smoke can pass while the player still cannot read the rule.
