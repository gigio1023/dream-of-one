#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV_PATH="${DREAM_OF_ONE_LOCAL_ENV_PATH:-$REPO_ROOT/build/dream-of-one-local-env.sh}"
if [[ -f "$LOCAL_ENV_PATH" ]]; then
  # Device-local env only. Keep machine paths out of tracked docs/scripts.
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV_PATH"
  set +a
fi

APP_PATH="${DREAM_OF_ONE_APP_PATH:-}"
ROUTE_EVIDENCE_PATH="${DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_PATH:-}"
CODEX_PROBE_PATH_OVERRIDE="${DREAM_OF_ONE_CODEX_GAMEPLAY_PROBE_PATH:-}"
CODEX_PROBE_PATH="${CODEX_PROBE_PATH_OVERRIDE:-$REPO_ROOT/data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json}"
CODEX_PROBE_MARKDOWN_PATH="${CODEX_PROBE_PATH%.*}.md"
GODOT_BIN="${GODOT_BIN:-${GODOT_PATH:-}}"
NOTES_DIR="${DREAM_OF_ONE_COMPREHENSION_NOTES_DIR:-$REPO_ROOT/.game-harness/comprehension/manual-sessions}"
CODEX_PROBE_FRESHNESS_WATCH_FILES=(
  "godot/tools/codex_gameplay_probe.gd"
  "godot/scripts/runtime/playable_session.gd"
  "godot/scripts/ui/social_stealth_hud.gd"
  "godot/scenes/main.tscn"
  "godot/scenes/ui/social_stealth_hud.tscn"
  "godot/data/world_layout.json"
)
SESSION_ID="$(date -u +%Y%m%dT%H%M%SZ)"
NOTES_PATH="$NOTES_DIR/same-order-comprehension-$SESSION_ID.md"
PREFLIGHT_ONLY=0
RUN_CODEX_PROBE=0
PRINT_CODEX_PROBE_STATUS=0
PRINT_INSTRUCTIONS=0
PRINT_STATUS=0
PRINT_DEBRIEF=0
PRINT_WORKSHEET=0
PRINT_RECRUITMENT=0
PRINT_FACILITATOR_PACK=0
FACILITATOR_PACK_OUTPUT_PATH=""
SESSION_KIT_OUTPUT_DIR=""
VERIFY_SESSION_KIT_DIR=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [--preflight] [--codex-probe] [--codex-probe-status] [--instructions] [--debrief] [--status] [--worksheet] [--recruitment] [--facilitator-pack] [--facilitator-pack-output <path>] [--session-kit-output <dir>] [--verify-session-kit <dir>]

Runs a Same Order comprehension session helper.

Options:
  --preflight     Check packaged app and route evidence without launching the app.
  --codex-probe   Run the Godot Codex gameplay probe before printing/launching.
  --codex-probe-status
                 Print the latest Codex gameplay probe status without launching the app.
  --instructions  Check preflight, then print the facilitator card without launching.
  --debrief       Check preflight, then print the after-play question card.
  --status        Check preflight, raw note count, and next action without launching.
  --worksheet     Check preflight, then print a blank raw-note worksheet.
  --recruitment   Check preflight, then print a no-spoiler tester invite.
  --facilitator-pack
                 Check preflight, then print the full facilitator-only run pack.
  --facilitator-pack-output <path>
                 Check preflight, then write the facilitator-only run pack to a file.
  --session-kit-output <dir>
                 Check preflight, then write a facilitator-only session kit directory.
  --verify-session-kit <dir>
                 Verify an existing session kit manifest and facilitator-only files.

Environment:
  DREAM_OF_ONE_APP_PATH
  DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_PATH
  DREAM_OF_ONE_CODEX_GAMEPLAY_PROBE_PATH
  DREAM_OF_ONE_COMPREHENSION_NOTES_DIR
  DREAM_OF_ONE_LOCAL_ENV_PATH
  GODOT_BIN or GODOT_PATH
EOF
}

file_mtime() {
  local path="$1"
  if stat -f '%m' "$path" >/dev/null 2>&1; then
    stat -f '%m' "$path"
  else
    stat -c '%Y' "$path"
  fi
}

display_path() {
  local path="$1"
  if [[ "$path" == "$REPO_ROOT" ]]; then
    printf "."
  elif [[ "$path" == "$REPO_ROOT/"* ]]; then
    printf "%s" "${path#"$REPO_ROOT"/}"
  else
    printf "%s" "$path"
  fi
}

while (( $# > 0 )); do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --preflight)
      PREFLIGHT_ONLY=1
      shift
      ;;
    --codex-probe)
      RUN_CODEX_PROBE=1
      shift
      ;;
    --codex-probe-status)
      PRINT_CODEX_PROBE_STATUS=1
      shift
      ;;
    --instructions)
      PRINT_INSTRUCTIONS=1
      shift
      ;;
    --debrief)
      PRINT_DEBRIEF=1
      shift
      ;;
    --status)
      PRINT_STATUS=1
      shift
      ;;
    --worksheet)
      PRINT_WORKSHEET=1
      shift
      ;;
    --recruitment)
      PRINT_RECRUITMENT=1
      shift
      ;;
    --facilitator-pack)
      PRINT_FACILITATOR_PACK=1
      shift
      ;;
    --facilitator-pack-output)
      if [[ -z "${2:-}" ]]; then
        echo "Missing path after --facilitator-pack-output" >&2
        exit 2
      fi
      PRINT_FACILITATOR_PACK=1
      FACILITATOR_PACK_OUTPUT_PATH="$2"
      shift 2
      ;;
    --session-kit-output)
      if [[ -z "${2:-}" ]]; then
        echo "Missing directory after --session-kit-output" >&2
        exit 2
      fi
      SESSION_KIT_OUTPUT_DIR="$2"
      shift 2
      ;;
    --verify-session-kit)
      if [[ -z "${2:-}" ]]; then
        echo "Missing directory after --verify-session-kit" >&2
        exit 2
      fi
      VERIFY_SESSION_KIT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

run_codex_probe() {
  if [[ ! -x "$GODOT_BIN" ]]; then
    echo "Missing executable Godot binary for Codex gameplay probe: ${GODOT_BIN:-unset}" >&2
    echo "Set GODOT_BIN, or set legacy GODOT_PATH, to the local active Godot binary." >&2
    exit 1
  fi
  echo "Running Codex gameplay QA probe with $GODOT_BIN"
  if [[ -n "$CODEX_PROBE_PATH_OVERRIDE" ]]; then
    (
      cd "$REPO_ROOT"
      DREAM_OF_ONE_CODEX_GAMEPLAY_PROBE_OUTPUT="$CODEX_PROBE_PATH" \
        "$GODOT_BIN" --headless --path godot --script res://tools/codex_gameplay_probe.gd
    )
  else
    (
      cd "$REPO_ROOT"
      "$GODOT_BIN" --headless --path godot --script res://tools/codex_gameplay_probe.gd
    )
  fi
}

codex_probe_sha256() {
  if [[ -f "$CODEX_PROBE_PATH" ]]; then
    shasum -a 256 "$CODEX_PROBE_PATH" | awk '{print $1}'
  else
    printf "missing"
  fi
}

codex_probe_markdown_sha256() {
  if [[ -f "$CODEX_PROBE_MARKDOWN_PATH" ]]; then
    shasum -a 256 "$CODEX_PROBE_MARKDOWN_PATH" | awk '{print $1}'
  else
    printf "missing"
  fi
}

codex_probe_freshness_line_for_paths() {
  local json_path="$1"
  local markdown_path="$2"
  if [[ ! -f "$json_path" ]]; then
    printf "missing-json"
    return 0
  fi
  if [[ ! -f "$markdown_path" ]]; then
    printf "missing-markdown"
    return 0
  fi
  local json_mtime
  local markdown_mtime
  json_mtime="$(file_mtime "$json_path")"
  markdown_mtime="$(file_mtime "$markdown_path")"
  local newest_source_mtime=0
  local newest_source_path=""
  local relative_path
  local full_path
  local source_mtime
  for relative_path in "${CODEX_PROBE_FRESHNESS_WATCH_FILES[@]}"; do
    full_path="$REPO_ROOT/$relative_path"
    if [[ ! -f "$full_path" ]]; then
      printf "not-ready: missing watched source %s" "$relative_path"
      return 0
    fi
    source_mtime="$(file_mtime "$full_path")"
    if (( source_mtime > newest_source_mtime )); then
      newest_source_mtime="$source_mtime"
      newest_source_path="$relative_path"
    fi
  done
  if (( json_mtime >= newest_source_mtime && markdown_mtime >= newest_source_mtime )); then
    printf "pass: probe artifacts newer than %s" "$newest_source_path"
  else
    printf "not-ready: probe artifacts older than %s" "$newest_source_path"
  fi
}

codex_probe_freshness_line() {
  codex_probe_freshness_line_for_paths "$CODEX_PROBE_PATH" "$CODEX_PROBE_MARKDOWN_PATH"
}

codex_probe_status_line() {
  if [[ ! -f "$CODEX_PROBE_PATH" ]]; then
    printf "missing"
    return 0
  fi
  node - "$CODEX_PROBE_PATH" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
try {
  const pack = JSON.parse(fs.readFileSync(path, "utf8"));
  const accepted = Array.isArray(pack.executedSteps)
    ? pack.executedSteps.filter((step) => step && step.accepted === true).length
    : 0;
  const stage = pack.environmentSnapshot?.stage || pack.finalSummary?.stage || "missing";
  const canAct = pack.codexInterface?.canExecutePlayerInput === true;
  const canInspect = pack.codexInterface?.canInspectEnvironment === true;
  const notReplacement = pack.codexInterface?.notAReplacementForExternalPlaytest === true;
  const aiPlayerReportPass = pack.aiPlayerReport?.pass === true;
  const aiPlayerReportBoundary = pack.aiPlayerReport?.notAReplacementForExternalComprehension === true;
  const routeReports = Array.isArray(pack.routeReports) ? pack.routeReports : [];
  const passedRoutes = routeReports.filter((route) => route && route.pass === true).length;
  const failures = Array.isArray(pack.failures) ? pack.failures.length : 0;
  if (pack.ok === true && stage === "inquest" && accepted >= 5 && canAct && canInspect && notReplacement && aiPlayerReportPass && aiPlayerReportBoundary && passedRoutes >= 4 && failures === 0) {
    console.log(`pass: stage=${stage}, acceptedSteps=${accepted}, aiPlayerReport=true, routeReports=${passedRoutes}/${routeReports.length}, humanEvidence=false`);
  } else {
    console.log(`not-ready: ok=${pack.ok}, stage=${stage}, acceptedSteps=${accepted}, aiPlayerReport=${aiPlayerReportPass}, routeReports=${passedRoutes}/${routeReports.length}, failures=${failures}, humanEvidence=false`);
  }
} catch (error) {
  console.log(`unreadable: ${error.message}`);
}
NODE
}

