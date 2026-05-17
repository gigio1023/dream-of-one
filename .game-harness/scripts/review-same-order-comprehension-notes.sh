#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
NOTES_DIR="${DREAM_OF_ONE_COMPREHENSION_NOTES_DIR:-$REPO_ROOT/.game-harness/comprehension/manual-sessions}"
STRICT=0
LEDGER_DRAFT_PATH="${DREAM_OF_ONE_COMPREHENSION_LEDGER_DRAFT_PATH:-}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--strict] [--ledger-draft <path>]

Summarizes Same Order comprehension session notes.

Options:
  --strict              Exit non-zero unless notes reach PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW.
  --ledger-draft <path> Write a human-review draft for the external notes ledger.

Environment:
  DREAM_OF_ONE_COMPREHENSION_NOTES_DIR
  DREAM_OF_ONE_COMPREHENSION_LEDGER_DRAFT_PATH
EOF
}

while (( $# > 0 )); do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --strict)
      STRICT=1
      shift
      ;;
    --ledger-draft)
      if [[ -z "${2:-}" ]]; then
        echo "Missing path after --ledger-draft" >&2
        exit 2
      fi
      LEDGER_DRAFT_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

shopt -s nullglob
files=("$NOTES_DIR"/same-order-comprehension-*.md)
shopt -u nullglob

field_value() {
  local file="$1"
  local label="$2"
  awk -v prefix="- ${label}: " 'index($0, prefix) == 1 { sub(prefix, ""); print; exit }' "$file"
}

is_pass() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ "$value" == pass || "$value" == pass:* || "$value" == "pass "* ]]
}

is_no_role_inversion() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ "$value" == no || "$value" == no,* || "$value" == no.* || "$value" == "no "* || "$value" == none* || "$value" == "false"* || "$value" == did\ not* ]]
}

is_yes() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ "$value" == yes || "$value" == yes,* || "$value" == yes.* || "$value" == "yes "* || "$value" == observed* || "$value" == pass* ]]
}

is_explicit_yes() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ "$value" == yes || "$value" == yes,* || "$value" == yes.* || "$value" == "yes "* ]]
}

is_korean_comfortable() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ "$value" == *korean* || "$value" == *한국* || "$value" == *ko-* || "$value" == ko || "$value" == kr || "$value" == *native* ]]
}

has_safe_route() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == *clean_cover* || "$value" == *repair_recovered* || "$value" == *safe* || "$value" == *repair* ]]
}

has_risky_route() {
  local value
  value="$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == *soft_report* || "$value" == *inquest* || "$value" == *risky* ]]
}

is_filled() {
  local value
  value="$(printf "%s" "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -n "$value" && "$value" != "-" && "$value" != "missing" ]]
}

