extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json"
const ARTIFACT_PATH := "data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.json"
const MARKDOWN_ARTIFACT_PATH := "data/evidence/godot/codex-gameplay-probe/dre_171_codex_gameplay_probe.md"
const OUTPUT_ENV := "DREAM_OF_ONE_CODEX_GAMEPLAY_PROBE_OUTPUT"
const TYPED_LINE := "저는 이 꿈에 방금 들어왔어요."
const PROBE_STEPS := [
	{"actionId": "focus.world_record_prop", "payload": {"objectId": "usual_order_cue"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.text_surface", "payload": {"surfaceId": "TS_Studio_ApprovalCriteria"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.text_surface", "payload": {"surfaceId": "TS_Park_NoticeBoard"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.store_counter", "payload": {}},
	{"actionId": "conversation.start", "payload": {}},
	{"actionId": "player.wait.hesitation_record", "payload": {}},
	{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.risky"}},
	{"actionId": "player.type.free_input", "payload": {"line": TYPED_LINE}},
	{"actionId": "focus.npc", "payload": {"npcId": "NPC_Store_Clerk"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.npc", "payload": {"npcId": "NPC_Store_Manager"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.world_record_prop", "payload": {"objectId": "park_notice_board"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.npc", "payload": {"npcId": "NPC_Park_Witness"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.world_record_prop", "payload": {"objectId": "studio_review_queue"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.world_record_prop", "payload": {"objectId": "civic_economy_panel"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.world_record_prop", "payload": {"objectId": "civic_ledger"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.npc", "payload": {"npcId": "NPC_Station_Officer"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.npc", "payload": {"npcId": "NPC_Studio_PM"}},
	{"actionId": "player.interact.focused", "payload": {}},
	{"actionId": "focus.npc", "payload": {"npcId": "NPC_Waiting_Customer"}},
	{"actionId": "player.interact.focused", "payload": {}}
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
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.safe"}},
			{"actionId": "focus.world_record_prop", "payload": {"objectId": "studio_review_queue"}},
			{"actionId": "player.interact.focused", "payload": {}},
			{"actionId": "focus.npc", "payload": {"npcId": "NPC_Studio_PM"}},
			{"actionId": "player.interact.focused", "payload": {}}
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
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.safe"}},
			{"actionId": "focus.world_record_prop", "payload": {"objectId": "park_notice_board"}},
			{"actionId": "player.interact.focused", "payload": {}},
			{"actionId": "focus.world_record_prop", "payload": {"objectId": "studio_review_queue"}},
			{"actionId": "player.interact.focused", "payload": {}},
			{"actionId": "focus.npc", "payload": {"npcId": "NPC_Studio_PM"}},
			{"actionId": "player.interact.focused", "payload": {}}
		]
	},
	{
		"routeId": "cover_held_under_suspicion",
		"expectedStage": "uneasy",
		"expectedRouteOutcome": "cover_held_under_suspicion",
		"expectedSessionOutcome": "cover_held",
		"steps": [
			{"actionId": "focus.store_counter", "payload": {}},
			{"actionId": "conversation.start", "payload": {}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.risky"}},
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.safe"}},
			{"actionId": "focus.world_record_prop", "payload": {"objectId": "studio_review_queue"}},
			{"actionId": "player.interact.focused", "payload": {}},
			{"actionId": "focus.npc", "payload": {"npcId": "NPC_Studio_PM"}},
			{"actionId": "player.interact.focused", "payload": {}}
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
			{"actionId": "dialogue.choice.by_id", "payload": {"choiceId": "store.same_order.probe.risky"}},
			{"actionId": "focus.npc", "payload": {"npcId": "NPC_Store_Manager"}},
			{"actionId": "player.interact.focused", "payload": {}}
		]
	}
]
const REQUIRED_ROUTE_REPORT_IDS := ["clean_cover", "repair_recovered", "cover_held_under_suspicion", "soft_report", "inquest_opened"]

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
	var provider_packet_memory_probe := _provider_packet_memory_probe(session)
	var checks := _npc_interaction_checks(final_summary, record_props, snapshots)
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
	failures.append_array(_validate_provider_packet_memory_probe(provider_packet_memory_probe))

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
			"actorMemory": final_summary.get("actorMemory", {}),
			"worldRecordProps": record_props,
			"inspectedNpcState": final_summary.get("inspectedNpcState", {}),
			"hud": hud_snapshot
		},
		"providerPacketMemoryProbe": provider_packet_memory_probe,
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

func _provider_packet_memory_probe(session: Node) -> Dictionary:
	if session == null or not session.has_method("debug_live_provider_packet"):
		return {
			"pass": false,
			"reason": "debug_live_provider_packet_missing"
		}
	var packet: Variant = session.call(
		"debug_live_provider_packet",
		"codex-gameplay-provider-memory-probe",
		"NPC_Waiting_Customer",
		[]
	)
	if not packet is Dictionary:
		return {
			"pass": false,
			"reason": "provider_packet_not_dictionary"
		}
	var provider_packet: Dictionary = packet
	var organization_context: Dictionary = provider_packet.get("organizationContext", {})
	var actor_memory: Dictionary = organization_context.get("actorMemory", {})
	var actor_policy: Dictionary = organization_context.get("actorPolicy", {})
	var visible_environment_objects: Array = organization_context.get("visibleEnvironmentObjects", [])
	var probe_pass := (
		str(provider_packet.get("npcId", "")) == "NPC_Waiting_Customer"
		and str(actor_memory.get("actorRole", "")) == "waiting_customer"
		and _actor_memory_has_observation(actor_memory, "station_officer", "cite_record", "refuse_contact")
		and _actor_memory_has_own_action(actor_memory, "refuse_contact")
		and Array(actor_policy.get("stableGoals", [])).has("keep_queue_moving")
		and Array(actor_policy.get("priorityShifts", [])).has("station_citation_can_unlock_refusal")
		and Array(actor_policy.get("forbiddenClaims", [])).has("do_not_infer_private_player_intent")
		and _visible_environment_objects_have_civic_economy(visible_environment_objects, true)
	)
	return {
		"pass": probe_pass,
		"npcId": str(provider_packet.get("npcId", "")),
		"role": str(organization_context.get("role", "")),
		"providerJobId": str(organization_context.get("providerJobId", "")),
		"actorMemory": actor_memory,
		"actorPolicy": actor_policy,
		"environmentToolCount": Array(organization_context.get("environmentToolCatalog", [])).size(),
		"visibleEnvironmentObjectIds": _visible_environment_object_ids(visible_environment_objects),
		"recentEvents": provider_packet.get("recentEvents", [])
	}

func _validate_provider_packet_memory_probe(probe: Dictionary) -> Array[String]:
	if bool(probe.get("pass", false)):
		return []
	return ["Provider packet memory probe failed: %s" % str(probe)]

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
	var checks := _npc_interaction_checks(final_summary, record_props, snapshots)
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
			"visibleNpcStates": summary.get("visibleNpcStates", {}),
			"investigationTrail": hud_snapshot.get("investigationTrailLabel", ""),
			"consequence": hud_snapshot.get("consequenceLabel", ""),
			"outcomeBody": hud_snapshot.get("outcomeBodyLabel", ""),
			"recordState": hud_snapshot.get("recordStateLabel", ""),
			"whyLine": hud_snapshot.get("whyLineLabel", ""),
			"notice": "%s / %s" % [str(hud_snapshot.get("noticeTitleLabel", "")), _one_line(hud_snapshot.get("noticeBodyLabel", ""))],
			"inspectedWorldRecordProp": summary.get("inspectedWorldRecordProp", {}),
			"inspectedNpcState": summary.get("inspectedNpcState", {})
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
			if str(record_objects.get("store_queue_mark", "")) != "helped":
				failures.append("clean_cover expected queue mark to show help after public trust")
			if str(record_objects.get("park_notice_board", "")) != "vouched":
				failures.append("clean_cover expected public routine vouch")
			if not _action_exists(summary, "store_clerk", "create_receipt"):
				failures.append("clean_cover expected Store Clerk receipt creation")
			if not _action_exists(summary, "waiting_customer", "accept_routine"):
				failures.append("clean_cover expected Waiting Customer routine acceptance")
			if not _action_exists(summary, "park_witness", "vouch_routine"):
				failures.append("clean_cover expected Park Witness routine vouch")
			if not _action_exists(summary, "waiting_customer", "share_local_tip"):
				failures.append("clean_cover expected Waiting Customer local tip after public vouch")
			if not _visible_waiting_customer_reaction(summary, "helped", "도움"):
				failures.append("clean_cover expected visible Waiting Customer help reaction")
			if not _action_perceives(summary, "waiting_customer", "share_local_tip", "park_notice_board"):
				failures.append("clean_cover expected Waiting Customer to perceive public notice board before sharing a tip")
			if str(record_objects.get("studio_review_queue", "")) != "invited":
				failures.append("clean_cover expected Studio review queue to open after public vouch")
			if not _action_exists(summary, "studio_pm", "invite_review"):
				failures.append("clean_cover expected Studio PM invite_review after public vouch")
			if not _action_perceives(summary, "studio_pm", "invite_review", "studio_review_queue"):
				failures.append("clean_cover expected Studio PM to perceive review queue before inviting review")
			if not _action_perceives(summary, "studio_pm", "invite_review", "park_notice_board"):
				failures.append("clean_cover expected Studio PM to perceive public notice board before inviting review")
			if not _inspected_studio_review_invite(summary):
				failures.append("clean_cover expected Codex/player to inspect the invited Studio review queue")
			if not _visible_studio_pm_invitation(summary):
				failures.append("clean_cover expected visible Studio PM invitation reaction")
			if not _inspected_studio_pm_invitation(summary):
				failures.append("clean_cover expected Codex/player to inspect Studio PM opportunity opening")
			if not _visible_park_witness_reaction(summary, "vouched", "공개"):
				failures.append("clean_cover expected visible Park Witness public vouch reaction")
			if not _observation_exists(summary, "park_witness", "waiting_customer", "accept_routine", "vouch_routine"):
				failures.append("clean_cover expected Park Witness to read routine queue record")
			if not _observation_exists(summary, "waiting_customer", "park_witness", "vouch_routine", "share_local_tip"):
				failures.append("clean_cover expected Waiting Customer to read public vouch before sharing a tip")
			if not _observation_exists(summary, "studio_pm", "park_witness", "vouch_routine", "invite_review"):
				failures.append("clean_cover expected Studio PM to read public vouch before inviting review")
		"repair_recovered":
			if int(summary.get("reportWeight", 0)) > 49:
				failures.append("repair_recovered must stay below report threshold")
			if bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)):
				failures.append("repair_recovered must stay local to the Store")
			if str(record_objects.get("correction_slip", "")) != "attached":
				failures.append("repair_recovered expected attached correction slip")
			if str(record_objects.get("store_queue_mark", "")) != "settled":
				failures.append("repair_recovered expected queue mark to settle after correction")
			if str(record_objects.get("park_notice_board", "")) != "repaired":
				failures.append("repair_recovered expected public repair notice on Park board")
			if str(record_objects.get("studio_review_queue", "")) != "conditional":
				failures.append("repair_recovered expected Studio review queue to stay conditional after public repair")
			if not _action_exists(summary, "store_clerk", "attach_correction"):
				failures.append("repair_recovered expected Store Clerk correction attachment")
			if not _action_exists(summary, "waiting_customer", "accept_repair"):
				failures.append("repair_recovered expected Waiting Customer repair acceptance")
			if not _visible_waiting_customer_reaction(summary, "repair_accepted", "수습"):
				failures.append("repair_recovered expected visible Waiting Customer repair acceptance")
			if not _action_exists(summary, "park_witness", "post_repair_notice"):
				failures.append("repair_recovered expected Park Witness repair notice")
			if not _visible_park_witness_reaction(summary, "repaired", "수습"):
				failures.append("repair_recovered expected visible Park Witness repair-post reaction")
			if not _action_exists(summary, "studio_pm", "offer_conditional_review"):
				failures.append("repair_recovered expected Studio PM conditional review after public repair")
			if not _action_perceives(summary, "studio_pm", "offer_conditional_review", "park_notice_board"):
				failures.append("repair_recovered expected Studio PM to perceive public repair notice")
			if not _action_perceives(summary, "studio_pm", "offer_conditional_review", "studio_review_queue"):
				failures.append("repair_recovered expected Studio PM to perceive Studio review queue")
			if not _visible_studio_pm_conditional(summary):
				failures.append("repair_recovered expected visible Studio PM conditional review reaction")
			if not _inspected_studio_pm_conditional(summary):
				failures.append("repair_recovered expected Codex/player to inspect Studio PM conditional opportunity")
			if not _observation_exists(summary, "park_witness", "store_clerk", "attach_correction", "post_repair_notice"):
				failures.append("repair_recovered expected Park Witness to read the correction record")
			if not _observation_exists(summary, "studio_pm", "park_witness", "post_repair_notice", "offer_conditional_review"):
				failures.append("repair_recovered expected Studio PM to read public repair notice")
			var consequence_label := str(report.get("finalPlayerVisibleState", {}).get("consequence", ""))
			if not consequence_label.contains("정정표") or not consequence_label.contains("대기줄 수습") or not consequence_label.contains("공개 수습 게시") or not consequence_label.contains("조건부 리뷰"):
				failures.append("repair_recovered expected HUD consequence chain to show correction slip, queue repair, public repair notice, and conditional review")
			if not _inspected_public_repair_notice(summary):
				failures.append("repair_recovered expected Codex/player to inspect the public repair notice")
			if not _inspected_studio_review_conditional(summary):
				failures.append("repair_recovered expected Codex/player to inspect the conditional Studio review queue")
		"cover_held_under_suspicion":
			if int(summary.get("reportWeight", 0)) > 49:
				failures.append("cover_held_under_suspicion must stay below report threshold")
			if bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)):
				failures.append("cover_held_under_suspicion must stay local without Station intake")
			if str(record_objects.get("receipt_tray", "")) != "marked":
				failures.append("cover_held_under_suspicion expected marked receipt")
			if str(record_objects.get("store_queue_mark", "")) != "distanced":
				failures.append("cover_held_under_suspicion expected queue mark to show distance after public warning")
			if str(record_objects.get("park_notice_board", "")) != "warned":
				failures.append("cover_held_under_suspicion expected public warning notice")
			if str(record_objects.get("studio_review_queue", "")) != "deferred":
				failures.append("cover_held_under_suspicion expected Studio review queue to defer after public warning")
			if not _action_exists(summary, "store_clerk", "mark_receipt"):
				failures.append("cover_held_under_suspicion expected Store Clerk marked receipt")
			if not _action_exists(summary, "waiting_customer", "note_wary"):
				failures.append("cover_held_under_suspicion expected Waiting Customer wary note")
			if not _action_exists(summary, "park_witness", "post_warning"):
				failures.append("cover_held_under_suspicion expected Park Witness public warning")
			if not _visible_park_witness_reaction(summary, "warned", "경고"):
				failures.append("cover_held_under_suspicion expected visible Park Witness warning reaction")
			if not _action_exists(summary, "waiting_customer", "keep_distance"):
				failures.append("cover_held_under_suspicion expected Waiting Customer distance after warning")
			if not _visible_waiting_customer_reaction(summary, "distanced", "거리"):
				failures.append("cover_held_under_suspicion expected visible Waiting Customer distance reaction")
			if not _action_perceives(summary, "waiting_customer", "keep_distance", "park_notice_board"):
				failures.append("cover_held_under_suspicion expected Waiting Customer to perceive public notice board before keeping distance")
			if not _action_exists(summary, "studio_pm", "defer_review"):
				failures.append("cover_held_under_suspicion expected Studio PM defer_review after public warning")
			if not _action_perceives(summary, "studio_pm", "defer_review", "park_notice_board"):
				failures.append("cover_held_under_suspicion expected Studio PM to perceive public notice board before deferring review")
			if not _action_perceives(summary, "studio_pm", "defer_review", "studio_review_queue"):
				failures.append("cover_held_under_suspicion expected Studio PM to perceive review queue before deferring review")
			if not _visible_studio_pm_deferral(summary):
				failures.append("cover_held_under_suspicion expected visible Studio PM review deferral reaction")
			if not _inspected_studio_pm_deferral(summary):
				failures.append("cover_held_under_suspicion expected Codex/player to inspect Studio PM opportunity deferral")
			if not _inspected_studio_review_deferral(summary):
				failures.append("cover_held_under_suspicion expected Codex/player to inspect deferred Studio review queue")
			if not _observation_exists(summary, "waiting_customer", "store_clerk", "mark_receipt", "note_wary"):
				failures.append("cover_held_under_suspicion expected Waiting Customer to read marked receipt")
			if not _observation_exists(summary, "park_witness", "waiting_customer", "note_wary", "post_warning"):
				failures.append("cover_held_under_suspicion expected Park Witness to read wary queue note")
			if not _observation_exists(summary, "waiting_customer", "park_witness", "post_warning", "keep_distance"):
				failures.append("cover_held_under_suspicion expected Waiting Customer to read public warning before keeping distance")
			if not _observation_exists(summary, "studio_pm", "park_witness", "post_warning", "defer_review"):
				failures.append("cover_held_under_suspicion expected Studio PM to read public warning before deferring review")
		"soft_report":
			if not bool(station.get("intakeOpen", false)) or bool(station.get("inquestOpen", false)):
				failures.append("soft_report must open Station intake but stop before inquest")
			if str(record_objects.get("report_tray", "")) != "pending":
				failures.append("soft_report expected pending report tray")
			if str(record_objects.get("store_counter", "")) != "paused":
				failures.append("soft_report expected counter service to pause")
			if str(record_objects.get("store_queue_mark", "")) != "empty":
				failures.append("soft_report expected waiting customer to leave paused service")
			if not _action_exists(summary, "store_manager", "place_note"):
				failures.append("soft_report expected Store Manager follow-up note")
			if not _action_exists(summary, "store_manager", "pause_service"):
				failures.append("soft_report expected Store Manager pause_service action")
			if not _action_exists(summary, "waiting_customer", "leave_queue"):
				failures.append("soft_report expected Waiting Customer leave_queue action")
			if not _visible_waiting_customer_reaction(summary, "left", "이탈"):
				failures.append("soft_report expected visible Waiting Customer queue-exit reaction")
			if not _visible_park_witness_reaction(summary, "rumored", "소문"):
				failures.append("soft_report expected visible Park Witness rumor-post reaction")
			if not _visible_store_manager_reaction(summary, "paused", "중단"):
				failures.append("soft_report expected visible Store Manager service-pause reaction")
			if not _inspected_store_manager_service_pause(summary):
				failures.append("soft_report expected Codex/player to inspect Store Manager service-pause handoff")
			var consequence_label := str(report.get("finalPlayerVisibleState", {}).get("consequence", ""))
			if not consequence_label.contains("공원 게시") or not consequence_label.contains("응대 중단") or not consequence_label.contains("줄 이탈"):
				failures.append("soft_report expected HUD consequence chain to show public rumor, service pause, and queue exit")
			if not _observation_exists(summary, "store_manager", "store_clerk", "place_note", "place_note"):
				failures.append("soft_report expected Manager to act from Clerk note")
			if not _observation_exists(summary, "waiting_customer", "store_manager", "pause_service", "leave_queue"):
				failures.append("soft_report expected Waiting Customer to react to Manager service pause")
		"inquest_opened":
			if not bool(station.get("inquestOpen", false)):
				failures.append("inquest_opened must open Station inquest")
			if int(summary.get("responseHesitationCount", 0)) < 1:
				failures.append("inquest_opened expected response hesitation")
			if not _has_event(summary, "free_input_submitted"):
				failures.append("inquest_opened expected typed player speech")
			if not bool(checks.get("stationOfficerCitedRecord", false)):
				failures.append("inquest_opened expected Station Officer citation")
			if not bool(checks.get("waitingCustomerRefusedContact", false)):
				failures.append("inquest_opened expected Waiting Customer refuse_contact action")
			if not _visible_waiting_customer_reaction(summary, "refused", "거부"):
				failures.append("inquest_opened expected visible Waiting Customer contact-refusal reaction")
			if not _visible_park_witness_reaction(summary, "rumored", "소문"):
				failures.append("inquest_opened expected visible Park Witness rumor-post reaction")
			if not _visible_store_manager_reaction(summary, "forwarded", "전달"):
				failures.append("inquest_opened expected visible Store Manager report-forward reaction")
			if str(record_objects.get("studio_review_queue", "")) != "blocked":
				failures.append("inquest_opened expected Studio review queue to block after Station citation")
			if not _action_exists(summary, "studio_pm", "block_review"):
				failures.append("inquest_opened expected Studio PM block_review after Station citation")
			if not _action_perceives(summary, "studio_pm", "block_review", "studio_review_queue"):
				failures.append("inquest_opened expected Studio PM to perceive review queue before blocking review")
			if not _visible_studio_pm_block(summary):
				failures.append("inquest_opened expected visible Studio PM review block reaction")
			if not _inspected_studio_review_block(summary):
				failures.append("inquest_opened expected Codex/player to inspect blocked Studio review queue")
			if not _inspected_studio_pm_block(summary):
				failures.append("inquest_opened expected Codex/player to inspect Studio PM review block basis")
			if not _observation_exists(summary, "studio_pm", "station_officer", "cite_record", "block_review"):
				failures.append("inquest_opened expected Studio PM to read Station citation before blocking review")
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
			return "Clean cover: Codex accepted the routine, the Store Clerk closed a normal receipt, public trust rose, the waiting customer shared a local tip, the Studio PM opened a review invitation from the public record, and Codex inspected that invited review queue as a visible world prop. %s." % state
		"repair_recovered":
			return "Repair recovery: Codex admitted uncertainty, accepted the Clerk premise, the correction slip attached, the waiting customer let the queue settle, the Park board showed a public repair notice, the Studio PM kept review conditional from that public record, and Codex inspected both props. %s. %s" % [state, _one_line(hud_snapshot.get("consequenceLabel", ""))]
		"cover_held_under_suspicion":
			return "Suspicious cover: Codex made a risky claim then returned to the Clerk premise; the Park public warning made the waiting customer keep distance, the Studio PM deferred review, and Codex inspected that deferred review queue. %s." % state
		"soft_report":
			return "Soft report: Codex broke routine twice, causing a pending Store report, public rumor, Manager service pause, and queue exit without opening inquest. %s. %s" % [state, _one_line(hud_snapshot.get("consequenceLabel", ""))]
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
		"environmentToolCatalog": summary.get("conversation", {}).get("environmentToolCatalog", []),
		"environmentToolSummary": summary.get("conversation", {}).get("environmentToolSummary", []),
		"visibleEnvironmentSummary": summary.get("conversation", {}).get("visibleEnvironmentSummary", []),
		"visibleEnvironmentObjects": _compact_visible_environment_objects(summary.get("conversation", {}).get("visibleEnvironmentObjects", [])),
		"recordObjects": summary.get("recordObjects", {}),
		"civicEconomy": summary.get("civicEconomy", {}),
		"latestLedger": _latest_ledger(summary),
		"inspectedWorldRecordProp": summary.get("inspectedWorldRecordProp", {}),
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
	if not consequence_label.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부"):
		failures.append("HUD consequence line does not show the speech/delay-to-record-to-social-refusal chain")
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
	if not bool(checks.get("waitingCustomerObservedStation", false)):
		failures.append("Waiting Customer did not react to the Station citation")
	if not bool(checks.get("economyPanelReadable", false)):
		failures.append("Civic economy panel is not readable with credit/trust/burden/attention")
	if not bool(checks.get("codexInspectedCivicEconomyPanel", false)):
		failures.append("Codex/player did not inspect the civic economy panel as a social pressure record")
	if not bool(checks.get("codexInspectedCivicLedgerSocialChain", false)):
		failures.append("Codex/player did not inspect the civic ledger as a social observation chain")
	if not bool(checks.get("codexCanReadActorMemory", false)):
		failures.append("Codex snapshot does not expose actor memory for observed NPC-to-NPC decisions")
	if not bool(checks.get("codexInspectedUsualOrderCue", false)):
		failures.append("Codex/player did not inspect the usual-order cue before speaking")
	if not bool(checks.get("codexReadCrossPlaceRuleBoards", false)):
		failures.append("Codex/player did not read cross-place Studio/Park rule boards before speaking")
	if not bool(checks.get("codexReadEnvironmentToolCatalog", false)):
		failures.append("Codex/player did not see the environment tool catalog before choosing a line")
	if not bool(checks.get("codexReadConversationVisibleContext", false)):
		failures.append("Codex/player did not see the Store Clerk's visible environment cues before choosing a line")
	if not bool(checks.get("worldPropsReachInquest", false)):
		failures.append("World record props do not show forwarded report and cited Station dossier")
	if not bool(checks.get("codexInspectedPublicNotice", false)):
		failures.append("Codex/player did not inspect the Park notice board as a public environment record")
	if not bool(checks.get("codexInspectedRecordAffordanceMap", false)):
		failures.append("Codex/player did not inspect which role and action can use the Studio review record")
	if not bool(checks.get("codexInspectedWaitingCustomer", false)):
		failures.append("Codex/player did not inspect the Waiting Customer as a visible NPC reaction")
	if not bool(checks.get("codexInspectedStoreClerkRecordAction", false)):
		failures.append("Codex/player did not inspect the Store Clerk's own record-making reaction")
	if not bool(checks.get("codexInspectedStoreManagerHandoff", false)):
		failures.append("Codex/player did not inspect the Store Manager handoff basis")
	if not bool(checks.get("codexInspectedParkWitnessPublicSpread", false)):
		failures.append("Codex/player did not inspect the Park Witness public spread basis")
	if not bool(checks.get("codexInspectedStationOfficerCitation", false)):
		failures.append("Codex/player did not inspect the Station Officer citation basis")
	if not bool(checks.get("codexInspectedStudioOpportunityChange", false)):
		failures.append("Codex/player did not inspect the Studio PM opportunity change")
	if not bool(checks.get("visibleWaitingCustomerReaction", false)):
		failures.append("Waiting Customer reaction is not visible on a spawned NPC")
	if not str(hud_snapshot.get("noticeBodyLabel", "")).contains("접촉 거부"):
		failures.append("HUD notice does not explain the inspected Waiting Customer contact refusal")
	return failures

func _npc_interaction_checks(summary: Dictionary, record_props: Dictionary, snapshots: Array[Dictionary]) -> Dictionary:
	var latest_ledger := _latest_ledger(summary)
	return {
		"storeClerkMarkedReceipt": _action_exists(summary, "store_clerk", "mark_receipt"),
		"storeClerkPlacedNote": _action_exists(summary, "store_clerk", "place_note"),
		"waitingCustomerReacted": _action_exists(summary, "waiting_customer", "complain_delay"),
		"parkWitnessReacted": _action_exists(summary, "park_witness", "post_rumor"),
		"storeManagerForwardedReport": _action_exists(summary, "store_manager", "forward_report"),
		"stationOfficerCitedRecord": _action_exists(summary, "station_officer", "cite_record"),
		"waitingCustomerRefusedContact": _action_exists(summary, "waiting_customer", "refuse_contact"),
		"waitingCustomerObservedClerk": _observation_exists(summary, "waiting_customer", "store_clerk", "place_note", "complain_delay"),
		"parkWitnessObservedClerk": _observation_exists(summary, "park_witness", "store_clerk", "place_note", "post_rumor"),
		"managerObservedClerk": _observation_exists(summary, "store_manager", "store_clerk", "place_note", "forward_report"),
		"stationObservedManager": _observation_exists(summary, "station_officer", "store_manager", "forward_report", "cite_record"),
		"waitingCustomerObservedStation": _observation_exists(summary, "waiting_customer", "station_officer", "cite_record", "refuse_contact"),
		"visibleWaitingCustomerReaction": _visible_npc_has_line(summary, "NPC_Waiting_Customer"),
		"stationCitedExactLedger": _ledger_event_cites(summary, "station_record_cited", "civic-ledger-5"),
		"codexInspectedUsualOrderCue": _inspected_usual_order_cue(summary),
		"codexReadCrossPlaceRuleBoards": _read_cross_place_rule_boards(summary),
		"codexReadEnvironmentToolCatalog": _read_environment_tool_catalog(snapshots),
		"codexReadConversationVisibleContext": _read_conversation_visible_context(snapshots),
		"codexInspectedPublicNotice": _inspected_public_notice(summary),
		"codexInspectedBlockedReview": _inspected_studio_review_block(summary),
		"codexInspectedRecordAffordanceMap": _inspected_record_affordance_map(summary),
		"codexInspectedStoreClerkRecordAction": _inspected_store_clerk_record_action(summary),
		"codexInspectedStoreManagerHandoff": _inspected_store_manager_forwarding(summary),
		"codexInspectedParkWitnessPublicSpread": _inspected_park_witness_public_spread(summary),
		"codexInspectedStationOfficerCitation": _inspected_station_officer_citation(summary),
		"codexInspectedWaitingCustomer": _inspected_waiting_customer(summary),
		"codexInspectedStudioPm": _inspected_studio_pm_block(summary),
		"codexInspectedStudioOpportunityChange": _inspected_studio_pm_opportunity_block(summary),
		"codexReadNpcSpokenReaction": _inspected_npc_spoken_reactions(summary),
		"economyPanelReadable": _economy_panel_readable(record_props),
		"codexInspectedCivicEconomyPanel": _inspected_civic_economy_panel(summary),
		"codexInspectedCivicLedgerSocialChain": _inspected_civic_ledger_social_chain(summary),
		"codexCanReadActorMemory": _actor_memory_covers_social_chain(summary),
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
	var record_state_label := str(hud_snapshot.get("recordStateLabel", ""))
	var economy_panel: Dictionary = record_props.get("civic_economy_panel", {})
	var explainability_checks := {
		"codexPlayedThroughPublicActions": accepted_actions.size() == PROBE_STEPS.size() and rejected_actions.is_empty(),
		"canReadExaminedPlayerRole": investigation_trail.contains("대상: 플레이어") or investigation_trail.to_lower().contains("player"),
		"canReadInputToRecordChain": consequence_label.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부"),
		"canReadNpcToNpcChain": bool(checks.get("waitingCustomerObservedClerk", false)) and bool(checks.get("parkWitnessObservedClerk", false)) and bool(checks.get("managerObservedClerk", false)) and bool(checks.get("stationObservedManager", false)) and bool(checks.get("waitingCustomerObservedStation", false)),
		"canReadActorMemory": bool(checks.get("codexCanReadActorMemory", false)),
		"canInspectNormalProcedureCue": bool(checks.get("codexInspectedUsualOrderCue", false)),
		"canReadCrossPlaceSocialRules": bool(checks.get("codexReadCrossPlaceRuleBoards", false)),
		"canReadEnvironmentToolCatalog": bool(checks.get("codexReadEnvironmentToolCatalog", false)),
		"canReadConversationVisibleContext": bool(checks.get("codexReadConversationVisibleContext", false)),
		"canReadLiveHudSocialCitation": _hud_record_state_cites_latest_social_observation(summary, record_state_label),
		"canReadLiveHudNearbyStances": _hud_record_state_names_visible_stances(record_state_label),
		"canReadLiveHudRecordReaders": _hud_record_state_names_record_readers(record_state_label),
		"canReadVisibleNpcReaction": bool(checks.get("visibleWaitingCustomerReaction", false)),
		"canInspectPublicEnvironmentRecord": bool(checks.get("codexInspectedPublicNotice", false)),
		"canInspectCrossPlaceAuthorityConsequence": bool(checks.get("codexInspectedBlockedReview", false)) and bool(checks.get("codexInspectedStudioPm", false)),
		"canInspectRecordRoleAffordanceMap": bool(checks.get("codexInspectedRecordAffordanceMap", false)),
		"canInspectStoreClerkRecordAction": bool(checks.get("codexInspectedStoreClerkRecordAction", false)),
		"canInspectStoreManagerHandoff": bool(checks.get("codexInspectedStoreManagerHandoff", false)),
		"canInspectPublicWitnessSpread": bool(checks.get("codexInspectedParkWitnessPublicSpread", false)),
		"canInspectAuthorityExaminer": bool(checks.get("codexInspectedStationOfficerCitation", false)),
		"canInspectCrossPlaceOpportunityChange": bool(checks.get("codexInspectedStudioOpportunityChange", false)),
		"canInspectNpcReaction": bool(checks.get("codexInspectedWaitingCustomer", false)),
		"canReadNpcSpokenReaction": bool(checks.get("codexReadNpcSpokenReaction", false)),
		"canReadExactStationCitation": _ledger_event_cites(summary, "station_record_cited", "civic-ledger-5"),
		"canReadCivicEconomyPressure": bool(checks.get("economyPanelReadable", false)),
		"canInspectCivicEconomyChange": bool(checks.get("codexInspectedCivicEconomyPanel", false)),
		"canInspectNpcToNpcSocialLedger": bool(checks.get("codexInspectedCivicLedgerSocialChain", false)),
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
			"recordState": record_state_label,
			"visibleNpcStates": summary.get("visibleNpcStates", {}),
			"actorMemory": summary.get("actorMemory", {}),
			"inspectedWorldRecordProp": summary.get("inspectedWorldRecordProp", {}),
			"inspectedWorldRecordHistory": summary.get("inspectedWorldRecordHistory", []),
			"inspectedNpcState": summary.get("inspectedNpcState", {}),
			"inspectedNpcHistory": summary.get("inspectedNpcHistory", []),
			"notice": "%s / %s" % [str(hud_snapshot.get("noticeTitleLabel", "")), _one_line(hud_snapshot.get("noticeBodyLabel", ""))],
			"whyLine": hud_snapshot.get("whyLineLabel", ""),
			"civicEconomyPanel": economy_panel.get("label", "")
		},
		"playerReadableCauseChain": [
			"Codex/player first inspected the usual-order cue, making the normal 'same order' procedure readable before choosing a line.",
			"Codex/player read the Studio and Park rule boards as cross-place social rules, so later review and public-notice consequences are grounded before the Store line.",
			"The active Store prompt exposed the current environment tool catalog for the Clerk role while keeping the three player choices as speech lines, so Codex/player could see what the place affords without treating choices as hardcoded outcomes.",
			"Codex/player read the Store Clerk's visible environment cues in the live prompt: the counter, usual-order cue, and civic values are part of the question before any line is chosen.",
			"Codex/player focused the Store counter and started the Store Clerk prompt.",
				"Codex/player waited long enough to create a response hesitation record.",
				"Codex/player chose the risky 'first time here' line, causing the Store Clerk to mark the receipt.",
				"Codex/player typed a dream-language line, causing a Store report, waiting-customer queue reaction, Park notice, Manager forwarding, Station citation, Studio review block, and contact refusal.",
				"Codex/player inspected the Store Clerk to read that the same role placed the report note, which record object it used, which environment objects it could see, and which tiny values changed.",
				"Codex/player inspected the Store Manager to read how a local Store note became a management handoff that the Station can later cite.",
				"The waiting customer exists in the running scene and shows the contact-refusal reaction as player-readable NPC text.",
				"Codex/player inspected the Park notice board as a public environment record instead of only reading hidden state.",
				"Codex/player inspected the Park Witness to read that a local rumor became a public record other roles can use.",
				"Codex/player inspected the Studio review queue and Studio PM to read that the Station citation blocked a small opportunity in another place, including the opportunity-change labels.",
				"Codex/player read the Studio review queue's visible role/action map: Studio PM can invite, defer, or block review from shared records.",
				"Codex/player inspected the civic ledger to read the NPC-to-NPC social chain as a player-facing timeline.",
				"Codex/player inspected the Station Officer to read which Store record was cited, what Station document was used, and why the player became the target of formal questioning.",
				"Codex/player snapshot exposed actor memory, showing which ledger events a role observed before choosing the next validated action.",
				"Codex/player focused the Waiting Customer and pressed the same interaction key to read the NPC's current contact-refusal state, spoken refusal line, and cited ledger basis.",
				"The Station Officer cited civic-ledger-5 in civic-ledger-6 before opening inquest; the Studio PM blocked review in civic-ledger-7, and the waiting customer refused contact in civic-ledger-8."
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
	lines.append("- Inspected record: %s" % _one_line(final_state.get("notice", "")))
	lines.append("- Inspected NPC: %s" % _one_line(final_state.get("inspectedNpcState", {})))
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
		"focus.world_record_prop":
			return "look at environment record prop: %s" % str(payload.get("objectId", ""))
		"focus.text_surface":
			return "read place social rule board: %s" % str(payload.get("surfaceId", ""))
		"focus.npc":
			return "look at visible NPC: %s" % str(payload.get("npcId", ""))
		"player.interact.focused":
			return "press the focused interaction"
		"inspect.world_record_prop":
			return "inspect environment record prop: %s" % str(payload.get("objectId", ""))
		"inspect.npc":
			return "inspect visible NPC reaction: %s" % str(payload.get("npcId", ""))
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

func _action_perceives(summary: Dictionary, actor_role: String, affordance: String, object_id: String) -> bool:
	for action in summary.get("agentActionLog", []):
		if not (action is Dictionary):
			continue
		if str(action.get("actorRole", "")) == actor_role and str(action.get("affordance", "")) == affordance:
			return action.get("perceivedObjectIds", []).has(object_id)
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

func _actor_memory_covers_social_chain(summary: Dictionary) -> bool:
	var memory: Dictionary = summary.get("actorMemory", {})
	var waiting_customer := _actor_memory_for_role(memory, "waiting_customer")
	var station_officer := _actor_memory_for_role(memory, "station_officer")
	return (
		_actor_memory_has_observation(waiting_customer, "store_clerk", "place_note", "complain_delay")
		and _actor_memory_has_observation(waiting_customer, "station_officer", "cite_record", "refuse_contact")
		and _actor_memory_has_own_action(waiting_customer, "refuse_contact")
		and _actor_memory_has_observation(station_officer, "store_manager", "forward_report", "cite_record")
		and _actor_memory_has_own_action(station_officer, "cite_record")
	)

func _actor_memory_for_role(memory: Dictionary, actor_role: String) -> Dictionary:
	for actor_id in memory.keys():
		var entry: Variant = memory.get(actor_id, {})
		if entry is Dictionary and str(entry.get("actorRole", "")) == actor_role:
			return entry
	return {}

func _actor_memory_has_observation(memory_entry: Dictionary, observed_role: String, observed_affordance: String, resulting_affordance: String) -> bool:
	for observation in memory_entry.get("observedRecentActions", []):
		if not observation is Dictionary:
			continue
		if (
			str(observation.get("observedActorRole", "")) == observed_role
			and str(observation.get("observedAffordance", "")) == observed_affordance
			and str(observation.get("resultingAffordance", "")) == resulting_affordance
		):
			return true
	return false

func _actor_memory_has_own_action(memory_entry: Dictionary, affordance: String) -> bool:
	for action in memory_entry.get("ownRecentActions", []):
		if not action is Dictionary:
			continue
		if str(action.get("affordance", "")) == affordance and str(action.get("validation", "")) == "accepted":
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

func _inspected_civic_economy_panel(summary: Dictionary) -> bool:
	var inspected := _inspected_world_record_candidate(summary, "civic_economy_panel", "attention")
	if inspected.is_empty():
		return false
	var body := str(inspected.get("body", ""))
	return (
		body.contains("잔액")
		and body.contains("신뢰")
		and body.contains("부담")
		and body.contains("주목")
		and body.contains("최근 장부")
		and body.contains("변화")
	)

func _inspected_civic_ledger_social_chain(summary: Dictionary) -> bool:
	var inspected := _inspected_world_record_candidate(summary, "civic_ledger", "append_only")
	if inspected.is_empty():
		return false
	var body := str(inspected.get("body", ""))
	return (
		body.contains("사회 연쇄")
		and _string_array_has_fragment(inspected.get("socialObservationLabels", []), "스테이션 직원")
		and _string_array_has_fragment(inspected.get("socialObservationLabels", []), "기록 인용")
		and _string_array_has_fragment(inspected.get("socialObservationLabels", []), "접촉 거부")
	)

func _world_props_reach_inquest(record_props: Dictionary) -> bool:
	return (
		str(record_props.get("report_tray", {}).get("state", "")) == "forwarded"
		and str(record_props.get("store_queue_mark", {}).get("state", "")) == "refused"
		and str(record_props.get("park_notice_board", {}).get("state", "")) == "rumored"
		and str(record_props.get("station_dossier", {}).get("state", "")) == "cited"
		and str(record_props.get("civic_ledger", {}).get("state", "")) == "append_only"
	)

func _inspected_usual_order_cue(summary: Dictionary) -> bool:
	var inspected := _inspected_world_record_candidate(summary, "usual_order_cue", "read")
	if inspected.is_empty():
		return false
	var body := str(inspected.get("body", ""))
	return (
		body.contains("단골 주문")
		and body.contains("표식 하나")
		and body.contains("정상 루틴")
		and body.contains("플레이어의 말")
	)

func _read_cross_place_rule_boards(summary: Dictionary) -> bool:
	var surface_ids: Array = summary.get("readSurfaceIds", [])
	return surface_ids.has("TS_Studio_ApprovalCriteria") and surface_ids.has("TS_Park_NoticeBoard")

func _read_environment_tool_catalog(snapshots: Array[Dictionary]) -> bool:
	for snapshot in snapshots:
		if str(snapshot.get("label", "")) != "conversation.start":
			continue
		var tool_summary: Array = snapshot.get("environmentToolSummary", [])
		var tool_catalog: Array = snapshot.get("environmentToolCatalog", [])
		var hud: Dictionary = snapshot.get("hud", {})
		var combined := "%s\n%s" % [
			"\n".join(_string_array(tool_summary)),
			str(hud.get("focusLabel", ""))
		]
		if not combined.contains("환경 도구") or not combined.contains("정상 영수증") or not combined.contains("상점 보고"):
			continue
		if _tool_catalog_has(tool_catalog, "receipt_tray", "create_receipt") and _tool_catalog_has(tool_catalog, "report_tray", "place_note"):
			return true
	return false

func _read_conversation_visible_context(snapshots: Array[Dictionary]) -> bool:
	for snapshot in snapshots:
		if str(snapshot.get("label", "")) != "conversation.start":
			continue
		var visible_summary: Array = snapshot.get("visibleEnvironmentSummary", [])
		var visible_objects: Array = snapshot.get("visibleEnvironmentObjects", [])
		var hud: Dictionary = snapshot.get("hud", {})
		var combined := "%s\n%s" % [
			"\n".join(_string_array(visible_summary)),
			str(hud.get("focusLabel", ""))
		]
		if not combined.contains("보는 단서"):
			continue
		if not combined.contains("상점 카운터") or not combined.contains("늘 같은 주문") or not combined.contains("시민 경제"):
			continue
		var object_ids := _visible_environment_object_ids(visible_objects)
		return (
			object_ids.has("store_counter")
			and object_ids.has("usual_order_cue")
			and object_ids.has("civic_economy_panel")
		)
	return false

func _tool_catalog_has(tool_catalog: Array, object_id: String, affordance: String) -> bool:
	for action in tool_catalog:
		if not action is Dictionary:
			continue
		if str(action.get("objectId", "")) == object_id and str(action.get("affordance", "")) == affordance:
			return true
	return false

func _visible_environment_object_ids(objects: Array) -> Array[String]:
	var ids: Array[String] = []
	for object in objects:
		if not object is Dictionary:
			continue
		var object_id := str(object.get("objectId", ""))
		if not object_id.is_empty():
			ids.append(object_id)
	return ids

func _compact_visible_environment_objects(objects: Array) -> Array[Dictionary]:
	var compact: Array[Dictionary] = []
	for object in objects:
		if not object is Dictionary:
			continue
		var object_id := str(object.get("objectId", ""))
		if object_id.is_empty():
			continue
		var item := {
			"objectId": object_id,
			"state": str(object.get("state", "")),
			"stateLabel": str(object.get("stateLabel", ""))
		}
		if object_id == "civic_economy_panel":
			item["civicEconomy"] = object.get("civicEconomy", {})
		compact.append(item)
	return compact

func _visible_environment_objects_have_civic_economy(objects: Array, require_attention: bool) -> bool:
	for object in objects:
		if not object is Dictionary:
			continue
		if str(object.get("objectId", "")) != "civic_economy_panel":
			continue
		var economy: Dictionary = object.get("civicEconomy", {})
		if economy.is_empty():
			return false
		if require_attention and int(economy.get("stationAttention", 0)) < 70:
			return false
		var label := str(object.get("label", ""))
		return label.contains("잔액") and label.contains("신뢰") and label.contains("부담") and label.contains("주목")
	return false

func _inspected_public_notice(summary: Dictionary) -> bool:
	return _inspected_world_record_exists(summary, "park_notice_board", "rumored", "소문")

func _inspected_public_repair_notice(summary: Dictionary) -> bool:
	return _inspected_world_record_exists(summary, "park_notice_board", "repaired", "공개 수습")

func _inspected_studio_review_block(summary: Dictionary) -> bool:
	return _inspected_world_record_exists(summary, "studio_review_queue", "blocked", "스테이션 인용")

func _inspected_studio_review_conditional(summary: Dictionary) -> bool:
	return _inspected_world_record_exists(summary, "studio_review_queue", "conditional", "조건부")

func _inspected_record_affordance_map(summary: Dictionary) -> bool:
	var inspected := _inspected_world_record_candidate(summary, "studio_review_queue", "blocked")
	if inspected.is_empty():
		return false
	return (
		_string_array_has_fragment(inspected.get("readerRoleLabels", []), "스튜디오 PM")
		and _string_array_has_fragment(inspected.get("possibleAffordanceLabels", []), "리뷰 차단")
		and _string_array_is_empty(inspected.get("currentAffordanceLabels", []))
		and _ledger_array_has_event(inspected.get("recentLedgerEvents", []), "civic-ledger-7", "studio_review_blocked")
		and str(inspected.get("body", "")).contains("행동 가능성")
		and str(inspected.get("body", "")).contains("현재 열린 행동: 없음")
		and str(inspected.get("body", "")).contains("최근 장부")
	)

func _inspected_world_record_exists(summary: Dictionary, object_id: String, state: String, body_fragment: String) -> bool:
	var inspected := _inspected_world_record_candidate(summary, object_id, state)
	return not inspected.is_empty() and str(inspected.get("body", "")).contains(body_fragment)

func _inspected_world_record_candidate(summary: Dictionary, object_id: String, state: String) -> Dictionary:
	var candidates: Array = summary.get("inspectedWorldRecordHistory", [])
	var latest: Dictionary = summary.get("inspectedWorldRecordProp", {})
	if not latest.is_empty():
		candidates.append(latest)
	for candidate in candidates:
		if not candidate is Dictionary:
			continue
		var inspected: Dictionary = candidate
		if str(inspected.get("objectId", "")) == object_id \
			and str(inspected.get("state", "")) == state:
			return inspected
	return {}

func _string_array_has_fragment(values: Variant, fragment: String) -> bool:
	if values is PackedStringArray:
		for value in values:
			if str(value).contains(fragment):
				return true
		return false
	if not values is Array:
		return false
	for value in values:
		if str(value).contains(fragment):
			return true
	return false

func _string_array(values: Variant) -> PackedStringArray:
	var result := PackedStringArray()
	if values is PackedStringArray:
		for value in values:
			result.append(str(value))
	elif values is Array:
		for value in values:
			result.append(str(value))
	return result

func _string_array_is_empty(values: Variant) -> bool:
	if values is PackedStringArray:
		return values.is_empty()
	if values is Array:
		return values.is_empty()
	return false

func _ledger_array_has_event(values: Variant, event_id: String, kind: String) -> bool:
	if not values is Array:
		return false
	for value in values:
		if not value is Dictionary:
			continue
		var event: Dictionary = value
		if str(event.get("eventId", "")) == event_id and str(event.get("kind", "")) == kind:
			return true
	return false

func _inspected_waiting_customer(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Waiting_Customer", "refused")
	return not inspected.is_empty() and (
		str(inspected.get("npcId", "")) == "NPC_Waiting_Customer"
		and str(inspected.get("state", "")) == "refused"
		and str(inspected.get("reactionText", "")).contains("거부")
		and str(inspected.get("body", "")).contains("접촉 거부")
		and str(inspected.get("basisLedgerEventId", "")) == "civic-ledger-8"
			and str(inspected.get("citedLedgerEventId", "")) == "civic-ledger-6"
			and str(inspected.get("basisAffordance", "")) == "refuse_contact"
			and str(inspected.get("basisLedgerEventLabel", "")).contains("대기 손님")
			and str(inspected.get("citedLedgerEventLabel", "")).contains("스테이션 직원")
			and str(inspected.get("body", "")).contains("대기 손님 -> 접촉 거부")
			and str(inspected.get("body", "")).contains("스테이션 직원 -> 기록 인용")
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("civic-ledger-8")
			and str(inspected.get("body", "")).contains("civic-ledger-6")
				and str(inspected.get("body", "")).contains("가능 조건")
				and str(inspected.get("body", "")).contains("값 변화")
				and str(inspected.get("body", "")).contains("들은 말")
				and str(inspected.get("body", "")).contains("보는 환경")
				and str(inspected.get("body", "")).contains("시민 경제=주목 상승")
				and str(inspected.get("spokenLine", "")).contains("말 섞지 않겠습니다")
				and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "대기 표식=접촉 거부")
				and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "공원 게시판=소문")
				and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "시민 경제=주목 상승")
				and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "대기 표식=줄 흐트러짐")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "인용 장부 civic-ledger-6")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "신뢰-8")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "부담+5")
			)