codex_probe_route_summary() {
  if [[ ! -f "$CODEX_PROBE_PATH" ]]; then
    printf "missing"
    return 0
  fi
  node - "$CODEX_PROBE_PATH" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
try {
  const pack = JSON.parse(fs.readFileSync(path, "utf8"));
  const reports = Array.isArray(pack.routeReports) ? pack.routeReports : [];
  if (reports.length === 0) {
    console.log("missing");
    process.exit(0);
  }
  console.log(reports.map((route) => {
    const state = route.finalPlayerVisibleState || {};
    return `${route.routeId}:${route.pass === true ? "pass" : "fail"}:${state.stage || "missing"}/${state.routeOutcome || "missing"}`;
  }).join(", "));
} catch (error) {
  console.log(`unreadable: ${error.message}`);
}
NODE
}

codex_probe_action_catalog_summary() {
  if [[ ! -f "$CODEX_PROBE_PATH" ]]; then
    printf "missing"
    return 0
  fi
  node - "$CODEX_PROBE_PATH" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
try {
  const pack = JSON.parse(fs.readFileSync(path, "utf8"));
  const catalog = Array.isArray(pack.playerActionCatalog) ? pack.playerActionCatalog : [];
  if (catalog.length === 0) {
    console.log("missing");
    process.exit(0);
  }
  console.log(catalog.map((action) => action.actionId || "missing").join(", "));
} catch (error) {
  console.log(`unreadable: ${error.message}`);
}
NODE
}

codex_probe_ai_player_summary() {
  if [[ ! -f "$CODEX_PROBE_PATH" ]]; then
    printf "missing"
    return 0
  fi
  node - "$CODEX_PROBE_PATH" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
try {
  const pack = JSON.parse(fs.readFileSync(path, "utf8"));
  const report = pack.aiPlayerReport || {};
  const actions = Array.isArray(report.acceptedActions) ? report.acceptedActions.length : 0;
  const checks = report.explainabilityChecks || {};
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const stage = report.finalPlayerVisibleState?.stage || pack.finalSummary?.stage || "missing";
  console.log(`stage=${stage}, actions=${actions}, explainability=${passedChecks}/${totalChecks}`);
} catch (error) {
  console.log(`unreadable: ${error.message}`);
}
NODE
}

print_codex_probe_status() {
  echo
  echo "# Codex Gameplay QA Probe Status"
  echo
  echo "- Probe path: $CODEX_PROBE_PATH"
  echo "- Probe sha256: $(codex_probe_sha256)"
  echo "- Markdown report: $CODEX_PROBE_MARKDOWN_PATH"
  echo "- Markdown sha256: $(codex_probe_markdown_sha256)"
  echo "- Status: $(codex_probe_status_line)"
  echo "- Source freshness: $(codex_probe_freshness_line)"
  echo "- AI-player report: $(codex_probe_ai_player_summary)"
  echo "- Action catalog: $(codex_probe_action_catalog_summary)"
  echo "- Route reports: $(codex_probe_route_summary)"
  echo "- Meaning: Codex can run and inspect the active Same Order cell before a human session."
  echo "- Boundary: this is not player comprehension evidence."
}

print_codex_probe_status_summary() {
  echo "- Codex gameplay QA: $(codex_probe_status_line)"
  echo "- Codex source freshness: $(codex_probe_freshness_line)"
  echo "- Codex detail command: .game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe-status"
  echo "- Boundary: setup proof only; this is not player comprehension evidence."
}

if (( RUN_CODEX_PROBE == 1 )); then
  run_codex_probe
fi

if [[ -n "$VERIFY_SESSION_KIT_DIR" ]]; then
  kit_current_source_freshness="$(codex_probe_freshness_line_for_paths "$VERIFY_SESSION_KIT_DIR/codex-gameplay-probe.json" "$VERIFY_SESSION_KIT_DIR/codex-gameplay-report.md")"
  node - "$VERIFY_SESSION_KIT_DIR" "$kit_current_source_freshness" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const kitDir = process.argv[2];
const kitCurrentSourceFreshness = process.argv[3];
const requiredFiles = [
  "README.md",
  "facilitator-pack.md",
  "tester-invite.md",
  "recruitment-facilitator-card.md",
  "facilitator-card.md",
  "after-play-debrief.md",
  "raw-session-worksheet.md",
  "gate-status.txt",
  "codex-gameplay-probe.json",
  "codex-gameplay-report.md",
  "session-kit-manifest.json",
];
const requiredRoutes = ["clean_cover", "repair_recovered", "cover_held_under_suspicion", "soft_report", "inquest_opened"];
const requiredActionIds = [
  "focus.store_counter",
  "conversation.start",
  "player.wait.hesitation_record",
  "dialogue.choice.by_id",
  "dialogue.choice.by_index",
  "player.type.free_input",
  "focus.world_record_prop",
  "player.interact.focused",
];
const facilitatorPrePlayFiles = [
  "facilitator-pack.md",
  "recruitment-facilitator-card.md",
  "facilitator-card.md",
];
const neutralPrePlayLine = "Play this short scene without prior explanation until it stops or until 5 minutes pass.";
const stalePrePlayLine = "Play this short Station intake path";
const testerInviteForbidden = [
  "Station",
  "station",
  "record",
  "report",
  "ledger",
  "receipt",
  "dossier",
  "Station citation",
  "citation",
  "inquest",
  "risk",
  "Evidence",
  "provider",
  "fallback",
  "examined",
  "being examined",
  "기록",
  "보고",
  "원장",
  "영수증",
  "서류철",
  "스테이션",
  "스테이션 인용",
  "검사",
  "조사",
  "심문",
  "위험",
  "증거",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function includesForbiddenTerm(body, term) {
  return body.toLocaleLowerCase("en-US").includes(term.toLocaleLowerCase("en-US"));
}

if (!fs.existsSync(kitDir) || !fs.statSync(kitDir).isDirectory()) {
  fail(`Session kit directory is missing: ${kitDir}`);
}

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(kitDir, file)));
if (missing.length > 0) {
  fail(`Session kit missing required files: ${missing.join(", ")}`);
}

const manifestPath = path.join(kitDir, "session-kit-manifest.json");
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`Unable to read session-kit-manifest.json: ${error.message}`);
}

const checks = [];
checks.push(["schemaVersion", manifest.schemaVersion === "same-order-session-kit-manifest-v1", manifest.schemaVersion]);
checks.push(["testerFacingFiles", JSON.stringify(manifest.testerFacingFiles || []) === JSON.stringify(["tester-invite.md"]), JSON.stringify(manifest.testerFacingFiles || [])]);
checks.push(["providerState", manifest.buildBinding?.providerState === "fallback_only_m1", manifest.buildBinding?.providerState]);
checks.push(["packagedLiveHudRecordChainProof", manifest.buildBinding?.packagedLiveHudRecordChainProof === true, manifest.buildBinding?.packagedLiveHudRecordChainProof]);
checks.push(["packagedOutcomeChainProof", manifest.buildBinding?.packagedOutcomeChainProof === true, manifest.buildBinding?.packagedOutcomeChainProof]);
checks.push(["codexStatus", String(manifest.codexGameplayQa?.status || "").startsWith("pass:"), manifest.codexGameplayQa?.status]);
checks.push(["codexSourceFreshness", String(manifest.codexGameplayQa?.sourceFreshness || "").startsWith("pass:"), manifest.codexGameplayQa?.sourceFreshness]);
checks.push(["codexKitCurrentSourceFreshness", String(kitCurrentSourceFreshness || "").startsWith("pass:"), kitCurrentSourceFreshness]);
checks.push(["codexSetupProofOnly", manifest.codexGameplayQa?.setupProofOnly === true, manifest.codexGameplayQa?.setupProofOnly]);
checks.push(["codexHumanEvidenceFalse", manifest.codexGameplayQa?.humanEvidence === false, manifest.codexGameplayQa?.humanEvidence]);
checks.push(["gatePending", manifest.gate?.externalComprehensionStatus === "PENDING_TESTER_NOTES", manifest.gate?.externalComprehensionStatus]);
checks.push(["requiredFreshTesterNotes", manifest.gate?.requiredFreshTesterNotes === 3, manifest.gate?.requiredFreshTesterNotes]);
checks.push(["closesGoalFalse", manifest.gate?.closesGoal === false, manifest.gate?.closesGoal]);

const routeReports = Array.isArray(manifest.codexGameplayQa?.routeReports) ? manifest.codexGameplayQa.routeReports : [];
for (const routeId of requiredRoutes) {
  const report = routeReports.find((route) => route && route.routeId === routeId);
  checks.push([`route:${routeId}`, report?.pass === true, report ? JSON.stringify(report) : "missing"]);
}

const actionCatalog = Array.isArray(manifest.codexGameplayQa?.actionCatalog) ? manifest.codexGameplayQa.actionCatalog : [];
for (const actionId of requiredActionIds) {
  const action = actionCatalog.find((entry) => entry && entry.actionId === actionId);
  checks.push([`actionCatalog:${actionId}`, Boolean(action), action ? JSON.stringify(action) : "missing"]);
}

