extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json"
const ARTIFACT_PATH := "data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json"
const MARKDOWN_ARTIFACT_PATH := "data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.md"
const OUTPUT_ENV := "DREAM_OF_ONE_CODEX_GAMEPLAY_PROBE_OUTPUT"
const TYPED_LINE := "저는 이 꿈에 방금 들어왔어요."
const PROBE_STEPS := [
	{"actionId": "focus.store_counter", "payload": {}},
	{"actionId": "conversation.start", "payload": {}},
	{"actionId": "player.wait.hesitation_record", "payload": {}},
	{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.risky"}},
	{"actionId": "player.type.free_input", "payload": {"line": TYPED_LINE}}
]
const ROUTE_PROBE_PLANS := [
	{
		"routeId": "clean_cover",
		"expectedStage": "normal",
		"expectedRouteOutcome": "clean_cover",
		"expectedSessionOutcome": "cover_held",
		"steps": [
			{"actionId": "focus.store_counter", "payload": {}},
			{"actionId": "conversation.start", "payload": {}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.safe"}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.safe"}}
		]
	},
	{
		"routeId": "repair_recovered",
		"expectedStage": "uneasy",
		"expectedRouteOutcome": "repair_recovered",
		"expectedSessionOutcome": "cover_held",
		"steps": [
			{"actionId": "focus.store_counter", "payload": {}},
			{"actionId": "conversation.start", "payload": {}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.repair"}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.safe"}}
		]
	},
	{
		"routeId": "soft_report",
		"expectedStage": "reported",
		"expectedRouteOutcome": "soft_report",
		"expectedSessionOutcome": "soft_report",
		"steps": [
			{"actionId": "focus.store_counter", "payload": {}},
			{"actionId": "conversation.start", "payload": {}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.risky"}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.risky"}}
		]
	}
]
const REQUIRED_ROUTE_REPORT_IDS := ["clean_cover", "repair_recovered", "soft_report", "inquest_opened"]

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail(["Unable to load %s" % MAIN_SCENE])
		return

	var scene := packed.instantiate()
	root.add_child(scene)
	await _settle_frames(3)

	var session := scene.find_child("PlayableSession", true, false)
	var failures: Array[String] = []
	if session == null or not session.has_method("debug_codex_gameplay_action"):
		failures.append("PlayableSession is missing the Codex gameplay action API")
	if session == null or not session.has_method("debug_codex_gameplay_snapshot"):
		failures.append("PlayableSession is missing the Codex gameplay snapshot API")
	if session == null or not session.has_method("debug_codex_gameplay_action_catalog"):
		failures.append("PlayableSession is missing the Codex gameplay action catalog")
	if failures.size() > 0:
		_fail(failures)
		return

	var executed_steps: Array[Dictionary] = []
	var snapshots: Array[Dictionary] = []
	snapshots.append(_snapshot("initial", session))

	for step in PROBE_STEPS:
		await _drive_codex_action(session, executed_steps, snapshots, str(step.get("actionId", "")), step.get("payload", {}))

	var final_snapshot := _codex_snapshot(session)
	var final_summary: Dictionary = final_snapshot.get("summary", {})
	var record_props: Dictionary = final_snapshot.get("worldRecordProps", {})
	var hud_snapshot: Dictionary = final_snapshot.get("hud", {})
	var checks := _npc_interaction_checks(final_summary, record_props)
	var ai_player_report := _ai_player_report(final_summary, hud_snapshot, record_props, checks, executed_steps)
	var route_reports: Array[Dictionary] = []
	for plan in ROUTE_PROBE_PLANS:
		var route_report := await _run_route_probe(packed, plan)
		route_reports.append(route_report)
	var inquest_route_report := _route_report_from_current_run({
		"routeId": "inquest_opened",
		"expectedStage": "inquest",
		"expectedRouteOutcome": "inquest_opened",
		"expectedSessionOutcome": "inquest_opened"
	}, final_summary, hud_snapshot, record_props, executed_steps, checks)
	var inquest_route_failures := _validate_route_report({
		"routeId": "inquest_opened",
		"expectedStage": "inquest",
		"expectedRouteOutcome": "inquest_opened",
		"expectedSessionOutcome": "inquest_opened"
	}, inquest_route_report, final_summary, record_props, checks)
	inquest_route_report["failures"] = inquest_route_failures
	inquest_route_report["pass"] = inquest_route_failures.is_empty()
	route_reports.append(inquest_route_report)
	failures.append_array(_validate_probe(final_summary, hud_snapshot, record_props, checks, executed_steps))
	failures.append_array(_validate_ai_player_report(ai_player_report))
	failures.append_array(_validate_route_reports(route_reports))

	var output_path := _probe_output_path()
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var artifact := {
		"schemaVersion": "codex-gameplay-probe-v1",
		"artifactPath": _probe_artifact_path(output_path),
		"markdownArtifactPath": _probe_markdown_artifact_path(output_path),
		"ok": failures.is_empty(),
		"purpose": "Codex gameplay QA interface for running the actual Same Order Godot scene, applying bounded player inputs, reading environment state, and checking NPC-to-NPC social reactions.",
		"scope": "M1 Same Order Store/Station cell",
		"codexInterface": {
			"canReadPlayerInput": true,
			"canExecutePlayerInput": true,
			"canInspectEnvironment": true,
			"canInspectNpcRoleActions": true,
			"canInspectHud": true,
			"stableRuntimeActionApi": "PlayableSession.debug_codex_gameplay_action",
			"stableRuntimeSnapshotApi": "PlayableSession.debug_codex_gameplay_snapshot",
			"preferredUse": "Run after a small gameplay change to see whether Codex can still play, read consequences, and explain the social chain before asking a human tester.",
			"notAReplacementForExternalPlaytest": true
		},
		"playerActionCatalog": _action_catalog(session),
		"executedSteps": executed_steps,
		"snapshots": snapshots,
		"environmentSnapshot": {
			"stage": final_summary.get("stage", ""),
			"conversation": final_summary.get("conversation", {}),
			"civicEconomy": final_summary.get("civicEconomy", {}),
			"recordObjects": final_summary.get("recordObjects", {}),
			"worldRecordProps": record_props,
			"hud": hud_snapshot
		},
		"npcInteractionChecks": checks,
		"aiPlayerReport": ai_player_report,
		"routeReports": route_reports,
		"finalSummary": final_summary,
		"failures": failures
	}

	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write Codex gameplay probe output: %s" % output_path])
		return
	file.store_string(JSON.stringify(artifact, "\t"))
	file.close()

	var markdown_path := _probe_markdown_output_path(output_path)
	var markdown_file := FileAccess.open(markdown_path, FileAccess.WRITE)
	if markdown_file == null:
		_fail(["Unable to write Codex gameplay Markdown report: %s" % markdown_path])
		return
	markdown_file.store_string(_markdown_report(artifact))
	markdown_file.close()

	print(JSON.stringify({
		"ok": failures.is_empty(),
		"artifactPath": _probe_artifact_path(output_path),
		"markdownArtifactPath": _probe_markdown_artifact_path(output_path),
		"stage": final_summary.get("stage", ""),
		"suspicion": final_summary.get("suspicion", 0),
		"reportWeight": final_summary.get("reportWeight", 0),
		"aiPlayerReportPass": ai_player_report.get("pass", false),
		"routeReportPassCount": _passed_route_count(route_reports),
		"routeReportCount": route_reports.size(),
		"npcInteractionChecks": checks,
		"failures": failures
	}, "\t"))
	scene.queue_free()
	await _settle_frames(1)
	quit(0 if failures.is_empty() else 1)