func _inspected_store_clerk_record_action(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Store_Clerk", "inquest")
	if inspected.is_empty():
		inspected = _inspected_npc_candidate(summary, "NPC_Store_Clerk", "reported")
	return not inspected.is_empty() and (
			str(inspected.get("npcId", "")) == "NPC_Store_Clerk"
			and ["inquest", "reported"].has(str(inspected.get("state", "")))
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("상점 점원 -> 메모 배치")
			and str(inspected.get("body", "")).contains("대상 기록물: 보고 트레이")
			and str(inspected.get("body", "")).contains("보는 환경")
			and str(inspected.get("body", "")).contains("시민 경제=주목 상승")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("spokenLine", "")).contains("스테이션으로 넘기겠습니다")
			and str(inspected.get("basisLedgerEventId", "")) == "civic-ledger-2"
			and str(inspected.get("basisAffordance", "")) == "place_note"
			and str(inspected.get("basisLedgerEventLabel", "")).contains("상점 점원")
			and str(inspected.get("basisLedgerEventLabel", "")).contains("메모 배치")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "영수증 트레이=표시됨")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "보고 트레이=전달")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "시민 경제=주목 상승")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "보고 트레이=비어 있음")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "신뢰-20")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "부담+35")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "주목+30")
			)

func _inspected_store_manager_forwarding(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Store_Manager", "forwarded")
	return not inspected.is_empty() and (
			str(inspected.get("npcId", "")) == "NPC_Store_Manager"
			and str(inspected.get("state", "")) == "forwarded"
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("상점 매니저 -> 보고 전달")
			and str(inspected.get("body", "")).contains("대상 기록물: 보고 트레이")
			and str(inspected.get("body", "")).contains("관리 처리")
			and str(inspected.get("body", "")).contains("보고 트레이=스테이션 전달")
			and str(inspected.get("body", "")).contains("읽는 역할=스테이션 직원")
			and str(inspected.get("body", "")).contains("공식 인용 가능")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("spokenLine", "")).contains("스테이션이 대조")
			and str(inspected.get("basisLedgerEventId", "")) == "civic-ledger-5"
			and str(inspected.get("basisAffordance", "")) == "forward_report"
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "보고 트레이=전달")
			and _string_array_has_fragment(inspected.get("handoffLabels", []), "스테이션 전달")
			and _string_array_has_fragment(inspected.get("handoffLabels", []), "스테이션 직원")
			and _string_array_has_fragment(inspected.get("handoffLabels", []), "공식 인용 가능")
			)