const copiedJson = path.join(kitDir, manifest.codexGameplayQa?.copiedJsonFile || "");
const copiedMarkdown = path.join(kitDir, manifest.codexGameplayQa?.copiedMarkdownFile || "");
checks.push(["copiedJsonFile", fs.existsSync(copiedJson), copiedJson]);
checks.push(["copiedMarkdownFile", fs.existsSync(copiedMarkdown), copiedMarkdown]);
if (fs.existsSync(copiedJson)) {
  checks.push(["copiedJsonSha256", sha256(copiedJson) === manifest.codexGameplayQa?.sourceJsonSha256, sha256(copiedJson)]);
  let copiedProbe;
  try {
    copiedProbe = JSON.parse(fs.readFileSync(copiedJson, "utf8"));
  } catch (error) {
    fail(`Unable to read copied Codex gameplay probe JSON: ${error.message}`);
  }
  const copiedRouteReports = Array.isArray(copiedProbe.routeReports) ? copiedProbe.routeReports : [];
  const copiedActionCatalog = Array.isArray(copiedProbe.playerActionCatalog) ? copiedProbe.playerActionCatalog : [];
  const copiedExecutedSteps = Array.isArray(copiedProbe.executedSteps) ? copiedProbe.executedSteps : [];
  const copiedAcceptedActions = Array.isArray(copiedProbe.aiPlayerReport?.acceptedActions) ? copiedProbe.aiPlayerReport.acceptedActions : [];
  const playerVisibleState = copiedProbe.aiPlayerReport?.finalPlayerVisibleState || {};
  const envHud = copiedProbe.environmentSnapshot?.hud || {};
  const recordObjects = copiedProbe.environmentSnapshot?.recordObjects || {};
  const worldRecordProps = copiedProbe.environmentSnapshot?.worldRecordProps || {};
  const agentActionLog = Array.isArray(copiedProbe.finalSummary?.agentActionLog) ? copiedProbe.finalSummary.agentActionLog : [];
  const civicLedger = Array.isArray(copiedProbe.finalSummary?.civicLedger) ? copiedProbe.finalSummary.civicLedger : [];
  const roleActionExplanation = Array.isArray(copiedProbe.aiPlayerReport?.roleActionExplanation) ? copiedProbe.aiPlayerReport.roleActionExplanation : [];
  const socialObservationExplanation = Array.isArray(copiedProbe.aiPlayerReport?.socialObservationExplanation) ? copiedProbe.aiPlayerReport.socialObservationExplanation : [];
  const stationCitationEvent = civicLedger.find((event) => event?.actorRole === "station_officer" && event?.affordance === "cite_record");
  const stationCitationId = stationCitationEvent?.eventId || "";
  const citedStoreLedgerId = stationCitationEvent?.citedLedgerEventId || "";
  checks.push(["copiedProbeSchema", copiedProbe.schemaVersion === "codex-gameplay-probe-v1", copiedProbe.schemaVersion]);
  checks.push(["copiedProbeOk", copiedProbe.ok === true, copiedProbe.ok]);
  checks.push(["copiedProbeAiPlayerReport", copiedProbe.aiPlayerReport?.pass === true && copiedProbe.aiPlayerReport?.notAReplacementForExternalComprehension === true, copiedProbe.aiPlayerReport?.pass]);
  checks.push(["copiedProbeRuntimeActionApi", copiedProbe.codexInterface?.stableRuntimeActionApi === "PlayableSession.debug_codex_gameplay_action", copiedProbe.codexInterface?.stableRuntimeActionApi]);
  checks.push(["copiedProbeRuntimeSnapshotApi", copiedProbe.codexInterface?.stableRuntimeSnapshotApi === "PlayableSession.debug_codex_gameplay_snapshot", copiedProbe.codexInterface?.stableRuntimeSnapshotApi]);
  checks.push([
    "playerVisibleHudState",
    typeof playerVisibleState.recordState === "string" &&
      stationCitationId &&
      playerVisibleState.recordState.includes(stationCitationId) &&
      typeof playerVisibleState.investigationTrail === "string" &&
      playerVisibleState.investigationTrail.includes("대상: 플레이어") &&
      typeof playerVisibleState.civicEconomyPanel === "string" &&
      playerVisibleState.civicEconomyPanel.includes("주목 70"),
    JSON.stringify(playerVisibleState),
  ]);
  checks.push([
    "environmentHudSnapshot",
    typeof envHud.recordStateLabel === "string" &&
      stationCitationId &&
      envHud.recordStateLabel.includes(stationCitationId) &&
      typeof envHud.consequenceLabel === "string" &&
      envHud.consequenceLabel.includes("스테이션 인용") &&
      typeof envHud.outcomeBodyLabel === "string" &&
      envHud.outcomeBodyLabel.includes("스테이션 인용"),
    JSON.stringify(envHud),
  ]);
  checks.push([
    "environmentRecordObjects",
    recordObjects.receipt_tray === "marked" &&
      recordObjects.report_tray === "forwarded" &&
      recordObjects.station_dossier === "cited" &&
      worldRecordProps.civic_ledger?.visible === true &&
      worldRecordProps.civic_ledger?.state === "append_only" &&
      worldRecordProps.station_dossier?.visible === true &&
      worldRecordProps.station_dossier?.state === "cited",
    JSON.stringify({recordObjects, civicLedger: worldRecordProps.civic_ledger, stationDossier: worldRecordProps.station_dossier}),
  ]);
  checks.push([
    "npcRoleActionState",
    citedStoreLedgerId &&
      agentActionLog.some((action) => action?.actorRole === "store_manager" && action?.affordance === "forward_report" && action?.ledgerEventId === citedStoreLedgerId) &&
      agentActionLog.some((action) => action?.actorRole === "station_officer" && action?.affordance === "cite_record" && action?.citedLedgerEventId === citedStoreLedgerId && action?.ledgerEventId === stationCitationId) &&
      roleActionExplanation.some((line) => String(line).includes("station_officer used cite_record")) &&
      socialObservationExplanation.length >= 2,
    JSON.stringify({agentActionLog, roleActionExplanation, socialObservationExplanation}),
  ]);
  checks.push([
    "civicLedgerCitationState",
    Boolean(stationCitationId && citedStoreLedgerId),
    JSON.stringify(civicLedger),
  ]);
  for (const routeId of requiredRoutes) {
    const manifestRoute = routeReports.find((route) => route && route.routeId === routeId);
    const copiedRoute = copiedRouteReports.find((route) => route && route.routeId === routeId);
    checks.push([`copiedRoute:${routeId}`, copiedRoute?.pass === true, copiedRoute ? JSON.stringify(copiedRoute) : "missing"]);
    checks.push([`manifestMatchesCopiedRoute:${routeId}`, manifestRoute?.pass === copiedRoute?.pass && manifestRoute?.stage === copiedRoute?.finalPlayerVisibleState?.stage && manifestRoute?.routeOutcome === copiedRoute?.finalPlayerVisibleState?.routeOutcome, JSON.stringify({manifestRoute, copiedRoute})]);
  }
  for (const actionId of requiredActionIds) {
    const manifestAction = actionCatalog.find((entry) => entry && entry.actionId === actionId);
    const copiedAction = copiedActionCatalog.find((entry) => entry && entry.actionId === actionId);
    checks.push([`copiedActionCatalog:${actionId}`, Boolean(copiedAction), copiedAction ? JSON.stringify(copiedAction) : "missing"]);
    checks.push([`manifestMatchesCopiedAction:${actionId}`, manifestAction?.playerMeaning === copiedAction?.playerMeaning, JSON.stringify({manifestAction, copiedAction})]);
  }
  const manifestTypedAction = actionCatalog.find((entry) => entry && entry.actionId === "player.type.free_input");
  const copiedTypedAction = copiedActionCatalog.find((entry) => entry && entry.actionId === "player.type.free_input");
  const typedFreeInputStep = copiedExecutedSteps.find((step) => (
    step &&
    step.actionId === "player.type.free_input" &&
    step.accepted === true &&
    typeof step.payload?.line === "string" &&
    step.payload.line.trim().length > 0 &&
    step.after?.stage === "inquest" &&
    step.after?.routeOutcome === "inquest_opened"
  ));
  checks.push([
    "typedFreeInputPayloadSchema",
    manifestTypedAction?.payloadSchema?.line === "string" && copiedTypedAction?.payloadSchema?.line === "string",
    JSON.stringify({manifestTypedAction, copiedTypedAction}),
  ]);
  checks.push([
    "copiedProbeTypedFreeInputExecuted",
    Boolean(typedFreeInputStep),
    typedFreeInputStep ? JSON.stringify({
      actionId: typedFreeInputStep.actionId,
      accepted: typedFreeInputStep.accepted,
      line: typedFreeInputStep.payload?.line,
      after: typedFreeInputStep.after,
    }) : "missing accepted typed free-input step",
  ]);
  checks.push([
    "aiPlayerReportTypedFreeInput",
    copiedAcceptedActions.includes("player.type.free_input"),
    JSON.stringify(copiedAcceptedActions),
  ]);
}
if (fs.existsSync(copiedMarkdown)) {
  checks.push(["copiedMarkdownSha256", sha256(copiedMarkdown) === manifest.codexGameplayQa?.sourceMarkdownSha256, sha256(copiedMarkdown)]);
  const markdownBody = fs.readFileSync(copiedMarkdown, "utf8");
  const requiredMarkdownMarkers = [
    "# Codex Gameplay QA Report",
    "## Action Path",
    "focus.store_counter",
    "conversation.start",
    "player.wait.hesitation_record",
    "dialogue.choice.by_id",
    "player.type.free_input",
    "## Player-Readable Cause Chain",
    "civic-ledger-5",
    "civic-ledger-6",
    "## Final Player-Visible State",
    "Stage: `inquest`",
    "Outcome: `inquest_opened`",
    "## Route Outcomes",
    "`clean_cover`",
    "`repair_recovered`",
    "`soft_report`",
    "`inquest_opened`",
    "## Role Actions",
    "station_officer used cite_record",
    "## NPC-To-NPC Observations",
    "station_officer saw store_manager forward_report",
    "## Product Boundary",
    "does not prove fresh-player comprehension",
  ];
  const missingMarkdownMarkers = requiredMarkdownMarkers.filter((marker) => !markdownBody.includes(marker));
  checks.push([
    "copiedMarkdownReadableReport",
    missingMarkdownMarkers.length === 0,
    missingMarkdownMarkers.length > 0 ? `missing: ${missingMarkdownMarkers.join(", ")}` : "ok",
  ]);
}

