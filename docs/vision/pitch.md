# Pitch

## One sentence

A first-person 3D social sim where you are the suspect: six LLM-driven
townspeople live on their own schedules, talk to one another, and remember
what they see — and to leave town you must edit what they believe about you,
through conversation alone, before the scheduled Station hearing decides what
you are.

Owner-approved canonical sentence (Korean, 2026-07-11): 여섯 자율 LLM 주민이
당신 없이도 서로 만나 당신에 대한 이론을 굳혀 가는 1인칭 3D 소도시에서,
정해진 청문회 날까지 대화만으로 주민들의 믿음을 편집해(보증 확보·소문 진압)
'평범한 사람' 판정을 받아 마을을 떠나는 게임.

## The fantasy

You wake as an outsider in a small administered town and you look like you
belong. You are not sure you do. Six residents keep living around you: the
studio receptionist opens her desk, the office worker crosses the park at
noon, the liaison carries words between buildings. They meet, talk, and form
opinions — about each other, and about you — whether or not you are in the
room. Every conversation you enter is a chance to seed the story of an
ordinary person; every conversation you miss is one where the town writes
that story without you.

On the scheduled day, the Station convenes a hearing. Each resident brings
only what they actually saw, heard, and were told. If their pooled account
reads as ordinary, you leave. If it doesn't, you are classified.

The player is never the investigator. The society investigates the player —
and now it does so in rooms you physically walk through.

## Why now / why this team shape

This is an AI-built game about AI-driven NPCs. NPCs are constrained agents:
they observe, choose a validated tool (move, look, talk, use an object, write
a record), read the result, and iterate — a coding agent's loop pointed at a
social world. A swappable LLM provider layer is the NPCs' actual mind: it
decides what they say, whom they seek out, how suspicious they become, and
how the hearing weighs an account. Deterministic rules enforce validity —
sight/context separation, tool validation, and bounded lifecycle transitions —
never the content of a judgment or an outage ending (see
[`design-pillars.md`](design-pillars.md)).

The 2026-07 research pass found that this architecture is precisely what the
proven-but-unshippable social-physics games (Prom Week, Versu, Elsinore)
lacked: their design worked and their hand-authoring cost killed them. The
provider layer removes that wall; the deterministic runtime keeps the
LLM-native failure modes (Vaudeville's invented witness, AI People's
goallessness) out.

## View and look

First-person 3D, one seamless tiny town: a park at the center, three
enterable single-story buildings (studio reception, office, Station), no
loading screens, no fake doors. Low-fidelity free assets are the accepted
norm — coherence, collision correctness, and social legibility are the bars,
not fidelity. The setting stays a **stateless administered district** —
generic-modern, institutionally named, deliberately unlocatable; Korean is
the authoring and tone-reference language of all content, with the same game
path localized into English, Italian, Simplified Chinese, French, and
Japanese. Surveillance pressure is drawn with
direction-aware subtitles for audible speech, reaction markers, and
inspectable records.

## References (what we take, what we leave)

| Game | Take | Leave |
|---|---|---|
| Overboard! (inkle) | A dated hearing computed from NPC beliefs; NPCs "out in front" of the player | Authored timetable puzzle-box as the whole content |
| My Summer Car | A rough but *implemented* first-person world beats a pretty menu of scenes | Car assembly, survival systems |
| Shadows of Doubt | Citizens with jobs, homes, and routines in first person | Proc-gen anonymous cast; player-as-detective framing |
| Papers, Please | Mundane procedure as tension; records as truth | Booth-locked player |
| Return of the Obra Dinn / Her Story | The player reconstructs what the system knows (we invert it: the system reconstructs the player) | Pure detective framing |

## Scope promise

The current milestone target is the honest conversion: a playable
first-person town where six NPCs verifiably live, talk, and remember, and one
run — arrive, be doubted, gather standing, survive the hearing or not — fits
a sitting. The first public target remains a 15–30 minute prologue demo
(M5): one town, six deeply-instrumented NPCs, Korean, English, Italian,
Simplified Chinese, French, and Japanese. Not
promised: open-ended chat, a fixed LLM model, a full campaign.