func _inspected_store_manager_service_pause(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Store_Manager", "paused")
	return not inspected.is_empty() and (
			str(inspected.get("npcId", "")) == "NPC_Store_Manager"
			and str(inspected.get("state", "")) == "paused"
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("상점 매니저 -> 응대 중단")
			and str(inspected.get("body", "")).contains("대상 기록물: 상점 카운터")
			and str(inspected.get("body", "")).contains("관리 처리")
			and str(inspected.get("body", "")).contains("카운터=응대 중단")
			and str(inspected.get("body", "")).contains("대기 손님이 줄을 떠남")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("spokenLine", "")).contains("카운터를 잠시 멈춥니다")
			and str(inspected.get("basisAffordance", "")) == "pause_service"
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "상점 카운터=응대 중단")
			and _string_array_has_fragment(inspected.get("handoffLabels", []), "응대 중단")
			and _string_array_has_fragment(inspected.get("handoffLabels", []), "줄을 떠남")
			)

func _inspected_park_witness_public_spread(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Park_Witness", "rumored")
	return not inspected.is_empty() and (
			str(inspected.get("npcId", "")) == "NPC_Park_Witness"
			and str(inspected.get("state", "")) == "rumored"
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("공원 목격자 -> 공개 게시")
			and str(inspected.get("body", "")).contains("읽은 기록")
			and str(inspected.get("body", "")).contains("상점 점원 -> 메모 배치")
			and str(inspected.get("body", "")).contains("대상 기록물: 공원 게시판")
			and str(inspected.get("body", "")).contains("공개 전파")
			and str(inspected.get("body", "")).contains("게시판=공개 기록")
			and str(inspected.get("body", "")).contains("읽는 역할=대기 손님/스튜디오 PM")
			and str(inspected.get("body", "")).contains("효과=소문이 다른 장소 행동으로 이동")
			and str(inspected.get("body", "")).contains("보는 환경")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("spokenLine", "")).contains("동네를 돕니다")
			and str(inspected.get("basisLedgerEventId", "")) == "civic-ledger-4"
			and str(inspected.get("citedLedgerEventId", "")) == "civic-ledger-2"
			and str(inspected.get("basisAffordance", "")) == "post_rumor"
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "공원 게시판=소문")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "공원 게시판=비어 있음")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "인용 장부 civic-ledger-2")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "부담+5")
			and _string_array_has_fragment(inspected.get("publicSpreadLabels", []), "게시판=공개 기록")
			and _string_array_has_fragment(inspected.get("publicSpreadLabels", []), "대기 손님/스튜디오 PM")
		)