func _probe_output_path() -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		if override_path.begins_with("res://") or override_path.begins_with("user://"):
			return ProjectSettings.globalize_path(override_path)
		return override_path
	return ProjectSettings.globalize_path(OUTPUT_PATH)

func _probe_artifact_path(output_path: String) -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		return output_path
	return ARTIFACT_PATH

func _probe_markdown_output_path(output_path: String) -> String:
	return "%s.md" % output_path.get_basename()

func _probe_markdown_artifact_path(output_path: String) -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		return _probe_markdown_output_path(output_path)
	return MARKDOWN_ARTIFACT_PATH

func _drive_codex_action(session: Node, executed_steps: Array[Dictionary], snapshots: Array[Dictionary], action_id: String, payload: Dictionary) -> void:
	var result := {
		"actionId": action_id,
		"payload": payload.duplicate(true),
		"accepted": false,
		"reason": "codex_gameplay_action_api_missing"
	}
	if session != null and session.has_method("debug_codex_gameplay_action"):
		var action_result: Variant = session.call("debug_codex_gameplay_action", action_id, payload)
		if action_result is Dictionary:
			result = action_result
	await _settle_frames(2)
	executed_steps.append(result)
	snapshots.append(_snapshot(action_id, session))

func _run_route_probe(packed: PackedScene, plan: Dictionary) -> Dictionary:
	var scene := packed.instantiate()
	root.add_child(scene)
	await _settle_frames(3)

	var session := scene.find_child("PlayableSession", true, false)
	var executed_steps: Array[Dictionary] = []
	var snapshots: Array[Dictionary] = []
	var failures: Array[String] = []
	if session == null or not session.has_method("debug_codex_gameplay_action"):
		failures.append("%s is missing the Codex gameplay action API" % str(plan.get("routeId", "")))
	if session == null or not session.has_method("debug_codex_gameplay_snapshot"):
		failures.append("%s is missing the Codex gameplay snapshot API" % str(plan.get("routeId", "")))
	if failures.is_empty():
		snapshots.append(_snapshot("initial", session))
		for step in plan.get("steps", []):
			if not (step is Dictionary):
				failures.append("%s contains a non-dictionary route step" % str(plan.get("routeId", "")))
				continue
			await _drive_codex_action(session, executed_steps, snapshots, str(step.get("actionId", "")), step.get("payload", {}))

	var final_snapshot := _codex_snapshot(session)
	var final_summary: Dictionary = final_snapshot.get("summary", {})
	var record_props: Dictionary = final_snapshot.get("worldRecordProps", {})
	var hud_snapshot: Dictionary = final_snapshot.get("hud", {})
	var checks := _npc_interaction_checks(final_summary, record_props)
	var report := _route_report_from_current_run(plan, final_summary, hud_snapshot, record_props, executed_steps, checks)
	report["snapshots"] = snapshots
	failures.append_array(_validate_route_report(plan, report, final_summary, record_props, checks))
	report["failures"] = failures
	report["pass"] = failures.is_empty()
	scene.queue_free()
	await _settle_frames(1)
	return report

