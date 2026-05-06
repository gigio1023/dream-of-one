# Act And Pressure Map

## Three-Act Shape

| Act | Minutes | Function | Player Question |
|---|---:|---|---|
| Act 1: Public Procedure | 0-8 | Teach that rules are readable and social. | What does normal speech look like here? |
| Act 2: Civic Audit | 8-19 | Test the player across Store, Studio, and Park. | Can I keep the same public self across contexts? |
| Act 3: Station Closure | 19-30 | Reconcile all records through intake and Inquest. | Can my record survive formal comparison? |

## Five Pressure States

| State | Exposure | Social Texture | Station State |
|---|---:|---|---|
| Ambient | 0-39 | NPCs are polite; barks teach procedure. | Closed. |
| Report | 40-59 | NPCs begin using record language: statement, mismatch, note. | Monitoring. |
| Intake | 60-79 | Station accepts reports about the player. | `intakeOpen=true`. |
| Inquest | 80-99 | Prior statements are compared against current speech. | `inquestOpen=true`. |
| Verdict Edge | 100+ | The system can name and close the session. | `verdictReady=true`, `sessionTerminationAllowed=true`. |

## Turning Points

| Turn | Trigger | Required Feedback |
|---|---|---|
| Procedure accepted | Player reads first Dream Law surface. | HUD objective changes from movement guidance to cover performance. |
| First record | Any non-compliant Store or Studio speech act. | Evidence feed names witness, artifact, and Exposure delta. |
| Station interest | Exposure reaches 60. | Officer bark and Station prompt explain intake is open. |
| Inquest opens | Exposure reaches 80. | UI and barks shift from correction to comparison. |
| Verdict ready | Exposure reaches 100. | Verdict panel shows final why-line and session termination authority. |

## Pacing Rules

- Never sustain maximum pressure for the whole run.
- Alternate quiet reading, social test, record creation, and short relief.
- Do not stack a new rule and a major NPC interruption at the same time.
- If a player fails, the next beat should clarify the system rather than hide information.
- The final Station sequence should feel inevitable only because earlier records were visible.