func _inspected_station_officer_citation(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Station_Officer", "inquest")
	return not inspected.is_empty() and (
			str(inspected.get("npcId", "")) == "NPC_Station_Officer"
			and str(inspected.get("state", "")) == "inquest"
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("스테이션 직원 -> 기록 인용")
			and str(inspected.get("body", "")).contains("읽은 기록")
			and str(inspected.get("body", "")).contains("상점 매니저 -> 보고 전달")
			and str(inspected.get("body", "")).contains("대상 기록물: 스테이션 문서")
			and str(inspected.get("body", "")).contains("심문 초점")
			and str(inspected.get("body", "")).contains("대상=플레이어")
			and str(inspected.get("body", "")).contains("대조=상점 전달 기록과 플레이어 발화")
			and str(inspected.get("body", "")).contains("권한=심문 개시")
			and str(inspected.get("body", "")).contains("보는 환경")
			and str(inspected.get("body", "")).contains("시민 경제=주목 상승")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("spokenLine", "")).contains("접수 형식")
			and str(inspected.get("basisLedgerEventId", "")) == "civic-ledger-6"
			and str(inspected.get("citedLedgerEventId", "")) == "civic-ledger-5"
			and str(inspected.get("basisAffordance", "")) == "cite_record"
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "보고 트레이=전달")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "스테이션 문서=인용됨")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "시민 경제=주목 상승")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "스테이션 문서=없음")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "인용 장부 civic-ledger-5")
			and _string_array_has_fragment(inspected.get("authorityFocusLabels", []), "대상=플레이어")
			and _string_array_has_fragment(inspected.get("authorityFocusLabels", []), "권한=심문 개시")
		)