func _route_report_from_current_run(plan: Dictionary, summary: Dictionary, hud_snapshot: Dictionary, record_props: Dictionary, executed_steps: Array[Dictionary], checks: Dictionary) -> Dictionary:
	var route_id := str(plan.get("routeId", ""))
	var station: Dictionary = summary.get("station", {})
	var record_objects: Dictionary = summary.get("recordObjects", {})
	return {
		"schemaVersion": "codex-route-play-report-v1",
		"routeId": route_id,
		"pass": false,
		"expected": {
			"stage": str(plan.get("expectedStage", "")),
			"routeOutcome": str(plan.get("expectedRouteOutcome", "")),
			"sessionOutcome": str(plan.get("expectedSessionOutcome", ""))
		},
		"acceptedActions": _accepted_action_ids(executed_steps),
		"rejectedActions": _rejected_action_ids(executed_steps),
		"actionPath": _action_path(executed_steps),
		"finalPlayerVisibleState": {
			"stage": summary.get("stage", ""),
			"routeOutcome": summary.get("routeOutcome", ""),
			"sessionOutcome": summary.get("sessionOutcome", ""),
			"suspicion": summary.get("suspicion", 0),
			"reportWeight": summary.get("reportWeight", 0),
			"stationIntakeOpen": station.get("intakeOpen", false),
			"stationInquestOpen": station.get("inquestOpen", false),
			"recordObjects": record_objects,
			"civicEconomy": summary.get("civicEconomy", {}),
			"investigationTrail": hud_snapshot.get("investigationTrailLabel", ""),
			"consequence": hud_snapshot.get("consequenceLabel", ""),
			"outcomeBody": hud_snapshot.get("outcomeBodyLabel", ""),
			"recordState": hud_snapshot.get("recordStateLabel", ""),
			"whyLine": hud_snapshot.get("whyLineLabel", "")
		},
		"playerReadableSummary": _route_player_readable_summary(route_id, summary, hud_snapshot),
		"roleActionExplanation": _role_action_explanation(summary),
		"socialObservationExplanation": _social_observation_explanation(summary),
		"npcInteractionChecks": checks,
		"worldRecordProps": record_props,
		"failures": []
	}