const testerInvite = fs.readFileSync(path.join(kitDir, "tester-invite.md"), "utf8");
const leakedTerms = testerInviteForbidden.filter((term) => includesForbiddenTerm(testerInvite, term));
checks.push(["testerInviteNoSpoilers", leakedTerms.length === 0, leakedTerms.join(", ")]);
const readmeBody = fs.readFileSync(path.join(kitDir, "README.md"), "utf8");
const requiredReadmeMarkers = [
  "## Required Follow-Up",
  ".game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <this-session-kit-dir>",
  "With the tester present, run the observed-session helper:",
  ".game-harness/scripts/run-same-order-comprehension-session.sh",
  "Say only the neutral pre-play line printed in facilitator-card.md before first",
  "Do not send this README, the manifest, Codex QA artifacts, route reports,",
  "or facilitator notes to the tester before first play.",
  "The active goal remains open until three fresh tester notes reach",
];
const missingReadmeMarkers = requiredReadmeMarkers.filter((marker) => !readmeBody.includes(marker));
checks.push([
  "readmeLiveSessionHandoff",
  missingReadmeMarkers.length === 0,
  missingReadmeMarkers.length > 0 ? `missing: ${missingReadmeMarkers.join(", ")}` : "ok",
]);
for (const file of facilitatorPrePlayFiles) {
  const body = fs.readFileSync(path.join(kitDir, file), "utf8");
  checks.push([`neutralPrePlayLine:${file}`, body.includes(neutralPrePlayLine), "missing neutral pre-play line"]);
  checks.push([`stalePrePlayLineAbsent:${file}`, !body.includes(stalePrePlayLine), "contains stale Station intake wording"]);
}

const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error(`Session kit is not ready: ${kitDir}`);
  for (const [label,, value] of failed) {
    console.error(`- ${label}: ${value ?? "missing"}`);
  }
  process.exit(1);
}

console.log(`Session kit ready: ${kitDir}`);
console.log(`- tester-facing files: ${(manifest.testerFacingFiles || []).join(", ")}`);
console.log(`- Codex QA status: ${manifest.codexGameplayQa.status}`);
console.log(`- Codex source freshness: ${manifest.codexGameplayQa.sourceFreshness}`);
console.log(`- Codex kit current source freshness: ${kitCurrentSourceFreshness}`);
console.log(`- action catalog: ${actionCatalog.map((action) => action.actionId).join(", ")}`);
console.log(`- route reports: ${routeReports.map((route) => `${route.routeId}:${route.pass ? "pass" : "fail"}`).join(", ")}`);
console.log("- copied Codex probe cross-check: pass");
console.log("- README live-session handoff: pass");
console.log(`- humanEvidence: ${manifest.codexGameplayQa.humanEvidence}`);
console.log(`- closesGoal: ${manifest.gate.closesGoal}`);
NODE
  exit 0
fi

if [[ -z "$APP_PATH" ]]; then
  echo "DREAM_OF_ONE_APP_PATH is not set." >&2
  echo "Set it to the local packaged .app path or executable launcher for this device." >&2
  exit 1
fi

APP_LAUNCH_MODE=""
if [[ -d "$APP_PATH" ]]; then
  APP_BINARY="$APP_PATH/Contents/MacOS/Dream of One Godot Shell"
  APP_LAUNCH_MODE="macos_app"
elif [[ -f "$APP_PATH" ]]; then
  APP_BINARY="$APP_PATH"
  APP_LAUNCH_MODE="executable"
else
  echo "Missing packaged app or executable launcher: $APP_PATH" >&2
  echo "Set DREAM_OF_ONE_APP_PATH to a valid .app path or executable launcher for this device." >&2
  exit 1
fi

if [[ ! -x "$APP_BINARY" ]]; then
  echo "Missing packaged app executable: $APP_BINARY" >&2
  exit 1
fi

human_play_display_status_line() {
  if [[ "$APP_LAUNCH_MODE" == "macos_app" ]]; then
    printf "ready: macOS app bundle launch uses open -W"
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]]; then
    printf "ready: local macOS executable launch"
    return 0
  fi
  if [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]; then
    printf "ready: display environment is present"
    return 0
  fi
  printf "not-ready: no DISPLAY or WAYLAND_DISPLAY; use a desktop session, VNC, X11 forwarding, or another tester device before launching"
}

require_human_play_display() {
  local display_status
  display_status="$(human_play_display_status_line)"
  if [[ "$display_status" == not-ready:* ]]; then
    echo "Cannot launch an observed fresh-player session from this shell: $display_status" >&2
    exit 1
  fi
}

if [[ -z "$ROUTE_EVIDENCE_PATH" ]]; then
  echo "DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_PATH is not set." >&2
  echo "Set it to the local packaged route evidence JSON for this device." >&2
  exit 1
fi

if [[ ! -f "$ROUTE_EVIDENCE_PATH" ]]; then
  echo "Missing packaged route evidence: $ROUTE_EVIDENCE_PATH" >&2
  echo "Set DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_PATH or rerun packaged route smoke on this device." >&2
  exit 1
fi

PREFLIGHT_STDOUT="/dev/stdout"
PREFLIGHT_LOG_PATH=""
if (( PRINT_RECRUITMENT == 1 || PRINT_STATUS == 1 )); then
  PREFLIGHT_LOG_PATH="$(mktemp)"
  PREFLIGHT_STDOUT="$PREFLIGHT_LOG_PATH"
elif (( PREFLIGHT_ONLY == 0 &&
        PRINT_CODEX_PROBE_STATUS == 0 &&
        PRINT_INSTRUCTIONS == 0 &&
        PRINT_DEBRIEF == 0 &&
        PRINT_WORKSHEET == 0 &&
        PRINT_FACILITATOR_PACK == 0 )); then
  PREFLIGHT_LOG_PATH="$(mktemp)"
  PREFLIGHT_STDOUT="$PREFLIGHT_LOG_PATH"
fi

node - "$ROUTE_EVIDENCE_PATH" "$APP_BINARY" > "$PREFLIGHT_STDOUT" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
const appBinaryPath = process.argv[3];
const pack = JSON.parse(fs.readFileSync(path, "utf8"));
const evidenceMtime = fs.statSync(path).mtimeMs;
const appMtime = fs.statSync(appBinaryPath).mtimeMs;
if (evidenceMtime + 1000 < appMtime) {
  console.error(`Packaged route evidence is older than the packaged app binary: ${path}`);
  console.error(`- evidence mtime: ${new Date(evidenceMtime).toISOString()}`);
  console.error(`- app binary mtime: ${new Date(appMtime).toISOString()}`);
  process.exit(1);
}
const summary = pack.playableSummary || {};
const providerMode = summary.providerState?.mode || pack.playability?.providerState?.mode;
const events = summary.events || pack.events || [];
const ledger = summary.civicLedger || pack.playability?.civicLedger || [];
const latestLedger = ledger[ledger.length - 1] || {};
const latestLedgerId = latestLedger.id || latestLedger.eventId;
function ledgerEventCites(kind, eventId, citedLedgerEventId) {
  return ledger.some((event) =>
    event?.kind === kind &&
    (event.id || event.eventId) === eventId &&
    event.citedLedgerEventId === citedLedgerEventId
  );
}
const packagedProof = pack.playability?.packagedRouteSmokeProof || {};
const hudChecks = packagedProof.hudChecks || {};
const outcomeChecks = packagedProof.outcomeChecks || {};
const civicEconomyChecks = packagedProof.civicEconomyChecks || {};
const civicEconomyPanel = packagedProof.civicEconomyPanel || {};
const hudTrail = packagedProof.hudTrail || "";
const outcomeBody = packagedProof.outcomeBody || "";
const consequenceLabel = packagedProof.consequenceLabel || "";
const civicEconomyPanelLabel = civicEconomyPanel.label || summary.worldRecordProps?.civic_economy_panel?.label || "";
const civicEconomyPanelState = civicEconomyPanel.state || summary.worldRecordProps?.civic_economy_panel?.state || "";
const hasTypedFreeInput = events.some((event) => event.inputMode === "typed_free_input");
const hasResponseHesitation = events.some((event) => event.eventName === "response_hesitation_noted");
const checks = [
  ["stage", summary.stage === "inquest", summary.stage],
  ["sessionOutcome", summary.sessionOutcome === "inquest_opened", summary.sessionOutcome],
  ["providerState.mode", providerMode === "fallback_only_m1", providerMode],
  ["typed_free_input event", hasTypedFreeInput, hasTypedFreeInput],
  ["response_hesitation_noted event", hasResponseHesitation, hasResponseHesitation],
  ["Station citation cites forwarded Store record", ledgerEventCites("station_record_cited", "civic-ledger-6", "civic-ledger-5"), latestLedger.kind],
  ["latest ledger is contact refusal after Station citation", latestLedger.kind === "queue_contact_refused" && latestLedgerId === "civic-ledger-8" && latestLedger.citedLedgerEventId === "civic-ledger-6", `${latestLedgerId} ${latestLedger.kind} -> ${latestLedger.citedLedgerEventId}`],
  ["packaged route smoke proof", packagedProof.pass === true, packagedProof.pass],
  ["HUD examiner wording", hudChecks.examinerWording === true && String(hudTrail).includes("검사자"), hudTrail],
  ["HUD player examined subject", hudChecks.playerAsExaminedSubject === true && String(hudTrail).includes("대상: 플레이어"), hudTrail],
  ["HUD Station Officer examiner", hudChecks.stationOfficerExaminer === true && String(hudTrail).includes("스테이션 직원"), hudTrail],
  ["live HUD record chain", outcomeChecks.liveRecordChain === true && String(consequenceLabel).includes("플레이어 발화/응답 지연 -> 상점 기록") && String(consequenceLabel).includes("스테이션 인용"), consequenceLabel],
  ["outcome consequence chain", outcomeChecks.speechDelayRecordChain === true && String(outcomeBody).includes("플레이어 발화/응답 지연 -> 상점 기록") && String(outcomeBody).includes("스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부 -> 심문"), outcomeBody],
  ["outcome Station role action", outcomeChecks.stationOfficerRoleAction === true && String(outcomeBody).includes("역할 행동: 스테이션 직원"), outcomeBody],
  ["civic economy panel attention state", civicEconomyChecks.attentionState === true && civicEconomyPanelState === "attention", civicEconomyPanelState],
  ["civic economy account credit", civicEconomyChecks.accountCreditVisible === true && String(civicEconomyPanelLabel).includes(String(summary.civicEconomy?.accountCredit)), civicEconomyPanelLabel],
  ["civic economy local trust", civicEconomyChecks.localTrustVisible === true && String(civicEconomyPanelLabel).includes(String(summary.civicEconomy?.localTrust)), civicEconomyPanelLabel],
  ["civic economy record burden", civicEconomyChecks.recordBurdenVisible === true && String(civicEconomyPanelLabel).includes(String(summary.civicEconomy?.recordBurden)), civicEconomyPanelLabel],
  ["civic economy Station attention", civicEconomyChecks.stationAttentionVisible === true && String(civicEconomyPanelLabel).includes(String(summary.civicEconomy?.stationAttention)), civicEconomyPanelLabel],
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error(`Packaged route evidence is not tester-ready: ${path}`);
  for (const [label,, value] of failed) {
    console.error(`- ${label}: ${value ?? "missing"}`);
  }
  process.exit(1);
}
console.log(`Preflight ok: packaged app evidence is tester-ready (${path})`);
console.log(`- stage: ${summary.stage}`);
console.log(`- sessionOutcome: ${summary.sessionOutcome}`);
console.log(`- providerState.mode: ${providerMode}`);
console.log(`- typed_free_input event: yes`);
console.log(`- response_hesitation_noted event: yes`);
console.log(`- Station citation: civic-ledger-6 cites civic-ledger-5`);
console.log(`- latest ledger: ${latestLedgerId} ${latestLedger.kind} cites ${latestLedger.citedLedgerEventId}`);
console.log(`- packaged HUD examiner/subject proof: yes`);
console.log(`- packaged live HUD record-chain proof: yes`);
console.log(`- packaged outcome chain proof: yes`);
console.log(`- packaged civic economy proof: yes (${String(civicEconomyPanelLabel).replace(/\n/g, " / ")})`);
console.log(`- evidence mtime >= app binary mtime: yes`);
NODE
if [[ -n "$PREFLIGHT_LOG_PATH" ]]; then
  rm -f "$PREFLIGHT_LOG_PATH"
