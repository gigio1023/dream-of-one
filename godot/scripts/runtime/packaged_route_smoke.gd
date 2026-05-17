extends Node

const ENABLE_ENV := "DREAM_OF_ONE_PACKAGED_ROUTE_SMOKE"
const OUTPUT_ENV := "DREAM_OF_ONE_PACKAGED_ROUTE_EVIDENCE_OUTPUT"
const DEFAULT_OUTPUT := "user://same-order-packaged-route-evidence.json"
const TYPED_LINE := "저는 이 꿈에 방금 들어왔어요."

func _ready() -> void:
	if not _enabled():
		return
	call_deferred("_run")

func _enabled() -> bool:
	return OS.get_environment(ENABLE_ENV).strip_edges() != "" or OS.get_environment(OUTPUT_ENV).strip_edges() != ""

func _run() -> void:
	await _settle_frames(5)
	var session := get_tree().root.find_child("PlayableSession", true, false)
	if session == null:
		_fail(["PlayableSession was not found in packaged route smoke."])
		return
	var hud := get_tree().root.find_child("SocialStealthHud", true, false)
	if hud == null:
		_fail(["SocialStealthHud was not found in packaged route smoke."])
		return
	if not session.has_method("build_summary") or not session.has_method("build_evidence_pack"):
		_fail(["PlayableSession does not expose packaged route smoke methods."])
		return

	_call_session(session, "_force_focus_zone", ["StoreCounterZone"])
	_call_session(session, "_interact")
	await _settle_frames(3)
	_call_session(session, "_select_dialogue_index", [2])
	await _settle_frames(3)
	_call_session(session, "debug_record_response_hesitation")
	await _settle_frames(1)
	_call_session(session, "submit_free_input", [TYPED_LINE])
	await _settle_frames(3)

	var summary := _build_summary(session)
	var hud_snapshot := _read_hud_snapshot(hud)
	var failures := _validate_summary(summary)
	failures.append_array(_validate_hud_snapshot(hud_snapshot))
	if not failures.is_empty():
		_fail(failures)
		return

	var output_path := _output_path()
	var pack: Dictionary = session.build_evidence_pack(_artifact_path(output_path))
	var playability := _dict(pack.get("playability", {}))
	playability["packagedRouteSmokeProof"] = _build_packaged_route_smoke_proof(summary, hud_snapshot)
	pack["playability"] = playability
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write packaged route Evidence: %s" % output_path])
		return
	file.store_string(JSON.stringify(pack, "\t"))
	file.close()

	print(JSON.stringify({
		"ok": true,
		"artifactPath": _artifact_path(output_path),
		"stage": summary.get("stage", ""),
		"sessionOutcome": summary.get("sessionOutcome", ""),
		"suspicion": summary.get("suspicion", 0),
		"reportWeight": summary.get("reportWeight", 0),
		"providerMode": _dict(summary.get("providerState", {})).get("mode", ""),
		"latestLedger": _dict(_dict(summary.get("worldRecordProps", {})).get("civic_ledger", {})).get("label", ""),
		"hudTrail": str(hud_snapshot.get("investigationTrailLabel", ""))
	}, "\t"))
	get_tree().quit(0)