func _validate_route_report(plan: Dictionary, report: Dictionary, summary: Dictionary, record_props: Dictionary, checks: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	var route_id := str(plan.get("routeId", ""))
	var expected_stage := str(plan.get("expectedStage", ""))
	var expected_route := str(plan.get("expectedRouteOutcome", ""))
	var expected_session := str(plan.get("expectedSessionOutcome", ""))
	if not Array(report.get("rejectedActions", [])).is_empty():
		failures.append("%s had rejected public gameplay actions: %s" % [route_id, str(report.get("rejectedActions", []))])
	if str(summary.get("stage", "")) != expected_stage:
		failures.append("%s expected stage %s, got %s" % [route_id, expected_stage, str(summary.get("stage", ""))])
	if str(summary.get("routeOutcome", "")) != expected_route:
		failures.append("%s expected routeOutcome %s, got %s" % [route_id, expected_route, str(summary.get("routeOutcome", ""))])
	if str(summary.get("sessionOutcome", "")) != expected_session:
		failures.append("%s expected sessionOutcome %s, got %s" % [route_id, expected_session, str(summary.get("sessionOutcome", ""))])

	var station: Dictionary = summary.get("station", {})
	var record_objects: Dictionary = summary.get("recordObjects", {})
	match route_id:
		"clean_cover":
			if int(summary.get("reportWeight", -1)) != 0:
				failures.append("clean_cover expected no report weight")
			if bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)):
				failures.append("clean_cover must not open Station intake or inquest")
			if str(record_objects.get("receipt_tray", "")) != "normal":
				failures.append("clean_cover expected normal receipt")
			if not _action_exists(summary, "store_clerk", "create_receipt"):
				failures.append("clean_cover expected Store Clerk receipt creation")
		"repair_recovered":
			if int(summary.get("reportWeight", 0)) > 49:
				failures.append("repair_recovered must stay below report threshold")
			if bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)):
				failures.append("repair_recovered must stay local to the Store")
			if str(record_objects.get("correction_slip", "")) != "attached":
				failures.append("repair_recovered expected attached correction slip")
			if str(record_objects.get("store_queue_mark", "")) != "settled":
				failures.append("repair_recovered expected queue mark to settle after correction")
			if not _action_exists(summary, "store_clerk", "attach_correction"):
				failures.append("repair_recovered expected Store Clerk correction attachment")
			if not _action_exists(summary, "waiting_customer", "accept_repair"):
				failures.append("repair_recovered expected Waiting Customer repair acceptance")
		"soft_report":
			if not bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)):
				failures.append("soft_report must open Station intake but stop before inquest")
			if str(record_objects.get("report_tray", "")) != "pending":
				failures.append("soft_report expected pending report tray")
			if not _action_exists(summary, "store_manager", "place_note"):
				failures.append("soft_report expected Store Manager follow-up note")
			if not _observation_exists(summary, "store_manager", "store_clerk", "place_note", "place_note"):
				failures.append("soft_report expected Manager to act from Clerk note")
		"inquest_opened":
			if not bool(station.get("inquestOpen", false)):
				failures.append("inquest_opened must open Station inquest")
			if int(summary.get("responseHesitationCount", 0)) < 1:
				failures.append("inquest_opened expected response hesitation")
			if not _has_event(summary, "free_input_submitted"):
				failures.append("inquest_opened expected typed player speech")
			if not bool(checks.get("stationOfficerCitedRecord", false)):
				failures.append("inquest_opened expected Station Officer citation")
			if not bool(checks.get("worldPropsReachInquest", false)):
				failures.append("inquest_opened expected inquest world record props")
		_:
			failures.append("Unknown route report id: %s" % route_id)
	return failures

func _validate_route_reports(route_reports: Array[Dictionary]) -> Array[String]:
	var failures: Array[String] = []
	for required_id in REQUIRED_ROUTE_REPORT_IDS:
		var report := _route_report_by_id(route_reports, required_id)
		if report.is_empty():
			failures.append("Codex route reports missing %s" % required_id)
		elif not bool(report.get("pass", false)):
			failures.append("Codex route report failed: %s" % required_id)
	return failures

func _route_report_by_id(route_reports: Array[Dictionary], route_id: String) -> Dictionary:
	for report in route_reports:
		if str(report.get("routeId", "")) == route_id:
			return report
	return {}

func _passed_route_count(route_reports: Array[Dictionary]) -> int:
	var count := 0
	for report in route_reports:
		if bool(report.get("pass", false)):
			count += 1
	return count

func _route_player_readable_summary(route_id: String, summary: Dictionary, hud_snapshot: Dictionary) -> String:
	var state := "%s/%s, suspicion %d, report %d" % [
		str(summary.get("stage", "")),
		str(summary.get("routeOutcome", "")),
		int(summary.get("suspicion", 0)),
		int(summary.get("reportWeight", 0))
	]
	match route_id:
		"clean_cover":
			return "Clean cover: Codex accepted the routine and the Store Clerk closed a normal receipt. %s." % state
		"repair_recovered":
			return "Repair recovery: Codex admitted uncertainty, accepted the Clerk premise, the correction slip attached, and the waiting customer let the queue settle. %s." % state
		"soft_report":
			return "Soft report: Codex broke routine twice, causing a pending Store report and Manager follow-up without opening inquest. %s." % state
		"inquest_opened":
			return "Inquest: Codex hesitated, chose the risky line, typed dream-language speech, and the Station cited the Store record. %s. %s" % [state, _one_line(hud_snapshot.get("consequenceLabel", ""))]
		_:
			return "Route %s ended at %s." % [route_id, state]

func _snapshot(label: String, session: Node) -> Dictionary:
	var codex_snapshot := _codex_snapshot(session)
	var summary: Dictionary = codex_snapshot.get("summary", {})
	return {
		"label": label,
		"summary": _small_summary(summary),
		"availableChoices": summary.get("conversation", {}).get("availableChoices", []),
		"recordObjects": summary.get("recordObjects", {}),
		"civicEconomy": summary.get("civicEconomy", {}),
		"latestLedger": _latest_ledger(summary),
		"worldRecordProps": codex_snapshot.get("worldRecordProps", {}),
		"hud": codex_snapshot.get("hud", {})
	}