fi

if (( PRINT_CODEX_PROBE_STATUS == 1 )); then
  print_codex_probe_status
  exit 0
fi

if (( PREFLIGHT_ONLY == 1 )); then
  echo "Preflight only; app was not launched."
  exit 0
fi

if (( PRINT_STATUS == 1 )); then
  shopt -s nullglob
  note_files=("$NOTES_DIR"/same-order-comprehension-*.md)
  shopt -u nullglob
  note_count="${#note_files[@]}"
  review_output="$("$SCRIPT_DIR/review-same-order-comprehension-notes.sh")"
  review_status="$(printf "%s\n" "$review_output" | awk -F'`' '/^Status:/ { print $2; exit }')"
  if [[ -z "$review_status" ]]; then
    review_status="unknown"
  fi
  review_count() {
    local label="$1"
    printf "%s\n" "$review_output" | awk -F'|' -v label="$label" '
      $2 ~ label {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3);
        print $3;
        exit;
      }
    '
  }
  build_bound_count="$(review_count "Sessions bound to build and preflight evidence")"
  live_chain_count="$(review_count "Sessions with packaged live HUD record-chain proof")"
  complete_note_count="$(review_count "Complete note structure")"
  chain_count="$(review_count "Dialogue-record-consequence-role chain captured")"
  civic_economy_count="$(review_count "Civic economy detail captured")"
  quote_count="$(review_count "Direct examined and record quotes captured")"
  subject_count="$(review_count "O6 player is examined subject")"
  no_role_inversion_count="$(review_count "No role inversion")"
  remaining=$((3 - note_count))
  if (( remaining < 0 )); then
    remaining=0
  fi
  echo
  echo "# Same Order Comprehension Gate Status"
  echo
  if (( note_count < 3 )); then
    echo "Next action: run an observed fresh-player session now."
    echo
  fi
  echo "- Raw notes directory: $(display_path "$NOTES_DIR")"
  echo "- Raw note quality guide: $(display_path "$NOTES_DIR/README.md")"
  echo "- Raw session note files: $note_count / 3 minimum"
  echo "- Strict review status: $review_status"
  echo "- Minimum additional raw files needed before strict review can pass: $remaining"
  echo "- Product gate: external comprehension remains open until strict review reaches PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW and human quote review copies accepted findings into the ledger."
  echo
  echo "# Setup Readiness"
  echo
  echo "- Packaged app preflight: pass; current app/evidence is tester-ready."
  echo "- Human play display: $(human_play_display_status_line)"
  print_codex_probe_status_summary
  if (( note_count > 0 )); then
    echo
    echo "# Note Review Detail"
    echo
    echo "- Build-bound notes: ${build_bound_count:-unknown}"
    echo "- Packaged live HUD record-chain proof: ${live_chain_count:-unknown}"
    echo "- Complete note structures: ${complete_note_count:-unknown}"
    echo "- Dialogue -> record -> consequence -> role-action explanations: ${chain_count:-unknown}"
    echo "- Civic economy explanations: ${civic_economy_count:-unknown}"
    echo "- Direct examined/record quote pairs: ${quote_count:-unknown}"
    echo "- Player kept as examined subject: ${subject_count:-unknown}"
    echo "- No role inversion: ${no_role_inversion_count:-unknown}"
    echo
    echo "Current review:"
    printf "%s\n" "$review_output"
  else
    echo
    echo "Current review: $review_status with no raw session notes yet; run the live helper."
  fi
  echo
  if (( note_count < 3 )); then
    cat <<'EOF'
Do not add more internal checks unless the packaged app, no-spoiler invite, or
live helper fails.

Minimal path when a fresh tester is present:
  .game-harness/scripts/run-same-order-comprehension-session.sh

Optional setup when recruiting or handing off to a facilitator:
  .game-harness/scripts/run-same-order-comprehension-session.sh --recruitment
  .game-harness/scripts/run-same-order-comprehension-session.sh --session-kit-output build/session-kits/same-order
  .game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit build/session-kits/same-order

Only raw notes from observed fresh-player play can move this gate.
EOF
  elif [[ "$review_status" != "PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW" ]]; then
    echo "Next action: fix weak raw notes with real tester quotes or collect additional fresh sessions; file count alone is not enough."
  else
    echo "Next action: run .game-harness/scripts/review-same-order-comprehension-notes.sh --strict and then human-review the direct quotes."
  fi
  exit 0
fi

if (( PRINT_INSTRUCTIONS == 1 )); then
  cat <<EOF

# Same Order Fresh-Tester Facilitator Card

Build:
- App: $APP_PATH
- Packaged route evidence: $ROUTE_EVIDENCE_PATH
- Codex gameplay QA probe: $CODEX_PROBE_PATH
- Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
- Notes directory: $NOTES_DIR
- Raw note quality guide: $NOTES_DIR/README.md

Say only this before the first attempt:
Play this short scene without prior explanation until it stops or until 5 minutes pass.

Do not explain before the first explanation:
- records
- risk or report pressure
- Station citation
- provider/fallback behavior
- that the intended role is "being examined"

Run one session:

  .game-harness/scripts/run-same-order-comprehension-session.sh

After play, before explaining the design:

  .game-harness/scripts/run-same-order-comprehension-session.sh --debrief

After at least three fresh sessions:

  .game-harness/scripts/review-same-order-comprehension-notes.sh
  .game-harness/scripts/review-same-order-comprehension-notes.sh --strict
  .game-harness/scripts/review-same-order-comprehension-notes.sh --ledger-draft .game-harness/comprehension/same-order-external-comprehension-ledger-draft.md

Pass still requires human quote review. Helper output alone does not close the gate.
EOF
  exit 0
fi

