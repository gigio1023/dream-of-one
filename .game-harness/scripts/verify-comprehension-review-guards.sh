#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

APP_PATH="${DREAM_OF_ONE_APP_PATH:-/private/tmp/dream-of-one-export-proof-4.7/app/Dream of One Godot Shell.app}"
ROUTE_EVIDENCE_PATH="${DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_PATH:-/private/tmp/dream-of-one-export-proof-4.7/app-route-evidence.json}"
APP_BINARY="$APP_PATH/Contents/MacOS/Dream of One Godot Shell"

if [[ ! -x "$APP_BINARY" ]]; then
  echo "Missing packaged app executable: $APP_BINARY" >&2
  exit 1
fi

if [[ ! -f "$ROUTE_EVIDENCE_PATH" ]]; then
  echo "Missing packaged route evidence: $ROUTE_EVIDENCE_PATH" >&2
  exit 1
fi

APP_BINARY_SHA256="$(shasum -a 256 "$APP_BINARY" | awk '{print $1}')"
ROUTE_EVIDENCE_SHA256="$(shasum -a 256 "$ROUTE_EVIDENCE_PATH" | awk '{print $1}')"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/same-order-review-guards.XXXXXX")"
trap 'rm -rf "$TMP_ROOT"' EXIT

TESTER_INVITE_FORBIDDEN_TERMS=(
  "Preflight ok"
  "providerState"
  "fallback_only"
  "stage:"
  "Packaged route evidence"
  "App:"
  "Notes directory"
  "route evidence"
  "sha256"
  "provider mode"
  "intended player role"
  "Station"
  "record"
  "report"
  "ledger"
  "receipt"
  "dossier"
  "Station citation"
  "citation"
  "inquest"
  "risk"
  "Evidence"
  "provider"
  "fallback"
  "examined"
  "being examined"
  "기록"
  "보고"
  "원장"
  "영수증"
  "서류철"
  "스테이션"
  "스테이션 인용"
  "검사"
  "조사"
  "심문"
  "위험"
  "증거"
)

EXTERNAL_NOTES_LEDGER="$REPO_ROOT/.game-harness/comprehension/same-order-external-comprehension-notes-2026-05-17.md"
NEUTRAL_PRE_PLAY_LINE="Play this short scene without prior explanation until it stops or until 5 minutes pass."
STALE_PRE_PLAY_LINE="Play this short Station intake path"

if rg -n --fixed-strings -- "$STALE_PRE_PLAY_LINE" "$EXTERNAL_NOTES_LEDGER" >/tmp/same-order-stale-preplay.$$ 2>/dev/null; then
  echo "External comprehension notes still contain stale pre-play wording." >&2
  cat /tmp/same-order-stale-preplay.$$ >&2
  rm -f /tmp/same-order-stale-preplay.$$
  exit 1
fi
rm -f /tmp/same-order-stale-preplay.$$

if ! rg -n --fixed-strings -- "$NEUTRAL_PRE_PLAY_LINE" "$EXTERNAL_NOTES_LEDGER" >/dev/null; then
  echo "External comprehension notes do not include the neutral pre-play line." >&2
  exit 1
fi

assert_tester_invite_has_no_spoilers() {
  local label="$1"
  local path="$2"
  local term
  for term in "${TESTER_INVITE_FORBIDDEN_TERMS[@]}"; do
    if rg -i -n --fixed-strings -- "$term" "$path" >/tmp/same-order-invite-leak.$$ 2>/dev/null; then
      echo "Tester-facing invite leaks facilitator-only setup details: $label" >&2
      echo "Forbidden term: $term" >&2
      cat /tmp/same-order-invite-leak.$$ >&2
      rm -f /tmp/same-order-invite-leak.$$
      exit 1
    fi
  done
  rm -f /tmp/same-order-invite-leak.$$
}

RECRUITMENT_OUTPUT="$TMP_ROOT/recruitment-output.md"
"$SCRIPT_DIR/run-same-order-comprehension-session.sh" --recruitment > "$RECRUITMENT_OUTPUT"
assert_tester_invite_has_no_spoilers "--recruitment" "$RECRUITMENT_OUTPUT"