func _small_summary(summary: Dictionary) -> Dictionary:
	return {
		"stage": summary.get("stage", ""),
		"sessionOutcome": summary.get("sessionOutcome", ""),
		"routeOutcome": summary.get("routeOutcome", ""),
		"suspicion": summary.get("suspicion", 0),
		"reportWeight": summary.get("reportWeight", 0),
		"responseHesitationCount": summary.get("responseHesitationCount", 0),
		"lastDialogueChoice": summary.get("lastDialogueChoice", ""),
		"lastReasonCode": summary.get("lastReasonCode", ""),
		"inputLocked": summary.get("inputLocked", false)
	}

func _validate_probe(summary: Dictionary, hud_snapshot: Dictionary, record_props: Dictionary, checks: Dictionary, executed_steps: Array[Dictionary]) -> Array[String]:
	var failures: Array[String] = []
	for step in executed_steps:
		if not bool(step.get("accepted", false)):
			failures.append("Codex gameplay action rejected: %s (%s)" % [str(step.get("actionId", "")), str(step.get("reason", ""))])
	if str(summary.get("stage", "")) != "inquest":
		failures.append("Expected player input path to reach Station inquest stage")
	if int(summary.get("responseHesitationCount", 0)) < 1:
		failures.append("Expected Codex-driven wait action to create a response hesitation record")
	if not _has_event(summary, "free_input_submitted"):
		failures.append("Expected typed player input to be recorded as free_input_submitted")
	if not str(hud_snapshot.get("investigationTrailLabel", "")).contains("스테이션 직원"):
		failures.append("HUD investigation trail does not name the Station examiner")
	var consequence_label := str(hud_snapshot.get("consequenceLabel", ""))
	if not consequence_label.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용"):
		failures.append("HUD consequence line does not show the speech/delay-to-record-to-Station citation chain")
	if not bool(checks.get("storeClerkMarkedReceipt", false)):
		failures.append("Store Clerk did not mark a receipt from the player line")
	if not bool(checks.get("storeClerkPlacedNote", false)):
		failures.append("Store Clerk did not place a report note from the player line")
	if not bool(checks.get("storeManagerForwardedReport", false)):
		failures.append("Store Manager did not forward a prior Store record")
	if not bool(checks.get("waitingCustomerReacted", false)):
		failures.append("Waiting Customer did not react to the clerk record")
	if not bool(checks.get("parkWitnessReacted", false)):
		failures.append("Park Witness did not turn the clerk record into a public notice")
	if not bool(checks.get("stationOfficerCitedRecord", false)):
		failures.append("Station Officer did not cite a Store record")
	if not bool(checks.get("managerObservedClerk", false)):
		failures.append("Store Manager did not observe the clerk record before acting")
	if not bool(checks.get("waitingCustomerObservedClerk", false)):
		failures.append("Waiting Customer did not observe the clerk record before acting")
	if not bool(checks.get("parkWitnessObservedClerk", false)):
		failures.append("Park Witness did not observe the clerk record before acting")
	if not bool(checks.get("stationObservedManager", false)):
		failures.append("Station Officer did not observe the manager record before acting")
	if not bool(checks.get("stationCitedExactLedger", false)):
		failures.append("Station citation did not point at civic-ledger-5")
	if not bool(checks.get("economyPanelReadable", false)):
		failures.append("Civic economy panel is not readable with credit/trust/burden/attention")
	if not bool(checks.get("worldPropsReachInquest", false)):
		failures.append("World record props do not show forwarded report and cited Station dossier")
	return failures

func _npc_interaction_checks(summary: Dictionary, record_props: Dictionary) -> Dictionary:
	var latest_ledger := _latest_ledger(summary)
	return {
		"storeClerkMarkedReceipt": _action_exists(summary, "store_clerk", "mark_receipt"),
		"storeClerkPlacedNote": _action_exists(summary, "store_clerk", "place_note"),
		"waitingCustomerReacted": _action_exists(summary, "waiting_customer", "complain_delay"),
		"parkWitnessReacted": _action_exists(summary, "park_witness", "post_rumor"),
		"storeManagerForwardedReport": _action_exists(summary, "store_manager", "forward_report"),
		"stationOfficerCitedRecord": _action_exists(summary, "station_officer", "cite_record"),
		"waitingCustomerObservedClerk": _observation_exists(summary, "waiting_customer", "store_clerk", "place_note", "complain_delay"),
		"parkWitnessObservedClerk": _observation_exists(summary, "park_witness", "store_clerk", "place_note", "post_rumor"),
		"managerObservedClerk": _observation_exists(summary, "store_manager", "store_clerk", "place_note", "forward_report"),
		"stationObservedManager": _observation_exists(summary, "station_officer", "store_manager", "forward_report", "cite_record"),
		"stationCitedExactLedger": str(latest_ledger.get("citedLedgerEventId", "")) == "civic-ledger-5",
		"economyPanelReadable": _economy_panel_readable(record_props),
		"worldPropsReachInquest": _world_props_reach_inquest(record_props),
		"latestLedger": latest_ledger
	}