print_facilitator_pack() {
  app_binary_sha256="$(shasum -a 256 "$APP_BINARY" | awk '{print $1}')"
  route_evidence_sha256="$(shasum -a 256 "$ROUTE_EVIDENCE_PATH" | awk '{print $1}')"
  codex_probe_sha256="$(codex_probe_sha256)"
  codex_probe_markdown_sha256="$(codex_probe_markdown_sha256)"
  codex_probe_status="$(codex_probe_status_line)"
  codex_probe_freshness="$(codex_probe_freshness_line)"
  codex_probe_route_summary="$(codex_probe_route_summary)"
  codex_probe_action_catalog_summary="$(codex_probe_action_catalog_summary)"
  cat <<EOF

# Same Order Facilitator Run Pack

This is facilitator-only setup material. Do not send this whole pack to the
tester because it contains debrief prompts and scoring reminders.

## Current Build Binding

- App: $APP_PATH
- Packaged route evidence: $ROUTE_EVIDENCE_PATH
- Notes directory: $NOTES_DIR
- Raw note quality guide: $NOTES_DIR/README.md
- Provider state: fallback_only_m1
- Packaged live HUD record-chain proof: pass
- Packaged outcome chain proof: pass
- App binary sha256: $app_binary_sha256
- Packaged route evidence sha256: $route_evidence_sha256
- Codex gameplay QA probe: $CODEX_PROBE_PATH
- Codex gameplay QA probe sha256: $codex_probe_sha256
- Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
- Codex gameplay QA Markdown sha256: $codex_probe_markdown_sha256
- Codex gameplay QA probe status: $codex_probe_status
- Codex gameplay QA source freshness: $codex_probe_freshness
- Codex gameplay QA action catalog: $codex_probe_action_catalog_summary
- Codex gameplay QA route reports: $codex_probe_route_summary

Codex QA boundary: the probe proves Codex can execute bounded player inputs and
inspect the Store/Station social chain. It is not player comprehension
evidence.

## Tester Invite

I need 5 minutes of first-impression feedback on a short playable game scene.
Please play without prior explanation until it stops or until 5 minutes pass.
Afterward I will ask what you thought was happening and what changed during the
scene. There are no right answers; I need your own wording.

Do not send the tester route cards, screenshots, design notes, or this full
facilitator pack.

## Before Play

1. Confirm the tester has not seen the Same Order proof, route cards,
   screenshots, or design explanation.
2. Run:

   .game-harness/scripts/run-same-order-comprehension-session.sh --preflight
   .game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe
   .game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe-status

3. Confirm the Codex status prints the action catalog and route reports.

4. Say only:

   Play this short scene without prior explanation until it stops or until 5 minutes pass.

5. Do not explain records, reports, risk, Station citation, provider mode, or
   the intended player role before the first explanation.

## Run The Session

Preferred:

  .game-harness/scripts/run-same-order-comprehension-session.sh

Remote or paper notes:

  .game-harness/scripts/run-same-order-comprehension-session.sh --worksheet

Suggested raw note save path:

  $NOTES_DIR/same-order-comprehension-<UTC_TIMESTAMP>.md

## After Play, Before Explaining Design

Ask:

1. What did you think was happening to you in this scene?
2. What changed after your spoken or typed line?
3. Which record, ledger, receipt, report, or dossier detail did you notice?
4. If you noticed the economy panel, what did credit, trust, burden, or attention seem to mean?
5. Who made, changed, forwarded, or cited the latest record?
6. Explain the chain in your own words: dialogue -> record -> consequence -> role action.
7. Did a delayed answer or hesitation become a record?
8. Did you think you were investigating other people, or being examined by NPCs/Station systems?

Capture direct quotes:

- Quote where the tester describes being examined/evaluated:
- Quote where the tester connects a statement to a record or consequence:
- Quote where the tester connects delay/hesitation to a record:

## After Three Fresh Sessions

Run:

  .game-harness/scripts/review-same-order-comprehension-notes.sh
  .game-harness/scripts/review-same-order-comprehension-notes.sh --strict
  .game-harness/scripts/review-same-order-comprehension-notes.sh --ledger-draft .game-harness/comprehension/same-order-external-comprehension-ledger-draft.md

Pass still requires human quote review. This pack, preflight, screenshots,
packets, and proxy reports do not count as player comprehension.
EOF
}

print_tester_invite() {
  cat <<EOF

# Same Order Fresh-Tester Invite

I need 5 minutes of first-impression feedback on a short playable game scene.
Please play without prior explanation until it stops or until 5 minutes pass.
Afterward I will ask what you thought was happening and what changed during the
scene. There are no right answers; I need your own wording.
EOF
}

verify_tester_invite_text() {
  local invite_text="$1"
  local hits_path
  hits_path="$(mktemp)"
  if printf "%s\n" "$invite_text" | rg -i -n "Station|record|report|ledger|receipt|dossier|citation|inquest|risk|Evidence|provider|fallback|examined|being examined|기록|보고|원장|영수증|서류철|스테이션|검사|조사|심문|위험|증거" > "$hits_path"; then
    echo "Tester-facing invite leaked spoiler terms:" >&2
    cat "$hits_path" >&2
    rm -f "$hits_path"
    exit 1
  fi
  rm -f "$hits_path"
}

print_verified_tester_invite() {
  local invite_text
  invite_text="$(print_tester_invite)"
  verify_tester_invite_text "$invite_text"
  printf "%s\n" "$invite_text"
}

print_recruitment_facilitator_card() {
  cat <<EOF

# Same Order Recruitment Facilitator Card

This is facilitator-only setup material. Do not send this whole card to the
tester.

## Tester-Safe Invite

$(print_tester_invite)

Do not send the tester:

- route cards;
- the debrief questions;
- design notes about records, reports, risk, Station citation, provider mode, or the intended player role;
- screenshots or explanations that reveal what the scene is supposed to prove.

Facilitator setup:

- App: $APP_PATH
- Codex gameplay QA probe: $CODEX_PROBE_PATH
- Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
- Notes directory: $NOTES_DIR

Before play:

1. Confirm the tester has not seen the Same Order proof, route cards, screenshots, or design explanation.
2. Say only: Play this short scene without prior explanation until it stops or until 5 minutes pass.
3. Do not explain what the scene is testing.

After play:

1. Run: .game-harness/scripts/run-same-order-comprehension-session.sh --debrief
2. Record direct quotes before explaining the design.
3. Save notes through the interactive helper or the --worksheet output.

This invite is setup material only. It does not count as player comprehension.
EOF
}

if [[ -n "$SESSION_KIT_OUTPUT_DIR" ]]; then
  helper_path="$SCRIPT_DIR/run-same-order-comprehension-session.sh"
  mkdir -p "$SESSION_KIT_OUTPUT_DIR"
  "$helper_path" --facilitator-pack > "$SESSION_KIT_OUTPUT_DIR/facilitator-pack.md"
  print_verified_tester_invite > "$SESSION_KIT_OUTPUT_DIR/tester-invite.md"
  print_recruitment_facilitator_card > "$SESSION_KIT_OUTPUT_DIR/recruitment-facilitator-card.md"
  "$helper_path" --instructions > "$SESSION_KIT_OUTPUT_DIR/facilitator-card.md"
  "$helper_path" --debrief > "$SESSION_KIT_OUTPUT_DIR/after-play-debrief.md"
  "$helper_path" --worksheet > "$SESSION_KIT_OUTPUT_DIR/raw-session-worksheet.md"
  "$helper_path" --status > "$SESSION_KIT_OUTPUT_DIR/gate-status.txt"
  app_binary_sha256="$(shasum -a 256 "$APP_BINARY" | awk '{print $1}')"
  route_evidence_sha256="$(shasum -a 256 "$ROUTE_EVIDENCE_PATH" | awk '{print $1}')"
  codex_probe_sha256="$(codex_probe_sha256)"
  codex_probe_markdown_sha256="$(codex_probe_markdown_sha256)"
  codex_probe_status="$(codex_probe_status_line)"
  codex_probe_freshness="$(codex_probe_freshness_line)"
  codex_probe_route_summary="$(codex_probe_route_summary)"
  codex_probe_action_catalog_summary="$(codex_probe_action_catalog_summary)"
  if [[ "$codex_probe_status" != pass:* ]]; then
    echo "Codex gameplay QA probe is not ready for a session kit: $codex_probe_status" >&2
    echo "Run: .game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe" >&2
    exit 1
  fi
  if [[ "$codex_probe_freshness" != pass:* ]]; then
    echo "Codex gameplay QA probe is stale for a session kit: $codex_probe_freshness" >&2
    echo "Run: .game-harness/scripts/run-same-order-comprehension-session.sh --codex-probe" >&2
    exit 1
  fi
  if [[ ! -f "$CODEX_PROBE_PATH" || ! -f "$CODEX_PROBE_MARKDOWN_PATH" ]]; then
    echo "Missing Codex gameplay QA artifacts for session kit." >&2
    echo "- JSON: $CODEX_PROBE_PATH" >&2
    echo "- Markdown: $CODEX_PROBE_MARKDOWN_PATH" >&2
    exit 1
  fi
  cp "$CODEX_PROBE_PATH" "$SESSION_KIT_OUTPUT_DIR/codex-gameplay-probe.json"
  cp "$CODEX_PROBE_MARKDOWN_PATH" "$SESSION_KIT_OUTPUT_DIR/codex-gameplay-report.md"
  node - "$SESSION_KIT_OUTPUT_DIR/session-kit-manifest.json" "$SESSION_ID" "$APP_PATH" "$ROUTE_EVIDENCE_PATH" "$NOTES_DIR" "$app_binary_sha256" "$route_evidence_sha256" "$CODEX_PROBE_PATH" "$codex_probe_sha256" "$CODEX_PROBE_MARKDOWN_PATH" "$codex_probe_markdown_sha256" "$codex_probe_status" "$codex_probe_freshness" "$codex_probe_route_summary" "$codex_probe_action_catalog_summary" <<'NODE'
const fs = require("fs");
const [
  outputPath,
  generatedUtc,
  appPath,
  routeEvidencePath,
  notesDir,
  appBinarySha256,
  routeEvidenceSha256,
  codexProbePath,
  codexProbeSha256,
  codexProbeMarkdownPath,
  codexProbeMarkdownSha256,
  codexProbeStatus,
  codexProbeFreshness,
  codexProbeRouteSummary,
  codexProbeActionCatalogSummary,
] = process.argv.slice(2);

let codexRouteReports = [];
let codexActionCatalog = [];
try {
  const probe = JSON.parse(fs.readFileSync(codexProbePath, "utf8"));
  codexRouteReports = Array.isArray(probe.routeReports)
    ? probe.routeReports.map((route) => ({
      routeId: route.routeId || "",
      pass: route.pass === true,
      stage: route.finalPlayerVisibleState?.stage || "",
      routeOutcome: route.finalPlayerVisibleState?.routeOutcome || "",
      sessionOutcome: route.finalPlayerVisibleState?.sessionOutcome || "",
    }))
    : [];
  codexActionCatalog = Array.isArray(probe.playerActionCatalog)
    ? probe.playerActionCatalog.map((action) => ({
      actionId: action.actionId || "",
      playerMeaning: action.playerMeaning || "",
      payloadSchema: action.payloadSchema || {},
    }))
    : [];
} catch {
  codexRouteReports = [];
  codexActionCatalog = [];
}