LEAKY_RECRUITMENT_HELPER="$TMP_ROOT/leaky-recruitment-helper.sh"
sed 's/short playable game scene/short playable Record scene/' "$SCRIPT_DIR/run-same-order-comprehension-session.sh" > "$LEAKY_RECRUITMENT_HELPER"
chmod +x "$LEAKY_RECRUITMENT_HELPER"
set +e
leaky_output="$("$LEAKY_RECRUITMENT_HELPER" --recruitment 2>&1)"
leaky_status=$?
set -e
if (( leaky_status == 0 )); then
  echo "Expected leaky --recruitment helper to fail before printing a tester invite." >&2
  echo "$leaky_output" >&2
  exit 1
fi
if ! grep -Eiq "Tester-facing invite leaked|Record|record" <<<"$leaky_output"; then
  echo "Expected leaky --recruitment failure to name the leaked tester-invite term." >&2
  echo "$leaky_output" >&2
  exit 1
fi

SESSION_KIT_DIR="$TMP_ROOT/session-kit"
"$SCRIPT_DIR/run-same-order-comprehension-session.sh" --session-kit-output "$SESSION_KIT_DIR" >/dev/null
assert_tester_invite_has_no_spoilers "--session-kit-output tester-invite.md" "$SESSION_KIT_DIR/tester-invite.md"

MISSING_INDEX_ACTION_KIT_DIR="$TMP_ROOT/session-kit-missing-index-action"
cp -R "$SESSION_KIT_DIR" "$MISSING_INDEX_ACTION_KIT_DIR"
node - "$MISSING_INDEX_ACTION_KIT_DIR/session-kit-manifest.json" <<'NODE'
const fs = require("fs");
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.codexGameplayQa.actionCatalog = manifest.codexGameplayQa.actionCatalog.filter(
  (action) => action.actionId !== "dialogue.choice.by_index",
);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
set +e
missing_index_action_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$MISSING_INDEX_ACTION_KIT_DIR" 2>&1)"
missing_index_action_status=$?
set -e
if (( missing_index_action_status == 0 )); then
  echo "Expected session kit verifier to fail when dialogue.choice.by_index is missing from the action catalog." >&2
  echo "$missing_index_action_output" >&2
  exit 1
fi
if ! grep -q "actionCatalog:dialogue.choice.by_index" <<<"$missing_index_action_output"; then
  echo "Expected missing action catalog failure to name dialogue.choice.by_index." >&2
  echo "$missing_index_action_output" >&2
  exit 1
fi

