# Director Council

Director Council is used for high-impact decisions. It is not required for small implementation fixes.

## Lanes

| Lane | Responsibility | Blocks When |
|---|---|---|
| Dream Law Counsel | deterministic authority, thresholds, verdict | Codex/Godot prose owns state |
| Text Danger Reviewer | text as risk and evidence | text is decorative or safe |
| Station Pressure Reviewer | player is investigated | player becomes investigator |
| Systems Producer | milestone, scope, evidence | work lacks proof or expands scope |
| Godot Evidence Reviewer | playable/visual proof | 3D is decoration or unverifiable |
| Taste Contrarian | no-cloning, identity | generic mystery/noir/SCP/lore drift |

## Dispatch Rule

Use council when:
- a milestone may advance.
- 2D/3D direction may change.
- public promise may change.
- AI/NPC behavior may change authority.
- a feature changes player role or text consequence.

Do not use council when:
- fixing typo.
- implementing already-approved handoff.
- running mechanical checks.

## Output Contract

Each lane must end with:

```text
VERDICT: PASS
```

or:

```text
VERDICT: CONDITIONAL (N)
```

or:

```text
VERDICT: BLOCK (N)
```

The Director reducer then records the final decision in `03-director-decision-ledger.md`.