const manifest = {
  schemaVersion: "same-order-session-kit-manifest-v1",
  generatedUtc,
  purpose: "Facilitator-only binding for a Same Order fresh-player comprehension session kit.",
  testerFacingFiles: ["tester-invite.md"],
  facilitatorOnlyFiles: [
    "facilitator-pack.md",
    "recruitment-facilitator-card.md",
    "facilitator-card.md",
    "after-play-debrief.md",
    "raw-session-worksheet.md",
    "gate-status.txt",
    "README.md",
    "codex-gameplay-probe.json",
    "codex-gameplay-report.md",
    "session-kit-manifest.json",
  ],
  buildBinding: {
    appPath,
    routeEvidencePath,
    notesDir,
    appBinarySha256,
    routeEvidenceSha256,
    providerState: "fallback_only_m1",
    packagedLiveHudRecordChainProof: true,
    packagedOutcomeChainProof: true,
  },
  codexGameplayQa: {
    sourceJsonPath: codexProbePath,
    sourceJsonSha256: codexProbeSha256,
    copiedJsonFile: "codex-gameplay-probe.json",
    sourceMarkdownPath: codexProbeMarkdownPath,
    sourceMarkdownSha256: codexProbeMarkdownSha256,
    copiedMarkdownFile: "codex-gameplay-report.md",
    status: codexProbeStatus,
    sourceFreshness: codexProbeFreshness,
    actionCatalogSummary: codexProbeActionCatalogSummary,
    actionCatalog: codexActionCatalog,
    routeSummary: codexProbeRouteSummary,
    routeReports: codexRouteReports,
    setupProofOnly: true,
    humanEvidence: false,
  },
  gate: {
    externalComprehensionStatus: "PENDING_TESTER_NOTES",
    requiredFreshTesterNotes: 3,
    closesGoal: false,
  },
  warnings: [
    "Do not send facilitator-only files to a fresh tester before first play.",
    "Codex gameplay QA proves AI-play setup only; it is not player comprehension evidence.",
    "The active goal remains open until strict review accepts fresh tester notes.",
  ],
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
  cat > "$SESSION_KIT_OUTPUT_DIR/README.md" <<EOF
# Same Order Session Kit

Generated UTC: $SESSION_ID

This directory is facilitator-only setup material. It is not player
comprehension evidence and must not be counted as a raw tester session.

## Files

- facilitator-pack.md: full facilitator-only run order and scoring reminder.
- tester-invite.md: the only tester-facing no-spoiler text in this kit.
- recruitment-facilitator-card.md: facilitator-only recruitment setup companion.
- facilitator-card.md: short facilitator card for the live session.
- after-play-debrief.md: questions to ask only after play.
- raw-session-worksheet.md: blank worksheet for observed notes.
- gate-status.txt: current gate status before the session.
- codex-gameplay-probe.json: facilitator-only snapshot of the current Codex
  gameplay QA artifact.
- codex-gameplay-report.md: facilitator-only readable Codex gameplay QA report.
- session-kit-manifest.json: machine-readable build, route, and Codex QA
  binding for AI-assisted setup checks.
- session-kit-self-check.txt: generated self-check output proving this kit
  passed the session kit verifier at creation time.

## Build Binding

- App: $APP_PATH
- Packaged route evidence: $ROUTE_EVIDENCE_PATH
- Notes directory: $NOTES_DIR
- Provider state: fallback_only_m1
- Packaged live HUD record-chain proof: pass
- App binary sha256: $app_binary_sha256
- Packaged route evidence sha256: $route_evidence_sha256
- Codex gameplay QA probe: $CODEX_PROBE_PATH
- Codex gameplay QA probe sha256: $codex_probe_sha256
- Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
- Codex gameplay QA Markdown sha256: $codex_probe_markdown_sha256
- Codex gameplay QA probe status: $codex_probe_status
- Codex gameplay QA action catalog: $codex_probe_action_catalog_summary
- Codex gameplay QA route reports: $codex_probe_route_summary

The Codex gameplay QA probe is setup proof only. It does not count as a raw
tester session or player comprehension evidence.

The copied Codex QA files in this kit are facilitator-only. Do not send them to
fresh testers before first play.

session-kit-manifest.json is also facilitator-only setup material. It exists
so Codex or another AI coding tool can inspect the exact app, route evidence,
Codex QA artifacts, and remaining external gate without reading every note.

## Required Follow-Up

Before the tester arrives, verify this kit if it was moved or edited:

  .game-harness/scripts/run-same-order-comprehension-session.sh --verify-session-kit <this-session-kit-dir>

With the tester present, run the observed-session helper:

  .game-harness/scripts/run-same-order-comprehension-session.sh

Say only the neutral pre-play line printed in facilitator-card.md before first
play. Do not send this README, the manifest, Codex QA artifacts, route reports,
or facilitator notes to the tester before first play.

After actual observed play, save completed raw notes under:

  $NOTES_DIR/same-order-comprehension-<UTC_TIMESTAMP>.md

Then run:

  .game-harness/scripts/review-same-order-comprehension-notes.sh
  .game-harness/scripts/review-same-order-comprehension-notes.sh --strict

The active goal remains open until three fresh tester notes reach
PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW and human quote review copies accepted
findings into the external comprehension ledger.
EOF
  "$helper_path" --verify-session-kit "$SESSION_KIT_OUTPUT_DIR" | tee "$SESSION_KIT_OUTPUT_DIR/session-kit-self-check.txt"
  echo "Wrote facilitator-only session kit: $SESSION_KIT_OUTPUT_DIR"
  echo "Wrote session kit self-check: $SESSION_KIT_OUTPUT_DIR/session-kit-self-check.txt"
  echo "Do not count this kit as player comprehension evidence."
  exit 0
fi

if (( PRINT_FACILITATOR_PACK == 1 )); then
  if [[ -n "$FACILITATOR_PACK_OUTPUT_PATH" ]]; then
    mkdir -p "$(dirname "$FACILITATOR_PACK_OUTPUT_PATH")"
    print_facilitator_pack > "$FACILITATOR_PACK_OUTPUT_PATH"
    echo "Wrote facilitator-only run pack: $FACILITATOR_PACK_OUTPUT_PATH"
    echo "Do not send this whole file to testers, and do not count it as comprehension evidence."
  else
    print_facilitator_pack
  fi
  exit 0
fi

if (( PRINT_RECRUITMENT == 1 )); then
  print_verified_tester_invite
  exit 0
fi

if (( PRINT_DEBRIEF == 1 )); then
  cat <<EOF

# Same Order After-Play Debrief Card

Use this only after the tester has played. Do not read this before play.

Build:
- App: $APP_PATH
- Packaged route evidence: $ROUTE_EVIDENCE_PATH
- Notes directory: $NOTES_DIR

Ask these before explaining the design:

1. What did you think was happening to you in this scene?
2. What changed after your spoken or typed line?
3. Which record, ledger, receipt, report, or dossier detail did you notice?
4. If you noticed the economy panel, what did credit, trust, burden, or attention seem to mean?
5. Who made, changed, forwarded, or cited the latest record?
6. Explain the chain in your own words: dialogue -> record -> consequence -> role action.
7. Did a delayed answer or hesitation become a record?
8. Did you think you were investigating other people, or being examined by NPCs/Station systems?

Capture direct quotes:

- Quote where the tester describes being examined/evaluated:
- Quote where the tester connects a statement to a record or consequence:
- Quote where the tester connects delay/hesitation to a record:

Scoring reminder:

- Use the tester's own words, not facilitator summaries.
- Mark partial understanding as conditional.
- Do not turn "yes", "pass", "observed", "not observed", or "none" into a direct quote.
- Do not close the gate from this card. Raw notes still need strict review and human quote review.
EOF
  exit 0
fi

if (( PRINT_WORKSHEET == 1 )); then
  app_binary_sha256="$(shasum -a 256 "$APP_BINARY" | awk '{print $1}')"
  route_evidence_sha256="$(shasum -a 256 "$ROUTE_EVIDENCE_PATH" | awk '{print $1}')"
  codex_probe_sha256="$(codex_probe_sha256)"
  codex_probe_markdown_sha256="$(codex_probe_markdown_sha256)"
  codex_probe_status="$(codex_probe_status_line)"
  codex_probe_route_summary="$(codex_probe_route_summary)"
  codex_probe_action_catalog_summary="$(codex_probe_action_catalog_summary)"
  cat <<EOF

# Same Order Raw Session Worksheet

This worksheet is not evidence until it is filled from an observed fresh-player
session. Do not save a blank worksheet as a completed session note.

Suggested save path after the session:

  $NOTES_DIR/same-order-comprehension-<UTC_TIMESTAMP>.md

Date UTC:
Build path: $APP_PATH
Provider state: fallback_only_m1
Packaged live HUD record-chain proof: pass
Packaged outcome chain proof: pass
App binary sha256: $app_binary_sha256
Packaged route evidence sha256: $route_evidence_sha256
Codex gameplay QA probe path: $CODEX_PROBE_PATH
Codex gameplay QA probe sha256: $codex_probe_sha256
Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
Codex gameplay QA Markdown sha256: $codex_probe_markdown_sha256
Codex gameplay QA probe status: $codex_probe_status
Codex gameplay QA action catalog: $codex_probe_action_catalog_summary
Codex gameplay QA route reports: $codex_probe_route_summary

## Tester

- Tester label:
- Fresh tester:
- Build path: $APP_PATH
- Packaged route evidence path: $ROUTE_EVIDENCE_PATH
- Preflight result: pass
- Provider state: fallback_only_m1
- Packaged live HUD record-chain proof: pass
- Packaged outcome chain proof: pass
- App binary sha256: $app_binary_sha256
- Packaged route evidence sha256: $route_evidence_sha256
- Codex gameplay QA probe path: $CODEX_PROBE_PATH
- Codex gameplay QA probe sha256: $codex_probe_sha256
- Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
- Codex gameplay QA Markdown sha256: $codex_probe_markdown_sha256
- Codex gameplay QA probe status: $codex_probe_status
- Codex gameplay QA action catalog: $codex_probe_action_catalog_summary
- Codex gameplay QA route reports: $codex_probe_route_summary
- Tester language comfort:
- Route seen / final state:
- Free first attempt route / final state:
- Scripted alternate route / final state:
- Safe path observed:
- Risky path observed:
- First explanation of goal:
- What changed after the player's line:
- Record or ledger detail noticed:
- Civic economy detail noticed:
- Who acted on the record:
- Dialogue to record to consequence to role action explanation:
- Delayed answer record noticed:
- Direct quote examined/evaluated:
- Direct quote statement-to-record:
- Direct quote delay-to-record:
- Did tester think they were examining others:
- Facilitator intervention needed:
- Verdict:
- O1 evaluated by NPC/Station:
- O2 connects speech to changed Store record:
- O3 notices actor reaction beyond clerk dialogue:
- O4 explains safer vs riskier answer:
- O5 identifies latest record role/action:
- O6 keeps player as examined subject:
- O7 connects delayed answer to record:
- Direct quotes / notes:

## Scoring Reminder

- Use the tester's own words. Do not paraphrase into the intended design.
- Direct quotes cannot be yes/pass/observed/none placeholders.
- Mark partial understanding as conditional.
- Strict review still requires three distinct fresh testers and human quote review.
EOF
  exit 0
fi

prompt() {
  local label="$1"
  local answer
  printf "%s: " "$label" >&2
  IFS= read -r answer
  printf "%s" "$answer"
}

is_explicit_yes() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ "$value" == yes || "$value" == yes,* || "$value" == yes.* || "$value" == "yes "* ]]
}