has_direct_quote() {
  local value lowered
  value="$(printf "%s" "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  lowered="$(printf "%s" "$value" | tr '[:upper:]' '[:lower:]')"
  is_filled "$value" || return 1
  [[ ${#value} -ge 12 ]] || return 1
  [[ "$lowered" != "yes" && "$lowered" != "pass" && "$lowered" != "no" && "$lowered" != "observed" ]] || return 1
  [[ "$lowered" != "n/a" && "$lowered" != "not observed" && "$lowered" != "none" ]] || return 1
}

is_build_proven() {
  local build_path="$1"
  local route_evidence_path="$2"
  local preflight_result="$3"
  local provider_state="$4"
  local expected_app_sha="$5"
  local expected_evidence_sha="$6"

  is_filled "$build_path" || return 1
  is_filled "$route_evidence_path" || return 1
  is_pass "$preflight_result" || return 1
  [[ "$provider_state" == "fallback_only_m1" ]] || return 1
  is_filled "$expected_app_sha" || return 1
  is_filled "$expected_evidence_sha" || return 1

  node - "$build_path" "$route_evidence_path" "$expected_app_sha" "$expected_evidence_sha" <<'NODE' >/dev/null 2>&1
const crypto = require("crypto");
const fs = require("fs");
const appPath = process.argv[2];
const evidencePath = process.argv[3];
const expectedAppSha = process.argv[4];
const expectedEvidenceSha = process.argv[5];
const appBinaryPath = `${appPath}/Contents/MacOS/Dream of One Godot Shell`;
if (!fs.existsSync(appPath) || !fs.existsSync(appBinaryPath) || !fs.existsSync(evidencePath)) {
  process.exit(1);
}
function sha256(path) {
  return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}
if (sha256(appBinaryPath) !== expectedAppSha || sha256(evidencePath) !== expectedEvidenceSha) {
  process.exit(1);
}
const evidenceMtime = fs.statSync(evidencePath).mtimeMs;
const appMtime = fs.statSync(appBinaryPath).mtimeMs;
if (evidenceMtime + 1000 < appMtime) {
  process.exit(1);
}
const pack = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
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
const hudTrail = String(packagedProof.hudTrail || "");
const outcomeBody = String(packagedProof.outcomeBody || "");
const consequenceLabel = String(packagedProof.consequenceLabel || "");
const civicEconomyPanelLabel = String(civicEconomyPanel.label || summary.worldRecordProps?.civic_economy_panel?.label || "");
const civicEconomyPanelState = String(civicEconomyPanel.state || summary.worldRecordProps?.civic_economy_panel?.state || "");
const hasTypedFreeInput = events.some((event) => event.inputMode === "typed_free_input");
const hasResponseHesitation = events.some((event) => event.eventName === "response_hesitation_noted");
if (
  summary.stage !== "inquest" ||
  summary.sessionOutcome !== "inquest_opened" ||
  providerMode !== "fallback_only_m1" ||
  !hasTypedFreeInput ||
  !hasResponseHesitation ||
  !ledgerEventCites("station_record_cited", "civic-ledger-6", "civic-ledger-5") ||
  latestLedgerId !== "civic-ledger-7" ||
  latestLedger.kind !== "queue_contact_refused" ||
  latestLedger.citedLedgerEventId !== "civic-ledger-6" ||
  packagedProof.pass !== true ||
  hudChecks.examinerWording !== true ||
  hudChecks.playerAsExaminedSubject !== true ||
  hudChecks.stationOfficerExaminer !== true ||
  !hudTrail.includes("검사자") ||
  !hudTrail.includes("대상: 플레이어") ||
  !hudTrail.includes("스테이션 직원") ||
  outcomeChecks.liveRecordChain !== true ||
  !consequenceLabel.includes("플레이어 발화/응답 지연 -> 상점 기록") ||
  !consequenceLabel.includes("스테이션 인용") ||
  outcomeChecks.speechDelayRecordChain !== true ||
  outcomeChecks.stationOfficerRoleAction !== true ||
  !outcomeBody.includes("플레이어 발화/응답 지연 -> 상점 기록") ||
  !outcomeBody.includes("스테이션 인용 -> 접촉 거부 -> 심문") ||
  !outcomeBody.includes("역할 행동: 스테이션 직원") ||
  civicEconomyChecks.attentionState !== true ||
  civicEconomyPanelState !== "attention" ||
  civicEconomyChecks.accountCreditVisible !== true ||
  !civicEconomyPanelLabel.includes(String(summary.civicEconomy?.accountCredit)) ||
  civicEconomyChecks.localTrustVisible !== true ||
  !civicEconomyPanelLabel.includes(String(summary.civicEconomy?.localTrust)) ||
  civicEconomyChecks.recordBurdenVisible !== true ||
  !civicEconomyPanelLabel.includes(String(summary.civicEconomy?.recordBurden)) ||
  civicEconomyChecks.stationAttentionVisible !== true ||
  !civicEconomyPanelLabel.includes(String(summary.civicEconomy?.stationAttention))
) {
  process.exit(1);
}
NODE
}

session_count="${#files[@]}"
verdict_pass=0
fresh_tester_sessions=0
korean_comfortable=0
safe_route_sessions=0
risky_route_sessions=0
complete_note_sessions=0
chain_explanation_sessions=0
civic_economy_detail_sessions=0
delayed_answer_record_sessions=0
direct_quote_sessions=0
direct_delay_quote_sessions=0
outcome_chain_proof_sessions=0
live_record_chain_proof_sessions=0
sha_bound_sessions=0
o1_pass=0
o2_pass=0
o3_pass=0
o4_pass=0
o5_pass=0
o6_pass=0
o7_pass=0
no_role_inversion=0
build_bound_sessions=0
rows=()
draft_sections=()
tester_labels=()

if (( session_count > 0 )); then
  for file in "${files[@]}"; do
    tester="$(field_value "$file" "Tester label")"
    fresh_tester="$(field_value "$file" "Fresh tester")"
    build_path="$(field_value "$file" "Build path")"
    route_evidence_path="$(field_value "$file" "Packaged route evidence path")"
    preflight_result="$(field_value "$file" "Preflight result")"
    provider_state="$(field_value "$file" "Provider state")"
    live_record_chain_proof="$(field_value "$file" "Packaged live HUD record-chain proof")"
    outcome_chain_proof="$(field_value "$file" "Packaged outcome chain proof")"
    app_binary_sha="$(field_value "$file" "App binary sha256")"
    route_evidence_sha="$(field_value "$file" "Packaged route evidence sha256")"
    tester_language="$(field_value "$file" "Tester language comfort")"
    route_seen="$(field_value "$file" "Route seen / final state")"
    free_route_seen="$(field_value "$file" "Free first attempt route / final state")"
    scripted_route_seen="$(field_value "$file" "Scripted alternate route / final state")"
    safe_path_observed="$(field_value "$file" "Safe path observed")"
    risky_path_observed="$(field_value "$file" "Risky path observed")"
    first_explanation="$(field_value "$file" "First explanation of goal")"
    changed_after_line="$(field_value "$file" "What changed after the player's line")"
    record_detail="$(field_value "$file" "Record or ledger detail noticed")"
    civic_economy_detail="$(field_value "$file" "Civic economy detail noticed")"
    actor_detail="$(field_value "$file" "Who acted on the record")"
    chain_explanation="$(field_value "$file" "Dialogue to record to consequence to role action explanation")"
    delayed_record_detail="$(field_value "$file" "Delayed answer record noticed")"
    examined_quote="$(field_value "$file" "Direct quote examined/evaluated")"
    record_quote="$(field_value "$file" "Direct quote statement-to-record")"
    delay_quote="$(field_value "$file" "Direct quote delay-to-record")"
    verdict="$(field_value "$file" "Verdict")"
    role_inversion="$(field_value "$file" "Did tester think they were examining others")"
    intervention="$(field_value "$file" "Facilitator intervention needed")"
    o1="$(field_value "$file" "O1 evaluated by NPC/Station")"
    o2="$(field_value "$file" "O2 connects speech to changed Store record")"
    o3="$(field_value "$file" "O3 notices actor reaction beyond clerk dialogue")"
    o4="$(field_value "$file" "O4 explains safer vs riskier answer")"
    o5="$(field_value "$file" "O5 identifies latest record role/action")"
    o6="$(field_value "$file" "O6 keeps player as examined subject")"
    o7="$(field_value "$file" "O7 connects delayed answer to record")"
    notes="$(field_value "$file" "Direct quotes / notes")"
    build_proven=0

    is_pass "$verdict" && verdict_pass=$((verdict_pass + 1))
    if is_filled "$tester"; then
      tester_labels+=("$tester")
    fi
    is_explicit_yes "$fresh_tester" && fresh_tester_sessions=$((fresh_tester_sessions + 1))
    is_korean_comfortable "$tester_language" && korean_comfortable=$((korean_comfortable + 1))
    if has_safe_route "$route_seen $free_route_seen $scripted_route_seen" || is_yes "$safe_path_observed"; then
      safe_route_sessions=$((safe_route_sessions + 1))
    fi
    if has_risky_route "$route_seen $free_route_seen $scripted_route_seen" || is_yes "$risky_path_observed"; then
      risky_route_sessions=$((risky_route_sessions + 1))
    fi
    is_pass "$o1" && o1_pass=$((o1_pass + 1))
    is_pass "$o2" && o2_pass=$((o2_pass + 1))
    is_pass "$o3" && o3_pass=$((o3_pass + 1))
    is_pass "$o4" && o4_pass=$((o4_pass + 1))
    is_pass "$o5" && o5_pass=$((o5_pass + 1))
    is_pass "$o6" && o6_pass=$((o6_pass + 1))
    is_pass "$o7" && o7_pass=$((o7_pass + 1))
    is_no_role_inversion "$role_inversion" && no_role_inversion=$((no_role_inversion + 1))
    if is_build_proven "$build_path" "$route_evidence_path" "$preflight_result" "$provider_state" "$app_binary_sha" "$route_evidence_sha"; then
      build_proven=1
      build_bound_sessions=$((build_bound_sessions + 1))
    fi
    if (( build_proven == 1 )) && is_filled "$app_binary_sha" && is_filled "$route_evidence_sha"; then
      sha_bound_sessions=$((sha_bound_sessions + 1))
    fi
    is_pass "$outcome_chain_proof" && outcome_chain_proof_sessions=$((outcome_chain_proof_sessions + 1))
    is_pass "$live_record_chain_proof" && live_record_chain_proof_sessions=$((live_record_chain_proof_sessions + 1))
    is_filled "$chain_explanation" && chain_explanation_sessions=$((chain_explanation_sessions + 1))
    is_filled "$civic_economy_detail" && civic_economy_detail_sessions=$((civic_economy_detail_sessions + 1))
    if is_yes "$delayed_record_detail"; then
      delayed_answer_record_sessions=$((delayed_answer_record_sessions + 1))
    fi
    if has_direct_quote "$examined_quote" && has_direct_quote "$record_quote"; then
      direct_quote_sessions=$((direct_quote_sessions + 1))
    fi
    has_direct_quote "$delay_quote" && direct_delay_quote_sessions=$((direct_delay_quote_sessions + 1))

    if (( build_proven == 1 )) && is_pass "$live_record_chain_proof" && is_pass "$outcome_chain_proof" && is_explicit_yes "$fresh_tester" && is_filled "$tester_language" && is_filled "$route_seen" && is_filled "$free_route_seen" && is_filled "$first_explanation" && is_filled "$changed_after_line" && is_filled "$record_detail" && is_filled "$actor_detail" && is_filled "$chain_explanation" && is_filled "$delayed_record_detail" && has_direct_quote "$examined_quote" && has_direct_quote "$record_quote" && is_filled "$role_inversion" && is_filled "$intervention" && is_filled "$notes"; then
      complete_note_sessions=$((complete_note_sessions + 1))
    fi

    chain_flag="missing"
    is_filled "$chain_explanation" && chain_flag="yes"
    build_flag="missing"
    if (( build_proven == 1 )); then
      build_flag="yes"
    fi
    outcome_flag="missing"
    is_pass "$outcome_chain_proof" && outcome_flag="yes"
    live_chain_flag="missing"
    is_pass "$live_record_chain_proof" && live_chain_flag="yes"
    fresh_flag="missing"
    is_explicit_yes "$fresh_tester" && fresh_flag="yes"
    rows+=("| ${tester:-unknown} | $fresh_flag | ${tester_language:-missing} | ${route_seen:-missing} | ${verdict:-missing} | ${o1:-missing} | ${o2:-missing} | ${o5:-missing} | ${o6:-missing} | ${o7:-missing} | $chain_flag | $build_flag | $live_chain_flag | $outcome_flag | $(basename "$file") |")
    draft_sections+=("### ${tester:-unknown}

- Source: $(basename "$file")
- Fresh tester: ${fresh_tester:-missing}
- Build path: ${build_path:-missing}
- Packaged route evidence path: ${route_evidence_path:-missing}
- Preflight result: ${preflight_result:-missing}
- Provider state: ${provider_state:-missing}
- Packaged live HUD record-chain proof: ${live_record_chain_proof:-missing}
- Packaged outcome chain proof: ${outcome_chain_proof:-missing}
- App binary sha256: ${app_binary_sha:-missing}
- Packaged route evidence sha256: ${route_evidence_sha:-missing}
- Language comfort: ${tester_language:-missing}
- Route seen: ${route_seen:-missing}
- Free first attempt route / final state: ${free_route_seen:-missing}
- Scripted alternate route / final state: ${scripted_route_seen:-missing}
- Safe path observed: ${safe_path_observed:-missing}
- Risky path observed: ${risky_path_observed:-missing}
- First explanation of goal: ${first_explanation:-missing}
- What changed after the player's line: ${changed_after_line:-missing}
- Record or ledger detail noticed: ${record_detail:-missing}
- Civic economy detail noticed: ${civic_economy_detail:-missing}
- Who acted on the record: ${actor_detail:-missing}
- Dialogue to record to consequence to role action explanation: ${chain_explanation:-missing}
- Delayed answer record noticed: ${delayed_record_detail:-missing}
- Direct quote examined/evaluated: ${examined_quote:-missing}
- Direct quote statement-to-record: ${record_quote:-missing}
- Direct quote delay-to-record: ${delay_quote:-missing}
- Did tester think they were examining others: ${role_inversion:-missing}
- Facilitator intervention needed: ${intervention:-missing}
- Verdict: ${verdict:-missing}
- O1 evaluated by NPC/Station: ${o1:-missing}
- O2 connects speech to changed Store record: ${o2:-missing}
- O3 notices actor reaction beyond clerk dialogue: ${o3:-missing}
- O4 explains safer vs riskier answer: ${o4:-missing}
- O5 identifies latest record role/action: ${o5:-missing}
- O6 keeps player as examined subject: ${o6:-missing}
- O7 connects delayed answer to record: ${o7:-missing}
- Direct quotes / notes: ${notes:-missing}
")
  done
fi

unique_tester_labels=0
if (( ${#tester_labels[@]} > 0 )); then
  unique_tester_labels="$(printf "%s\n" "${tester_labels[@]}" | sort -u | wc -l | tr -d '[:space:]')"
fi

status="PENDING_TESTER_NOTES"
if (( session_count >= 3 )); then
  status="FAIL_OR_CONDITIONAL"
  if (( verdict_pass == session_count && fresh_tester_sessions == session_count && unique_tester_labels == session_count && build_bound_sessions == session_count && sha_bound_sessions == session_count && live_record_chain_proof_sessions == session_count && outcome_chain_proof_sessions == session_count && korean_comfortable >= 2 && safe_route_sessions >= 1 && risky_route_sessions >= 1 && complete_note_sessions == session_count && chain_explanation_sessions >= 2 && delayed_answer_record_sessions >= 2 && direct_quote_sessions == session_count && direct_delay_quote_sessions >= 2 && o1_pass == session_count && o2_pass == session_count && o3_pass >= 2 && o4_pass >= 2 && o5_pass >= 2 && o6_pass == session_count && o7_pass >= 2 && no_role_inversion == session_count )); then
    status="PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW"
  fi
fi

cat <<EOF
# Same Order Comprehension Notes Review

Status: \`$status\`
Manual session count: $session_count

This report summarizes raw facilitator notes. It does not close the product
gate by itself; a human still needs to review direct quotes and copy accepted
findings into the external comprehension ledger.

| Check | Count |
|---|---:|
| Tester verdict pass | $verdict_pass / $session_count |
| Fresh testers | $fresh_tester_sessions / $session_count |
| Unique tester labels | $unique_tester_labels / $session_count |
| Korean-comfortable testers | $korean_comfortable / $session_count |
| Sessions with safe route evidence | $safe_route_sessions / $session_count |
| Sessions with risky route evidence | $risky_route_sessions / $session_count |
| Sessions bound to build and preflight evidence | $build_bound_sessions / $session_count |
| Sessions bound to app/evidence sha256 | $sha_bound_sessions / $session_count |
| Sessions with packaged live HUD record-chain proof | $live_record_chain_proof_sessions / $session_count |
| Sessions with packaged outcome-chain proof | $outcome_chain_proof_sessions / $session_count |
| Complete note structure | $complete_note_sessions / $session_count |
| Dialogue-record-consequence-role chain captured | $chain_explanation_sessions / $session_count |
| Civic economy detail captured | $civic_economy_detail_sessions / $session_count |
| Delayed-answer record noticed | $delayed_answer_record_sessions / $session_count |
| Direct examined and record quotes captured | $direct_quote_sessions / $session_count |
| Direct delay-to-record quotes captured | $direct_delay_quote_sessions / $session_count |
| O1 evaluated by NPC/Station | $o1_pass / $session_count |
| O2 speech changed Store record | $o2_pass / $session_count |
| O3 noticed actor reaction | $o3_pass / $session_count |
| O4 safer vs riskier answer | $o4_pass / $session_count |
| O5 latest record role/action | $o5_pass / $session_count |
| O6 player is examined subject | $o6_pass / $session_count |
| O7 delayed answer became record | $o7_pass / $session_count |
| No role inversion | $no_role_inversion / $session_count |

| Tester | Fresh | Language | Route | Verdict | O1 | O2 | O5 | O6 | O7 | Chain | Build | Live HUD Proof | Outcome Proof | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
EOF

if (( session_count == 0 )); then
  echo "| none | missing | missing | missing | missing | missing | missing | missing | missing | missing | missing | missing | missing | missing | none |"
else
  printf "%s\n" "${rows[@]}"
fi

if [[ -n "$LEDGER_DRAFT_PATH" ]]; then
  mkdir -p "$(dirname -- "$LEDGER_DRAFT_PATH")"
  {
    echo "# Same Order External Comprehension Ledger Draft"
    echo
    echo "Generated UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "Review status: \`$status\`"
    echo "Manual session count: $session_count"
    echo
    echo "This is a draft for human quote review. It does not close the external comprehension gate."
    echo
    echo "## Review Counts"
    echo
    echo "- Tester verdict pass: $verdict_pass / $session_count"
    echo "- Fresh testers: $fresh_tester_sessions / $session_count"
    echo "- Unique tester labels: $unique_tester_labels / $session_count"
    echo "- Korean-comfortable testers: $korean_comfortable / $session_count"
    echo "- Sessions with safe route evidence: $safe_route_sessions / $session_count"
    echo "- Sessions with risky route evidence: $risky_route_sessions / $session_count"
    echo "- Sessions bound to build and preflight evidence: $build_bound_sessions / $session_count"
    echo "- Sessions bound to app/evidence sha256: $sha_bound_sessions / $session_count"
    echo "- Sessions with packaged live HUD record-chain proof: $live_record_chain_proof_sessions / $session_count"
    echo "- Sessions with packaged outcome-chain proof: $outcome_chain_proof_sessions / $session_count"
    echo "- Complete note structure: $complete_note_sessions / $session_count"
    echo "- Dialogue-record-consequence-role chain captured: $chain_explanation_sessions / $session_count"
    echo "- Civic economy detail captured: $civic_economy_detail_sessions / $session_count"
    echo "- Delayed-answer record noticed: $delayed_answer_record_sessions / $session_count"
    echo "- Direct examined and record quotes captured: $direct_quote_sessions / $session_count"
    echo "- Direct delay-to-record quotes captured: $direct_delay_quote_sessions / $session_count"
    echo "- O1 evaluated by NPC/Station: $o1_pass / $session_count"
    echo "- O2 speech changed Store record: $o2_pass / $session_count"
    echo "- O3 noticed actor reaction: $o3_pass / $session_count"
    echo "- O4 safer vs riskier answer: $o4_pass / $session_count"
    echo "- O5 latest record role/action: $o5_pass / $session_count"
    echo "- O6 player is examined subject: $o6_pass / $session_count"
    echo "- O7 delayed answer became record: $o7_pass / $session_count"
    echo "- No role inversion: $no_role_inversion / $session_count"
    echo
    echo "## Human Verdict"
    echo
    echo "- Accepted verdict: pending human quote review"
    echo "- Required action: inspect the direct quotes below before copying accepted findings into the external ledger."
    echo
    echo "## Session Drafts"
    echo
    if (( session_count == 0 )); then
      echo "No raw session notes found."
    else
      printf "%s\n" "${draft_sections[@]}"
    fi
  } > "$LEDGER_DRAFT_PATH"
  echo
  echo "Wrote ledger draft: $LEDGER_DRAFT_PATH"
fi

if (( STRICT == 1 )) && [[ "$status" != "PASS_CANDIDATE_REQUIRES_QUOTE_REVIEW" ]]; then
  exit 1
fi