func _ai_player_report(summary: Dictionary, hud_snapshot: Dictionary, record_props: Dictionary, checks: Dictionary, executed_steps: Array[Dictionary]) -> Dictionary:
	var accepted_actions := _accepted_action_ids(executed_steps)
	var rejected_actions := _rejected_action_ids(executed_steps)
	var latest_ledger := _latest_ledger(summary)
	var consequence_label := str(hud_snapshot.get("consequenceLabel", ""))
	var outcome_body := str(hud_snapshot.get("outcomeBodyLabel", ""))
	var investigation_trail := str(hud_snapshot.get("investigationTrailLabel", ""))
	var economy_panel: Dictionary = record_props.get("civic_economy_panel", {})
	var explainability_checks := {
		"codexPlayedThroughPublicActions": accepted_actions.size() == PROBE_STEPS.size() and rejected_actions.is_empty(),
		"canReadExaminedPlayerRole": investigation_trail.contains("대상: 플레이어") or investigation_trail.to_lower().contains("player"),
		"canReadInputToRecordChain": consequence_label.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용"),
		"canReadNpcToNpcChain": bool(checks.get("waitingCustomerObservedClerk", false)) and bool(checks.get("parkWitnessObservedClerk", false)) and bool(checks.get("managerObservedClerk", false)) and bool(checks.get("stationObservedManager", false)),
		"canReadExactStationCitation": str(latest_ledger.get("citedLedgerEventId", "")) == "civic-ledger-5",
		"canReadCivicEconomyPressure": bool(checks.get("economyPanelReadable", false)),
		"canReadFinalOutcome": str(summary.get("stage", "")) == "inquest" and outcome_body.contains("심문"),
		"notHumanEvidence": true
	}
	return {
		"schemaVersion": "codex-ai-play-report-v1",
		"pass": _all_values_true(explainability_checks),
		"purpose": "Readable AI-play report: what Codex did as the player, what changed in the running scene, and what a human still has to verify.",
		"notAReplacementForExternalComprehension": true,
		"acceptedActions": accepted_actions,
		"rejectedActions": rejected_actions,
		"actionPath": _action_path(executed_steps),
		"finalPlayerVisibleState": {
			"stage": summary.get("stage", ""),
			"routeOutcome": summary.get("routeOutcome", ""),
			"sessionOutcome": summary.get("sessionOutcome", ""),
			"suspicion": summary.get("suspicion", 0),
			"reportWeight": summary.get("reportWeight", 0),
			"investigationTrail": investigation_trail,
			"consequence": consequence_label,
			"outcomeBody": outcome_body,
			"recordState": hud_snapshot.get("recordStateLabel", ""),
			"whyLine": hud_snapshot.get("whyLineLabel", ""),
			"civicEconomyPanel": economy_panel.get("label", "")
		},
		"playerReadableCauseChain": [
			"Codex/player focused the Store counter and started the Store Clerk prompt.",
			"Codex/player waited long enough to create a response hesitation record.",
			"Codex/player chose the risky 'first time here' line, causing the Store Clerk to mark the receipt.",
			"Codex/player typed a dream-language line, causing a Store report, waiting-customer queue reaction, Park notice, Manager forwarding, and Station citation.",
			"The Station Officer cited civic-ledger-5 in civic-ledger-6 before opening inquest."
		],
		"roleActionExplanation": _role_action_explanation(summary),
		"socialObservationExplanation": _social_observation_explanation(summary),
		"humanTesterBoundary": "This proves Codex can play and inspect the current build. It does not prove fresh players understood it; external notes remain required.",
		"explainabilityChecks": explainability_checks
	}