MISSING_TYPED_STEP_KIT_DIR="$TMP_ROOT/session-kit-missing-typed-step"
cp -R "$SESSION_KIT_DIR" "$MISSING_TYPED_STEP_KIT_DIR"
node - "$MISSING_TYPED_STEP_KIT_DIR" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const kitDir = process.argv[2];
const manifestPath = path.join(kitDir, "session-kit-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const probePath = path.join(kitDir, manifest.codexGameplayQa.copiedJsonFile);
const probe = JSON.parse(fs.readFileSync(probePath, "utf8"));
probe.executedSteps = probe.executedSteps.filter((step) => step.actionId !== "player.type.free_input");
fs.writeFileSync(probePath, `${JSON.stringify(probe, null, 2)}\n`);
manifest.codexGameplayQa.sourceJsonSha256 = crypto.createHash("sha256").update(fs.readFileSync(probePath)).digest("hex");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
set +e
missing_typed_step_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$MISSING_TYPED_STEP_KIT_DIR" 2>&1)"
missing_typed_step_status=$?
set -e
if (( missing_typed_step_status == 0 )); then
  echo "Expected session kit verifier to fail when the copied Codex probe lacks an accepted typed free-input step." >&2
  echo "$missing_typed_step_output" >&2
  exit 1
fi
if ! grep -q "copiedProbeTypedFreeInputExecuted" <<<"$missing_typed_step_output"; then
  echo "Expected missing typed free-input execution failure to name copiedProbeTypedFreeInputExecuted." >&2
  echo "$missing_typed_step_output" >&2
  exit 1
fi

MISSING_VISIBLE_STATE_KIT_DIR="$TMP_ROOT/session-kit-missing-visible-state"
cp -R "$SESSION_KIT_DIR" "$MISSING_VISIBLE_STATE_KIT_DIR"
node - "$MISSING_VISIBLE_STATE_KIT_DIR" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const kitDir = process.argv[2];
const manifestPath = path.join(kitDir, "session-kit-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const probePath = path.join(kitDir, manifest.codexGameplayQa.copiedJsonFile);
const probe = JSON.parse(fs.readFileSync(probePath, "utf8"));
probe.aiPlayerReport.finalPlayerVisibleState.recordState = "";
probe.environmentSnapshot.hud.recordStateLabel = "";
fs.writeFileSync(probePath, `${JSON.stringify(probe, null, 2)}\n`);
manifest.codexGameplayQa.sourceJsonSha256 = crypto.createHash("sha256").update(fs.readFileSync(probePath)).digest("hex");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
set +e
missing_visible_state_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$MISSING_VISIBLE_STATE_KIT_DIR" 2>&1)"
missing_visible_state_status=$?
set -e
if (( missing_visible_state_status == 0 )); then
  echo "Expected session kit verifier to fail when copied Codex probe loses player-visible HUD record state." >&2
  echo "$missing_visible_state_output" >&2
  exit 1
fi
if ! grep -Eq "playerVisibleHudState|environmentHudSnapshot" <<<"$missing_visible_state_output"; then
  echo "Expected missing visible-state failure to name playerVisibleHudState or environmentHudSnapshot." >&2
  echo "$missing_visible_state_output" >&2
  exit 1
fi

MISSING_NPC_ROLE_STATE_KIT_DIR="$TMP_ROOT/session-kit-missing-npc-role-state"
cp -R "$SESSION_KIT_DIR" "$MISSING_NPC_ROLE_STATE_KIT_DIR"
node - "$MISSING_NPC_ROLE_STATE_KIT_DIR" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const kitDir = process.argv[2];
const manifestPath = path.join(kitDir, "session-kit-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const probePath = path.join(kitDir, manifest.codexGameplayQa.copiedJsonFile);
const probe = JSON.parse(fs.readFileSync(probePath, "utf8"));
probe.finalSummary.agentActionLog = probe.finalSummary.agentActionLog.filter((action) => action.actorRole !== "station_officer");
probe.finalSummary.civicLedger = probe.finalSummary.civicLedger.filter((event) => event.actorRole !== "station_officer");
probe.aiPlayerReport.roleActionExplanation = probe.aiPlayerReport.roleActionExplanation.filter((line) => !line.includes("station_officer"));
fs.writeFileSync(probePath, `${JSON.stringify(probe, null, 2)}\n`);
manifest.codexGameplayQa.sourceJsonSha256 = crypto.createHash("sha256").update(fs.readFileSync(probePath)).digest("hex");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
set +e
missing_npc_role_state_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$MISSING_NPC_ROLE_STATE_KIT_DIR" 2>&1)"
missing_npc_role_state_status=$?
set -e
if (( missing_npc_role_state_status == 0 )); then
  echo "Expected session kit verifier to fail when copied Codex probe loses Station Officer role action state." >&2
  echo "$missing_npc_role_state_output" >&2
  exit 1
fi
if ! grep -Eq "npcRoleActionState|civicLedgerCitationState" <<<"$missing_npc_role_state_output"; then
  echo "Expected missing NPC role-state failure to name npcRoleActionState or civicLedgerCitationState." >&2
  echo "$missing_npc_role_state_output" >&2
  exit 1
fi

MISSING_MARKDOWN_REPORT_KIT_DIR="$TMP_ROOT/session-kit-missing-markdown-report"
cp -R "$SESSION_KIT_DIR" "$MISSING_MARKDOWN_REPORT_KIT_DIR"
node - "$MISSING_MARKDOWN_REPORT_KIT_DIR" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const kitDir = process.argv[2];
const manifestPath = path.join(kitDir, "session-kit-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const markdownPath = path.join(kitDir, manifest.codexGameplayQa.copiedMarkdownFile);
fs.writeFileSync(markdownPath, [
  "# Codex Gameplay QA Report",
  "",
  "This intentionally damaged report keeps the file and hash valid but removes",
  "the action path, player-readable cause chain, role actions, NPC observations,",
  "route outcomes, and product boundary required for AI-play review.",
  "",
].join("\n"));
manifest.codexGameplayQa.sourceMarkdownSha256 = crypto.createHash("sha256").update(fs.readFileSync(markdownPath)).digest("hex");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
set +e
missing_markdown_report_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$MISSING_MARKDOWN_REPORT_KIT_DIR" 2>&1)"
missing_markdown_report_status=$?
set -e
if (( missing_markdown_report_status == 0 )); then
  echo "Expected session kit verifier to fail when copied Codex Markdown report loses readable gameplay content." >&2
  echo "$missing_markdown_report_output" >&2
  exit 1
fi
if ! grep -q "copiedMarkdownReadableReport" <<<"$missing_markdown_report_output"; then
  echo "Expected missing Markdown report failure to name copiedMarkdownReadableReport." >&2
  echo "$missing_markdown_report_output" >&2
  exit 1
fi

MISSING_README_HANDOFF_KIT_DIR="$TMP_ROOT/session-kit-missing-readme-handoff"
cp -R "$SESSION_KIT_DIR" "$MISSING_README_HANDOFF_KIT_DIR"
perl -0pi -e 's/With the tester present, run the observed-session helper:\n\n  \.game-harness\/scripts\/run-same-order-comprehension-session\.sh\n\n//' "$MISSING_README_HANDOFF_KIT_DIR/README.md"
set +e
missing_readme_handoff_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$MISSING_README_HANDOFF_KIT_DIR" 2>&1)"
missing_readme_handoff_status=$?
set -e
if (( missing_readme_handoff_status == 0 )); then
  echo "Expected session kit verifier to fail when README loses the live observed-session handoff." >&2
  echo "$missing_readme_handoff_output" >&2
  exit 1
fi
if ! grep -q "readmeLiveSessionHandoff" <<<"$missing_readme_handoff_output"; then
  echo "Expected missing README handoff failure to name readmeLiveSessionHandoff." >&2
  echo "$missing_readme_handoff_output" >&2
  exit 1
fi

STALE_CODEX_FRESHNESS_KIT_DIR="$TMP_ROOT/session-kit-stale-codex-freshness"
cp -R "$SESSION_KIT_DIR" "$STALE_CODEX_FRESHNESS_KIT_DIR"
node - "$STALE_CODEX_FRESHNESS_KIT_DIR/session-kit-manifest.json" <<'NODE'
const fs = require("fs");
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.codexGameplayQa.sourceFreshness = "not-ready: intentionally stale probe fixture";
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
set +e
stale_codex_freshness_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$STALE_CODEX_FRESHNESS_KIT_DIR" 2>&1)"
stale_codex_freshness_status=$?
set -e
if (( stale_codex_freshness_status == 0 )); then
  echo "Expected session kit verifier to fail when manifest marks Codex probe freshness as stale." >&2
  echo "$stale_codex_freshness_output" >&2
  exit 1
fi
if ! grep -q "codexSourceFreshness" <<<"$stale_codex_freshness_output"; then
  echo "Expected stale Codex probe freshness failure to name codexSourceFreshness." >&2
  echo "$stale_codex_freshness_output" >&2
  exit 1
fi

STALE_CODEX_KIT_COPY_DIR="$TMP_ROOT/session-kit-stale-codex-copy"
cp -R "$SESSION_KIT_DIR" "$STALE_CODEX_KIT_COPY_DIR"
touch -t 202001010000 "$STALE_CODEX_KIT_COPY_DIR/codex-gameplay-probe.json" "$STALE_CODEX_KIT_COPY_DIR/codex-gameplay-report.md"
set +e
stale_codex_kit_copy_output="$("$SCRIPT_DIR/run-same-order-comprehension-session.sh" --verify-session-kit "$STALE_CODEX_KIT_COPY_DIR" 2>&1)"
stale_codex_kit_copy_status=$?
set -e
if (( stale_codex_kit_copy_status == 0 )); then
  echo "Expected session kit verifier to fail when copied Codex QA artifacts are older than current proof-cell files." >&2
  echo "$stale_codex_kit_copy_output" >&2
  exit 1
fi
if ! grep -q "codexKitCurrentSourceFreshness" <<<"$stale_codex_kit_copy_output"; then
  echo "Expected stale copied Codex artifact failure to name codexKitCurrentSourceFreshness." >&2
  echo "$stale_codex_kit_copy_output" >&2
  exit 1
fi

if [[ ! -f "$SESSION_KIT_DIR/recruitment-facilitator-card.md" ]]; then
  echo "Expected session kit to separate recruitment-facilitator-card.md from tester-invite.md." >&2
  exit 1
fi

write_placeholder_note() {
  local path="$1"
  local label="$2"
  cat > "$path" <<EOF
# Same Order Comprehension Session

Date UTC: 20260517T000000Z
Build path: $APP_PATH
Provider state: fallback_only_m1
Packaged live HUD record-chain proof: pass
Packaged outcome chain proof: pass
App binary sha256: $APP_BINARY_SHA256
Packaged route evidence sha256: $ROUTE_EVIDENCE_SHA256

## Tester

- Tester label: $label
- Fresh tester: yes
- Build path: $APP_PATH
- Packaged route evidence path: $ROUTE_EVIDENCE_PATH
- Preflight result: pass
- Provider state: fallback_only_m1
- Packaged live HUD record-chain proof: pass
- Packaged outcome chain proof: pass
- App binary sha256: $APP_BINARY_SHA256
- Packaged route evidence sha256: $ROUTE_EVIDENCE_SHA256
- Tester language comfort: Korean
- Route seen / final state: inquest_opened
- Free first attempt route / final state: clean_cover
- Scripted alternate route / final state: inquest_opened
- Safe path observed: yes
- Risky path observed: yes
- First explanation of goal: pass
- What changed after the player's line: pass
- Record or ledger detail noticed: pass
- Who acted on the record: pass
- Dialogue to record to consequence to role action explanation: pass
- Delayed answer record noticed: yes
- Direct quote examined/evaluated: yes
- Direct quote statement-to-record: observed
- Direct quote delay-to-record: none
- Did tester think they were examining others: no
- Facilitator intervention needed: none
- Verdict: pass
- O1 evaluated by NPC/Station: pass
- O2 connects speech to changed Store record: pass
- O3 notices actor reaction beyond clerk dialogue: pass
- O4 explains safer vs riskier answer: pass
- O5 identifies latest record role/action: pass
- O6 keeps player as examined subject: pass
- O7 connects delayed answer to record: pass
- Direct quotes / notes: pass
EOF
}

for index in 1 2 3; do
  write_placeholder_note "$TMP_ROOT/same-order-comprehension-placeholder-$index.md" "placeholder-$index"
done

set +e
output="$(DREAM_OF_ONE_COMPREHENSION_NOTES_DIR="$TMP_ROOT" "$SCRIPT_DIR/review-same-order-comprehension-notes.sh" --strict 2>&1)"
status=$?
set -e

if (( status == 0 )); then
  echo "Expected placeholder notes to fail strict review, but review passed." >&2
  echo "$output" >&2
  exit 1
fi

if ! grep -q "FAIL_OR_CONDITIONAL" <<<"$output"; then
  echo "Expected strict review to report FAIL_OR_CONDITIONAL for placeholder notes." >&2
  echo "$output" >&2
  exit 1
fi

if ! grep -q "Direct examined and record quotes captured | 0 / 3" <<<"$output"; then
  echo "Expected placeholder direct quotes to be rejected." >&2
  echo "$output" >&2
  exit 1
fi

echo "Comprehension review guard ok: neutral pre-play wording is enforced, tester invites stay no-spoiler, manifest and current Codex freshness, action catalog, typed-input execution, visible-state, role-action bindings, readable Markdown gameplay reports, and README live-session handoff are enforced, placeholder notes fail strict review, and direct quote counts stay 0/3."