func _validate_summary(summary: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	if str(summary.get("stage", "")) != "inquest":
		failures.append("Packaged route smoke did not reach inquest stage.")
	if str(summary.get("sessionOutcome", "")) != "inquest_opened":
		failures.append("Packaged route smoke did not open inquest.")
	if int(summary.get("suspicion", 0)) < 100:
		failures.append("Packaged route smoke did not reach suspicion threshold.")
	if int(summary.get("reportWeight", 0)) < 100:
		failures.append("Packaged route smoke did not reach report threshold.")
	var provider_state := _dict(summary.get("providerState", {}))
	if str(provider_state.get("mode", "")) != "fallback_only_m1":
		failures.append("Packaged route smoke did not preserve fallback-only provider mode.")
	var civic_ledger := _array(summary.get("civicLedger", []))
	if not _ledger_event_cites(civic_ledger, "station_record_cited", "civic-ledger-6", "civic-ledger-5"):
		failures.append("Packaged route smoke did not preserve exact Station ledger citation.")
	if not _ledger_event_cites(civic_ledger, "queue_contact_refused", "civic-ledger-7", "civic-ledger-6"):
		failures.append("Packaged route smoke did not preserve the contact refusal after Station citation.")
	var economy_panel := _dict(_dict(summary.get("worldRecordProps", {})).get("civic_economy_panel", {}))
	var economy_panel_label := str(economy_panel.get("label", ""))
	if str(economy_panel.get("state", "")) != "attention":
		failures.append("Packaged route smoke did not preserve civic economy attention state.")
	var civic_economy := _dict(summary.get("civicEconomy", {}))
	for key in ["accountCredit", "localTrust", "recordBurden", "stationAttention"]:
		var value := int(civic_economy.get(key, -999))
		if not economy_panel_label.contains(str(value)):
			failures.append("Packaged route smoke civic economy panel did not show %s=%d." % [key, value])
	var events := _array(summary.get("events", []))
	if not _events_include(events, "response_hesitation_noted"):
		failures.append("Packaged route smoke did not emit response hesitation Evidence.")
	if int(summary.get("responseHesitationCount", 0)) < 1:
		failures.append("Packaged route smoke did not count response hesitation.")
	if not _events_include(events, "free_input_submitted"):
		failures.append("Packaged route smoke did not submit typed free input.")
	if not _events_include(events, "station_inquest_opened"):
		failures.append("Packaged route smoke did not emit Station inquest event.")
	return failures

func _read_hud_snapshot(hud: Node) -> Dictionary:
	if not hud.has_method("debug_snapshot"):
		return {
			"_error": "missing_debug_snapshot"
		}
	var snapshot = hud.debug_snapshot()
	if not snapshot is Dictionary:
		return {
			"_error": "snapshot_not_dictionary"
		}
	return snapshot

func _validate_hud_snapshot(snapshot: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	if str(snapshot.get("_error", "")) == "missing_debug_snapshot":
		failures.append("Packaged route smoke HUD does not expose debug_snapshot.")
		return failures
	if str(snapshot.get("_error", "")) == "snapshot_not_dictionary":
		failures.append("Packaged route smoke HUD snapshot is not a Dictionary.")
		return failures
	var trail := str(snapshot.get("investigationTrailLabel", ""))
	if not trail.contains("검사자"):
		failures.append("Packaged route smoke HUD did not use examiner wording.")
	if not trail.contains("대상: 플레이어"):
		failures.append("Packaged route smoke HUD did not keep player as examined subject.")
	if not trail.contains("스테이션 직원"):
		failures.append("Packaged route smoke HUD did not name Station Officer during inquest.")
	var outcome_body := str(snapshot.get("outcomeBodyLabel", ""))
	if not outcome_body.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 접촉 거부 -> 심문"):
		failures.append("Packaged route smoke HUD did not show the outcome consequence chain.")
	var consequence_label := str(snapshot.get("consequenceLabel", ""))
	if not consequence_label.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용"):
		failures.append("Packaged route smoke HUD did not show the live record chain.")
	if not outcome_body.contains("역할 행동: 스테이션 직원"):
		failures.append("Packaged route smoke HUD did not name the Station Officer role action in the outcome.")
	return failures

func _build_packaged_route_smoke_proof(summary: Dictionary, hud_snapshot: Dictionary) -> Dictionary:
	var trail := str(hud_snapshot.get("investigationTrailLabel", ""))
	var outcome_body := str(hud_snapshot.get("outcomeBodyLabel", ""))
	var consequence_label := str(hud_snapshot.get("consequenceLabel", ""))
	var economy_panel := _dict(_dict(summary.get("worldRecordProps", {})).get("civic_economy_panel", {}))
	var economy_panel_label := str(economy_panel.get("label", ""))
	var civic_economy := _dict(summary.get("civicEconomy", {}))
	return {
		"pass": true,
		"validatedBy": "godot/scripts/runtime/packaged_route_smoke.gd",
		"routeId": "inquest_opened",
		"stage": str(summary.get("stage", "")),
		"sessionOutcome": str(summary.get("sessionOutcome", "")),
		"providerMode": str(_dict(summary.get("providerState", {})).get("mode", "")),
		"hudTrail": trail,
		"hudChecks": {
			"examinerWording": trail.contains("검사자"),
			"playerAsExaminedSubject": trail.contains("대상: 플레이어"),
			"stationOfficerExaminer": trail.contains("스테이션 직원")
		},
		"outcomeBody": outcome_body,
		"consequenceLabel": consequence_label,
		"outcomeChecks": {
			"liveRecordChain": consequence_label.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용"),
			"speechDelayRecordChain": outcome_body.contains("플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 접촉 거부 -> 심문"),
			"stationOfficerRoleAction": outcome_body.contains("역할 행동: 스테이션 직원")
		},
		"civicEconomy": civic_economy.duplicate(true),
		"civicEconomyPanel": {
			"state": str(economy_panel.get("state", "")),
			"label": economy_panel_label
		},
		"civicEconomyChecks": {
			"accountCreditVisible": economy_panel_label.contains(str(int(civic_economy.get("accountCredit", -999)))),
			"localTrustVisible": economy_panel_label.contains(str(int(civic_economy.get("localTrust", -999)))),
			"recordBurdenVisible": economy_panel_label.contains(str(int(civic_economy.get("recordBurden", -999)))),
			"stationAttentionVisible": economy_panel_label.contains(str(int(civic_economy.get("stationAttention", -999)))),
			"attentionState": str(economy_panel.get("state", "")) == "attention"
		},
		"responseHesitationCount": int(summary.get("responseHesitationCount", 0))
	}

func _events_include(events: Array, event_name: String) -> bool:
	for event in events:
		if event is Dictionary and str(event.get("eventName", "")) == event_name:
			return true
	return false

func _ledger_event_cites(events: Array, kind: String, event_id: String, cited_event_id: String) -> bool:
	for event in events:
		if not event is Dictionary:
			continue
		if str(event.get("kind", "")) != kind:
			continue
		if str(event.get("eventId", "")) != event_id:
			continue
		if str(event.get("citedLedgerEventId", "")) != cited_event_id:
			continue
		return true
	return false

func _output_path() -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		if override_path.begins_with("res://") or override_path.begins_with("user://"):
			return ProjectSettings.globalize_path(override_path)
		return override_path
	return ProjectSettings.globalize_path(DEFAULT_OUTPUT)

func _artifact_path(output_path: String) -> String:
	var override_path := OS.get_environment(OUTPUT_ENV).strip_edges()
	if override_path != "":
		return output_path
	return DEFAULT_OUTPUT

func _build_summary(session: Node) -> Dictionary:
	var summary = session.build_summary()
	if summary is Dictionary:
		return summary
	return {}

func _call_session(session: Node, method: StringName, args: Array = []) -> Variant:
	if not session.has_method(method):
		return null
	return session.callv(method, args)

func _settle_frames(count: int) -> void:
	for _i in range(count):
		await get_tree().process_frame

func _fail(failures: Array[String]) -> void:
	push_error("Packaged route smoke failed: %s" % "; ".join(failures))
	print(JSON.stringify({
		"ok": false,
		"failures": failures
	}, "\t"))
	get_tree().quit(1)

func _dict(value: Variant) -> Dictionary:
	if value is Dictionary:
		return value
	return {}

func _array(value: Variant) -> Array:
	if value is Array:
		return value
	return []