func _validate_ai_player_report(report: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	if not bool(report.get("pass", false)):
		failures.append("AI-play report is not explainable enough for Codex gameplay QA")
	if Array(report.get("acceptedActions", [])).size() < PROBE_STEPS.size():
		failures.append("AI-play report did not record all accepted public gameplay actions")
	if Array(report.get("playerReadableCauseChain", [])).size() < 5:
		failures.append("AI-play report does not contain a readable player cause chain")
	if str(report.get("humanTesterBoundary", "")).is_empty():
		failures.append("AI-play report does not state the external human comprehension boundary")
	return failures

func _markdown_report(artifact: Dictionary) -> String:
	var report: Dictionary = artifact.get("aiPlayerReport", {})
	var final_state: Dictionary = report.get("finalPlayerVisibleState", {})
	var lines := PackedStringArray()
	lines.append("# Codex Gameplay QA Report")
	lines.append("")
	lines.append("- JSON artifact: `%s`" % str(artifact.get("artifactPath", "")))
	lines.append("- Scope: %s" % str(artifact.get("scope", "")))
	lines.append("- Pass: `%s`" % str(report.get("pass", false)))
	lines.append("- Human evidence: `false`")
	lines.append("- Boundary: %s" % str(report.get("humanTesterBoundary", "")))
	lines.append("")
	lines.append("## Action Path")
	lines.append("")
	for action in report.get("actionPath", []):
		lines.append("- %s" % str(action))
	lines.append("")
	lines.append("## Player-Readable Cause Chain")
	lines.append("")
	for cause in report.get("playerReadableCauseChain", []):
		lines.append("- %s" % str(cause))
	lines.append("")
	lines.append("## Final Player-Visible State")
	lines.append("")
	lines.append("- Stage: `%s`" % str(final_state.get("stage", "")))
	lines.append("- Outcome: `%s` / `%s`" % [str(final_state.get("routeOutcome", "")), str(final_state.get("sessionOutcome", ""))])
	lines.append("- Suspicion/report: `%s` / `%s`" % [str(final_state.get("suspicion", "")), str(final_state.get("reportWeight", ""))])
	lines.append("- Investigation trail: %s" % _one_line(final_state.get("investigationTrail", "")))
	lines.append("- Consequence: %s" % _one_line(final_state.get("consequence", "")))
	lines.append("- Civic economy: %s" % _one_line(final_state.get("civicEconomyPanel", "")))
	lines.append("- Why-line: %s" % _one_line(final_state.get("whyLine", "")))
	lines.append("")
	lines.append("## Route Outcomes")
	lines.append("")
	for route in artifact.get("routeReports", []):
		if not (route is Dictionary):
			continue
		var route_state: Dictionary = route.get("finalPlayerVisibleState", {})
		lines.append("- `%s`: pass `%s`, stage `%s`, outcome `%s`, suspicion/report `%s/%s`" % [
			str(route.get("routeId", "")),
			str(route.get("pass", false)),
			str(route_state.get("stage", "")),
			str(route_state.get("routeOutcome", "")),
			str(route_state.get("suspicion", "")),
			str(route_state.get("reportWeight", ""))
		])
		lines.append("  - %s" % _one_line(route.get("playerReadableSummary", "")))
	lines.append("")
	lines.append("## Role Actions")
	lines.append("")
	for explanation in report.get("roleActionExplanation", []):
		lines.append("- %s" % str(explanation))
	lines.append("")
	lines.append("## NPC-To-NPC Observations")
	lines.append("")
	for explanation in report.get("socialObservationExplanation", []):
		lines.append("- %s" % str(explanation))
	lines.append("")
	lines.append("## Explainability Checks")
	lines.append("")
	var checks: Dictionary = report.get("explainabilityChecks", {})
	for key in checks.keys():
		lines.append("- `%s`: `%s`" % [str(key), str(checks.get(key, false))])
	lines.append("")
	lines.append("## Product Boundary")
	lines.append("")
	lines.append("This report proves Codex can play and inspect the active build through public gameplay APIs. It does not prove fresh-player comprehension; external notes remain required.")
	lines.append("")
	return "\n".join(lines)

func _one_line(value: Variant) -> String:
	return str(value).replace("\n", " / ").strip_edges()

func _accepted_action_ids(executed_steps: Array[Dictionary]) -> Array[String]:
	var ids: Array[String] = []
	for step in executed_steps:
		if bool(step.get("accepted", false)):
			ids.append(str(step.get("actionId", "")))
	return ids

func _rejected_action_ids(executed_steps: Array[Dictionary]) -> Array[String]:
	var ids: Array[String] = []
	for step in executed_steps:
		if not bool(step.get("accepted", false)):
			ids.append(str(step.get("actionId", "")))
	return ids

func _action_path(executed_steps: Array[Dictionary]) -> Array[String]:
	var path: Array[String] = []
	for step in executed_steps:
		var action_id := str(step.get("actionId", ""))
		path.append("%s -> %s" % [action_id, _action_player_meaning(action_id, step.get("payload", {}))])
	return path

func _action_player_meaning(action_id: String, payload: Dictionary) -> String:
	match action_id:
		"focus.store_counter":
			return "look at the Store counter"
		"conversation.start":
			return "start the clerk's Same Order question"
		"player.wait.hesitation_record":
			return "let hesitation become a record"
		"dialogue.choice.by_id":
			return "choose dialogue id %s" % str(payload.get("choiceId", ""))
		"dialogue.choice.by_index":
			return "choose dialogue index %d" % int(payload.get("index", -1))
		"player.type.free_input":
			return "type player speech: %s" % str(payload.get("line", ""))
		_:
			return "unsupported or unknown player action"

func _role_action_explanation(summary: Dictionary) -> Array[String]:
	var explanations: Array[String] = []
	for action in summary.get("agentActionLog", []):
		if not (action is Dictionary):
			continue
		explanations.append("%s used %s on %s -> %s" % [
			str(action.get("actorRole", "")),
			str(action.get("affordance", "")),
			str(action.get("objectId", "")),
			str(action.get("ledgerEventId", ""))
		])
	return explanations

func _social_observation_explanation(summary: Dictionary) -> Array[String]:
	var explanations: Array[String] = []
	for observation in summary.get("socialObservationTrace", []):
		if not (observation is Dictionary):
			continue
		explanations.append("%s saw %s %s at %s, then chose %s" % [
			str(observation.get("observerRole", "")),
			str(observation.get("observedActorRole", "")),
			str(observation.get("observedAffordance", "")),
			str(observation.get("observedLedgerEventId", "")),
			str(observation.get("resultingAffordance", ""))
		])
	return explanations

func _all_values_true(values: Dictionary) -> bool:
	for key in values.keys():
		if not bool(values.get(key, false)):
			return false
	return true

func _action_exists(summary: Dictionary, actor_role: String, affordance: String) -> bool:
	for action in summary.get("agentActionLog", []):
		if not (action is Dictionary):
			continue
		if str(action.get("actorRole", "")) == actor_role and str(action.get("affordance", "")) == affordance:
			return true
	return false

func _observation_exists(summary: Dictionary, observer_role: String, observed_role: String, observed_affordance: String, resulting_affordance: String) -> bool:
	for observation in summary.get("socialObservationTrace", []):
		if not (observation is Dictionary):
			continue
		if (
			str(observation.get("observerRole", "")) == observer_role
			and str(observation.get("observedActorRole", "")) == observed_role
			and str(observation.get("observedAffordance", "")) == observed_affordance
			and str(observation.get("resultingAffordance", "")) == resulting_affordance
		):
			return true
	return false

func _economy_panel_readable(record_props: Dictionary) -> bool:
	var panel: Dictionary = record_props.get("civic_economy_panel", {})
	var label := str(panel.get("label", ""))
	return (
		bool(panel.get("visible", false))
		and str(panel.get("state", "")) == "attention"
		and label.contains("잔액")
		and label.contains("신뢰")
		and label.contains("부담")
		and label.contains("주목")
	)

func _world_props_reach_inquest(record_props: Dictionary) -> bool:
	return (
		str(record_props.get("report_tray", {}).get("state", "")) == "forwarded"
		and str(record_props.get("park_notice_board", {}).get("state", "")) == "rumored"
		and str(record_props.get("station_dossier", {}).get("state", "")) == "cited"
		and str(record_props.get("civic_ledger", {}).get("state", "")) == "append_only"
	)

func _latest_ledger(summary: Dictionary) -> Dictionary:
	var ledger: Array = summary.get("civicLedger", [])
	if ledger.is_empty():
		return {}
	var latest: Variant = ledger[ledger.size() - 1]
	if latest is Dictionary:
		return latest
	return {}

func _has_event(summary: Dictionary, event_name: String) -> bool:
	for event in summary.get("events", []):
		if event is Dictionary and str(event.get("eventName", "")) == event_name:
			return true
	return false

func _build_summary(session: Node) -> Dictionary:
	if session != null and session.has_method("build_summary"):
		var summary: Variant = session.call("build_summary")
		if summary is Dictionary:
			return summary
	return {}

func _codex_snapshot(session: Node) -> Dictionary:
	if session != null and session.has_method("debug_codex_gameplay_snapshot"):
		var snapshot: Variant = session.call("debug_codex_gameplay_snapshot")
		if snapshot is Dictionary:
			return snapshot
	return {"summary": _build_summary(session), "worldRecordProps": {}, "hud": {}, "actionCatalog": []}

func _action_catalog(session: Node) -> Array:
	if session != null and session.has_method("debug_codex_gameplay_action_catalog"):
		var catalog: Variant = session.call("debug_codex_gameplay_action_catalog")
		if catalog is Array:
			return catalog
	return []

func _settle_frames(count: int) -> void:
	for _index in range(count):
		await process_frame

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