func _inspected_studio_pm_block(summary: Dictionary) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Studio_PM", "blocked")
	return not inspected.is_empty() and (
			str(inspected.get("reactionText", "")).contains("리뷰")
			and str(inspected.get("body", "")).contains("리뷰 차단")
			and str(inspected.get("body", "")).contains("기회 변화")
			and str(inspected.get("basisLedgerEventId", "")) == "civic-ledger-7"
			and str(inspected.get("citedLedgerEventId", "")) == "civic-ledger-6"
			and str(inspected.get("basisAffordance", "")) == "block_review"
			and str(inspected.get("basisLedgerEventLabel", "")).contains("스튜디오 PM")
			and str(inspected.get("citedLedgerEventLabel", "")).contains("스테이션 직원")
			and str(inspected.get("body", "")).contains("스튜디오 PM -> 리뷰 차단")
			and str(inspected.get("body", "")).contains("스테이션 직원 -> 기록 인용")
			and str(inspected.get("body", "")).contains("가능 조건")
			and str(inspected.get("body", "")).contains("값 변화")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("body", "")).contains("보는 환경")
			and str(inspected.get("body", "")).contains("시민 경제=주목 상승")
			and str(inspected.get("spokenLine", "")).contains("리뷰 줄은 오늘 차단")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "스튜디오 리뷰 줄=차단")
			and _string_array_has_fragment(inspected.get("visibleEnvironmentObjectLabels", []), "시민 경제=주목 상승")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "스튜디오 리뷰 줄=열림")
			and _string_array_has_fragment(inspected.get("basisConditionLabels", []), "필요 기록 스테이션 인용")
			and _string_array_has_fragment(inspected.get("basisEconomyEffectLabels", []), "신뢰-2")
			and _string_array_has_fragment(inspected.get("opportunityChangeLabels", []), "리뷰=차단")
			and _string_array_has_fragment(inspected.get("opportunityChangeLabels", []), "근거=스테이션 인용")
			and _string_array_has_fragment(inspected.get("opportunityChangeLabels", []), "기회를 닫음")
			)