require_human_play_display

tester_id="$(prompt "Tester label")"
fresh_tester="$(prompt "Fresh tester? yes/no")"
tester_language="$(prompt "Tester language comfort")"

if [[ -z "$tester_id" ]]; then
  echo "Tester label is required before launching the packaged app." >&2
  exit 2
fi

if [[ -z "$tester_language" ]]; then
  echo "Tester language comfort is required before launching the packaged app." >&2
  exit 2
fi

if ! is_explicit_yes "$fresh_tester"; then
  echo "Not launching packaged app: participant is not marked as a fresh tester with explicit 'yes'." >&2
  exit 2
fi

APP_BINARY_SHA256="$(shasum -a 256 "$APP_BINARY" | awk '{print $1}')"
ROUTE_EVIDENCE_SHA256="$(shasum -a 256 "$ROUTE_EVIDENCE_PATH" | awk '{print $1}')"
CODEX_PROBE_SHA256="$(codex_probe_sha256)"
CODEX_PROBE_MARKDOWN_SHA256="$(codex_probe_markdown_sha256)"
CODEX_PROBE_STATUS="$(codex_probe_status_line)"
CODEX_PROBE_ACTION_CATALOG="$(codex_probe_action_catalog_summary)"
CODEX_PROBE_ROUTE_SUMMARY="$(codex_probe_route_summary)"

mkdir -p "$NOTES_DIR"

echo "Same Order comprehension session"
echo
echo "Instruction to tester:"
echo "Play this short scene without prior explanation until it stops or until 5 minutes pass."
echo
echo "Opening packaged app. Keep facilitator-only terminal output private until after the first explanation."
if [[ "$APP_LAUNCH_MODE" == "macos_app" ]]; then
  open -W "$APP_PATH"
else
  "$APP_BINARY"
fi

echo
echo "After play, before explaining the design:"
echo "- Ask what the tester thought was happening to them."
echo "- Ask what changed after their spoken or typed line."
echo "- Capture their own wording for examined/evaluated, statement-to-record, and delay-to-record quotes."
echo "- Fill the own-word prompts before route labels, scoring, or facilitator interpretation."
echo

first_explanation="$(prompt "First explanation of goal")"
changed_after_line="$(prompt "What changed after the player's line")"
record_detail="$(prompt "Record or ledger detail noticed")"
civic_economy_detail="$(prompt "Civic economy detail noticed, if any")"
actor_detail="$(prompt "Who acted on the record")"
chain_explanation="$(prompt "Dialogue to record to consequence to role action explanation")"
delayed_record_detail="$(prompt "Delayed answer record noticed")"
examined_quote="$(prompt "Direct quote: tester says they are examined/evaluated")"
record_quote="$(prompt "Direct quote: tester connects statement to record/consequence")"
delay_quote="$(prompt "Direct quote: tester connects delayed answer to record, if observed")"
role_inversion="$(prompt "Did tester think they were examining others?")"
route_seen="$(prompt "Route seen / final state")"
free_route_seen="$(prompt "Free first attempt route / final state")"
scripted_route_seen="$(prompt "Scripted alternate route / final state, if any")"
safe_path_observed="$(prompt "Safe path observed? yes/no")"
risky_path_observed="$(prompt "Risky path observed? yes/no")"
intervention="$(prompt "Facilitator intervention needed")"
verdict="$(prompt "Verdict: pass, conditional, or fail")"
o1="$(prompt "O1 evaluated by NPC/Station (pass/conditional/fail)")"
o2="$(prompt "O2 connects speech to changed Store record (pass/conditional/fail)")"
o3="$(prompt "O3 notices actor reaction beyond clerk dialogue (pass/conditional/fail)")"
o4="$(prompt "O4 explains safer vs riskier answer (pass/conditional/fail)")"
o5="$(prompt "O5 identifies latest record role/action (pass/conditional/fail)")"
o6="$(prompt "O6 keeps player as examined subject (pass/conditional/fail)")"
o7="$(prompt "O7 connects delayed answer to record (pass/conditional/fail/not observed)")"
notes="$(prompt "Direct quotes / notes")"

cat > "$NOTES_PATH" <<EOF
# Same Order Comprehension Session

Date UTC: $SESSION_ID
Build path: $APP_PATH
Provider state: fallback_only_m1
Packaged live HUD record-chain proof: pass
Packaged outcome chain proof: pass
App binary sha256: $APP_BINARY_SHA256
Packaged route evidence sha256: $ROUTE_EVIDENCE_SHA256
Codex gameplay QA probe path: $CODEX_PROBE_PATH
Codex gameplay QA probe sha256: $CODEX_PROBE_SHA256
Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
Codex gameplay QA Markdown sha256: $CODEX_PROBE_MARKDOWN_SHA256
Codex gameplay QA probe status: $CODEX_PROBE_STATUS
Codex gameplay QA action catalog: $CODEX_PROBE_ACTION_CATALOG
Codex gameplay QA route reports: $CODEX_PROBE_ROUTE_SUMMARY

## Tester

- Tester label: $tester_id
- Fresh tester: $fresh_tester
- Build path: $APP_PATH
- Packaged route evidence path: $ROUTE_EVIDENCE_PATH
- Preflight result: pass
- Provider state: fallback_only_m1
- Packaged live HUD record-chain proof: pass
- Packaged outcome chain proof: pass
- App binary sha256: $APP_BINARY_SHA256
- Packaged route evidence sha256: $ROUTE_EVIDENCE_SHA256
- Codex gameplay QA probe path: $CODEX_PROBE_PATH
- Codex gameplay QA probe sha256: $CODEX_PROBE_SHA256
- Codex gameplay QA Markdown report: $CODEX_PROBE_MARKDOWN_PATH
- Codex gameplay QA Markdown sha256: $CODEX_PROBE_MARKDOWN_SHA256
- Codex gameplay QA probe status: $CODEX_PROBE_STATUS
- Codex gameplay QA action catalog: $CODEX_PROBE_ACTION_CATALOG
- Codex gameplay QA route reports: $CODEX_PROBE_ROUTE_SUMMARY
- Tester language comfort: $tester_language
- Route seen / final state: $route_seen
- Free first attempt route / final state: $free_route_seen
- Scripted alternate route / final state: $scripted_route_seen
- Safe path observed: $safe_path_observed
- Risky path observed: $risky_path_observed
- First explanation of goal: $first_explanation
- What changed after the player's line: $changed_after_line
- Record or ledger detail noticed: $record_detail
- Civic economy detail noticed: $civic_economy_detail
- Who acted on the record: $actor_detail
- Dialogue to record to consequence to role action explanation: $chain_explanation
- Delayed answer record noticed: $delayed_record_detail
- Direct quote examined/evaluated: $examined_quote
- Direct quote statement-to-record: $record_quote
- Direct quote delay-to-record: $delay_quote
- Did tester think they were examining others: $role_inversion
- Facilitator intervention needed: $intervention
- Verdict: $verdict
- O1 evaluated by NPC/Station: $o1
- O2 connects speech to changed Store record: $o2
- O3 notices actor reaction beyond clerk dialogue: $o3
- O4 explains safer vs riskier answer: $o4
- O5 identifies latest record role/action: $o5
- O6 keeps player as examined subject: $o6
- O7 connects delayed answer to record: $o7
- Direct quotes / notes: $notes

## Scoring Reminder

- Pass requires the tester to understand they are being examined.
- Pass requires a fresh tester who has not seen this Same Order proof before.
- Pass requires at least one dialogue or typed statement to be connected to a visible record.
- Inquest comparison notes should capture whether the tester noticed that a delayed answer can also become a record.
- Uncertainty should be marked conditional, not pass.
- This note is human tester evidence only if the answers above were taken from an actual tester.
EOF

echo
echo "Wrote $NOTES_PATH"
shopt -s nullglob
written_note_files=("$NOTES_DIR"/same-order-comprehension-*.md)
shopt -u nullglob
written_note_count="${#written_note_files[@]}"
written_remaining=$((3 - written_note_count))
if (( written_remaining < 0 )); then
  written_remaining=0
fi
echo
echo "Review progress:"
echo "  Raw session note files: $written_note_count / 3 minimum"
echo "  Minimum additional raw files needed before strict review can pass: $written_remaining"
echo "  .game-harness/scripts/review-same-order-comprehension-notes.sh"
echo "  .game-harness/scripts/run-same-order-comprehension-session.sh --status"
if (( written_note_count >= 3 )); then
  echo "Next gate commands:"
  echo "  .game-harness/scripts/review-same-order-comprehension-notes.sh --strict"
  echo "  .game-harness/scripts/review-same-order-comprehension-notes.sh --ledger-draft .game-harness/comprehension/same-order-external-comprehension-ledger-draft.md"
else
  echo "Strict review and ledger draft are only useful after three valid fresh-player notes."
fi