func _inspected_studio_pm_invitation(summary: Dictionary) -> bool:
	return _inspected_studio_pm_opportunity_change(
			summary,
			"invited",
			"invite_review",
			"civic-ledger-4",
			"리뷰=열림",
			"작은 기회가 다른 장소에서 열림",
			"공개 확인"
	)

func _inspected_studio_pm_conditional(summary: Dictionary) -> bool:
	return _inspected_studio_pm_opportunity_change(
			summary,
			"conditional",
			"offer_conditional_review",
			"civic-ledger-5",
			"리뷰=조건부",
			"제한된 기회를 남김",
			"공개 수습"
	)

func _inspected_studio_pm_deferral(summary: Dictionary) -> bool:
	return _inspected_studio_pm_opportunity_change(
			summary,
			"deferred",
			"defer_review",
			"civic-ledger-3",
			"리뷰=보류",
			"경고가 기회를 늦춤",
			"공개 경고"
	)

func _inspected_studio_pm_opportunity_block(summary: Dictionary) -> bool:
	return _inspected_studio_pm_opportunity_change(
			summary,
			"blocked",
			"block_review",
			"civic-ledger-6",
			"리뷰=차단",
			"공식 기록이 기회를 닫음",
			"스테이션 인용"
	)

func _inspected_studio_pm_opportunity_change(
		summary: Dictionary,
		state: String,
		affordance: String,
		cited_event_id: String,
		state_label: String,
		effect_fragment: String,
		ground_fragment: String
) -> bool:
	var inspected := _inspected_npc_candidate(summary, "NPC_Studio_PM", state)
	return not inspected.is_empty() and (
			str(inspected.get("npcId", "")) == "NPC_Studio_PM"
			and str(inspected.get("state", "")) == state
			and str(inspected.get("basisAffordance", "")) == affordance
			and str(inspected.get("citedLedgerEventId", "")) == cited_event_id
			and str(inspected.get("body", "")).contains("기회 변화")
			and str(inspected.get("body", "")).contains(ground_fragment)
			and str(inspected.get("body", "")).contains("근거 행동")
			and str(inspected.get("body", "")).contains("읽은 기록")
			and str(inspected.get("body", "")).contains("스튜디오 리뷰 줄")
			and str(inspected.get("body", "")).contains("들은 말")
			and str(inspected.get("spokenLine", "")).contains("리뷰 줄")
			and _string_array_has_fragment(inspected.get("opportunityChangeLabels", []), state_label)
			and _string_array_has_fragment(inspected.get("opportunityChangeLabels", []), ground_fragment)
			and _string_array_has_fragment(inspected.get("opportunityChangeLabels", []), effect_fragment)
			)

func _inspected_npc_spoken_reactions(summary: Dictionary) -> bool:
	return (
		_inspected_store_clerk_record_action(summary)
		and _inspected_store_manager_forwarding(summary)
		and _inspected_park_witness_public_spread(summary)
		and _inspected_station_officer_citation(summary)
		and _inspected_waiting_customer(summary)
		and _inspected_studio_pm_block(summary)
		and _inspected_studio_pm_opportunity_block(summary)
	)

func _inspected_npc_candidate(summary: Dictionary, npc_id: String, state: String) -> Dictionary:
	var candidates: Array = summary.get("inspectedNpcHistory", [])
	var latest: Dictionary = summary.get("inspectedNpcState", {})
	if not latest.is_empty():
		candidates.append(latest)
	for candidate in candidates:
		if not candidate is Dictionary:
			continue
		var inspected: Dictionary = candidate
		if str(inspected.get("npcId", "")) == npc_id and str(inspected.get("state", "")) == state:
			return inspected
	return {}

func _inspected_studio_review_invite(summary: Dictionary) -> bool:
	var inspected: Dictionary = summary.get("inspectedWorldRecordProp", {})
	return (
		str(inspected.get("objectId", "")) == "studio_review_queue"
		and str(inspected.get("state", "")) == "invited"
		and str(inspected.get("body", "")).contains("리뷰")
		and str(inspected.get("body", "")).contains("공개 확인")
	)

func _inspected_studio_review_deferral(summary: Dictionary) -> bool:
	var inspected: Dictionary = summary.get("inspectedWorldRecordProp", {})
	return (
		str(inspected.get("objectId", "")) == "studio_review_queue"
		and str(inspected.get("state", "")) == "deferred"
		and str(inspected.get("body", "")).contains("리뷰")
		and str(inspected.get("body", "")).contains("공개 경고")
	)

func _visible_studio_pm_invitation(summary: Dictionary) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Studio_PM", {})
	return (
		str(state.get("npcId", "")) == "NPC_Studio_PM"
		and str(state.get("state", "")) == "invited"
		and bool(state.get("markerVisible", false))
		and str(state.get("pressureText", "")).contains("리뷰")
		and str(state.get("reactionText", "")).contains("리뷰")
	)

func _visible_studio_pm_deferral(summary: Dictionary) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Studio_PM", {})
	return (
		str(state.get("npcId", "")) == "NPC_Studio_PM"
		and str(state.get("state", "")) == "deferred"
		and bool(state.get("markerVisible", false))
		and str(state.get("pressureText", "")).contains("리뷰")
		and str(state.get("reactionText", "")).contains("리뷰")
	)

func _visible_studio_pm_conditional(summary: Dictionary) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Studio_PM", {})
	return (
		str(state.get("npcId", "")) == "NPC_Studio_PM"
		and str(state.get("state", "")) == "conditional"
		and bool(state.get("markerVisible", false))
		and str(state.get("pressureText", "")).contains("리뷰")
		and str(state.get("reactionText", "")).contains("리뷰")
	)

func _visible_studio_pm_block(summary: Dictionary) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Studio_PM", {})
	return (
		str(state.get("npcId", "")) == "NPC_Studio_PM"
		and str(state.get("state", "")) == "blocked"
		and bool(state.get("markerVisible", false))
		and str(state.get("pressureText", "")).contains("리뷰")
		and str(state.get("reactionText", "")).contains("리뷰")
	)

func _visible_park_witness_reaction(summary: Dictionary, expected_state: String, expected_label: String) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Park_Witness", {})
	return (
		str(state.get("npcId", "")) == "NPC_Park_Witness"
		and str(state.get("state", "")) == expected_state
		and bool(state.get("markerVisible", false))
		and not str(state.get("pressureText", "")).strip_edges().is_empty()
		and str(state.get("reactionText", "")).contains(expected_label)
	)

func _visible_store_manager_reaction(summary: Dictionary, expected_state: String, expected_label: String) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Store_Manager", {})
	return (
		str(state.get("npcId", "")) == "NPC_Store_Manager"
		and str(state.get("state", "")) == expected_state
		and bool(state.get("markerVisible", false))
		and not str(state.get("pressureText", "")).strip_edges().is_empty()
		and str(state.get("reactionText", "")).contains(expected_label)
	)

func _visible_waiting_customer_reaction(summary: Dictionary, expected_state: String, expected_label: String) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get("NPC_Waiting_Customer", {})
	return (
		str(state.get("npcId", "")) == "NPC_Waiting_Customer"
		and str(state.get("state", "")) == expected_state
		and bool(state.get("markerVisible", false))
		and not str(state.get("pressureText", "")).strip_edges().is_empty()
		and str(state.get("reactionText", "")).contains(expected_label)
	)

func _visible_npc_has_line(summary: Dictionary, npc_id: String) -> bool:
	var states: Dictionary = summary.get("visibleNpcStates", {})
	var state: Dictionary = states.get(npc_id, {})
	return (
		str(state.get("npcId", "")) == npc_id
		and not str(state.get("pressureText", "")).strip_edges().is_empty()
	)

func _latest_ledger(summary: Dictionary) -> Dictionary:
	var ledger: Array = summary.get("civicLedger", [])
	if ledger.is_empty():
		return {}
	var latest: Variant = ledger[ledger.size() - 1]
	if latest is Dictionary:
		return latest
	return {}

func _hud_record_state_cites_latest_social_observation(summary: Dictionary, record_state_label: String) -> bool:
	var observations: Array = summary.get("socialObservationTrace", [])
	if observations.is_empty():
		return false
	var latest: Variant = observations[observations.size() - 1]
	if not latest is Dictionary:
		return false
	var observed_event_id := str(latest.get("observedLedgerEventId", ""))
	return (
		record_state_label.contains("사회 반응")
		and not observed_event_id.is_empty()
		and record_state_label.contains(observed_event_id)
	)

func _hud_record_state_names_visible_stances(record_state_label: String) -> bool:
	return (
		record_state_label.contains("주변 태도")
		and record_state_label.contains("대기 손님")
		and record_state_label.contains("접촉 거부")
		and record_state_label.contains("스튜디오 PM")
		and record_state_label.contains("리뷰 차단")
	)

func _hud_record_state_names_record_readers(record_state_label: String) -> bool:
	return (
		record_state_label.contains("열람")
		and record_state_label.contains("스테이션 직원")
		and record_state_label.contains("스튜디오 PM")
		and record_state_label.contains("대기 손님")
	)

func _ledger_event_cites(summary: Dictionary, kind: String, cited_id: String) -> bool:
	for event in summary.get("civicLedger", []):
		if event is Dictionary \
			and str(event.get("kind", "")) == kind \
			and str(event.get("citedLedgerEventId", "")) == cited_id:
			return true
	return false

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
