extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"
const ARTIFACT_PATH := "data/evidence/godot/playable-slice/dre_171_playable_slice_evidence.json"

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail(["Unable to load %s" % MAIN_SCENE])
		return

	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	await process_frame

	var session := scene.find_child("PlayableSession", true, false)
	if session == null or not session.has_method("run_smoke_sequence"):
		_fail(["PlayableSession is missing or does not expose run_smoke_sequence"])
		return
	var player := scene.find_child("Player", true, false)

	var summary: Dictionary = session.run_smoke_sequence()
	var failures: Array[String] = []
	if str(summary.get("stage", "")) != "verdict":
		failures.append("Expected playable smoke to reach verdict stage")
	if int(summary.get("exposure", 0)) < 100:
		failures.append("Expected exposure >= 100")
	var station: Dictionary = summary.get("station", {})
	if not bool(station.get("intakeOpen", false)):
		failures.append("Expected Station intake to open")
	if not bool(station.get("inquestOpen", false)):
		failures.append("Expected Inquest to open")
	if not bool(station.get("verdictReady", false)):
		failures.append("Expected verdictReady")
	if not bool(station.get("sessionTerminationAllowed", false)):
		failures.append("Expected sessionTerminationAllowed")
	if summary.get("events", []).size() < 5:
		failures.append("Expected playable Evidence events")
	if not summary.get("readSurfaceIds", []).has("TS_Station_IntakeRules"):
		failures.append("Expected Station intake rules to be read")
	if str(summary.get("sessionOutcome", "")) != "case_closed":
		failures.append("Expected deterministic session outcome to be case_closed")
	if str(summary.get("lastWhyLineKey", "")) != "cover.CT_STATION_SOFT_INQUEST.pressure":
		failures.append("Expected last why-line key from Station pressure line")
	if str(summary.get("lastWhyLine", "")) != "담당자가 절차 불일치 노트를 엽니다.":
		failures.append("Expected Korean last why-line to be exposed in summary")
	if not bool(summary.get("inputLocked", false)):
		failures.append("Expected player input to lock after deterministic session end")
	if str(summary.get("authorityMode", "")) != "godot_local_smoke_runtime":
		failures.append("Expected playable smoke authorityMode to identify local Godot smoke runtime")
	var prologue_loop: Dictionary = summary.get("prologueLoop", {})
	var end_controls: Dictionary = prologue_loop.get("endControls", {})
	if str(end_controls.get("restart", "")) != "restart_session":
		failures.append("Expected restart_session end control after deterministic session end")
	if str(end_controls.get("quit", "")) != "quit_session":
		failures.append("Expected quit_session end control after deterministic session end")
	if not _has_safe_contrast(summary):
		failures.append("Expected safe SA_COMPLY contrast with Exposure held at 0")
	if not _has_risky_contrast(summary):
		failures.append("Expected risky SA_BREAK contrast with why-line and Exposure gain")
	if not _has_verdict_event(summary):
		failures.append("Expected deterministic verdict_reached Evidence event")
	if str(summary.get("locale", "")) != "ko":
		failures.append("Expected playable slice default locale to be ko")
	if not bool(summary.get("outcomeVisible", false)):
		failures.append("Expected verdict outcome panel to become visible")
	if str(summary.get("outcomeTitleKey", "")) != "outcome.verdict.title":
		failures.append("Expected verdict outcome title translation key")
	if str(summary.get("outcomeTitle", "")) != "판정 준비 완료":
		failures.append("Expected Korean verdict outcome title")
	if not str(summary.get("noticeBody", "")).contains("노출도"):
		failures.append("Expected active notice to explain Exposure change")
	if session.has_method("_apply_speech_act") and session.has_method("build_summary"):
		var events_before: Array = summary.get("events", [])
		var event_count_before := events_before.size()
		session.call("_apply_speech_act", "speech_break")
		var post_lock_summary: Dictionary = session.build_summary()
		if int(post_lock_summary.get("exposure", 0)) != int(summary.get("exposure", 0)):
			failures.append("Expected post-verdict speech to leave Exposure unchanged")
		if post_lock_summary.get("events", []).size() != event_count_before:
			failures.append("Expected post-verdict speech to add no Evidence events")
	if player != null and player.has_method("_controls_locked") and not bool(player.call("_controls_locked")):
		failures.append("Expected player controller controls to lock after deterministic session end")
	if failures.size() > 0:
		_fail(failures)
		return
	if not session.has_method("build_evidence_pack"):
		_fail(["PlayableSession is missing build_evidence_pack"])
		return

	var evidence_pack: Dictionary = session.build_evidence_pack(ARTIFACT_PATH)
	var pack_failures := _validate_pack_shape(evidence_pack)
	if pack_failures.size() > 0:
		_fail(pack_failures)
		return
	var playability: Dictionary = evidence_pack.get("playability", {})
	if str(playability.get("deterministicOutcome", "")) != "case_closed":
		_fail(["Evidence Pack playability must include deterministic case_closed outcome"])
		return
	if str(playability.get("visibleWhyLine", "")) != "담당자가 절차 불일치 노트를 엽니다.":
		_fail(["Evidence Pack playability must expose visible why-line text"])
		return
	if not bool(playability.get("inputLocked", false)):
		_fail(["Evidence Pack playability must expose locked post-verdict input state"])
		return
	if str(playability.get("authorityMode", "")) != "godot_local_smoke_runtime":
		_fail(["Evidence Pack playability must identify local Godot smoke runtime authority mode"])
		return
	var pack_end_controls: Dictionary = playability.get("endControls", {})
	if str(pack_end_controls.get("restart", "")) != "restart_session" or str(pack_end_controls.get("quit", "")) != "quit_session":
		_fail(["Evidence Pack playability must expose restart_session and quit_session end controls"])
		return

	var output_path := ProjectSettings.globalize_path(OUTPUT_PATH)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		_fail(["Unable to write playable slice Evidence output: %s" % output_path])
		return
	file.store_string(JSON.stringify(evidence_pack, "\t"))
	file.close()

	print(JSON.stringify({
		"ok": true,
		"artifactPath": ARTIFACT_PATH,
		"runId": evidence_pack["runId"],
		"stage": summary["stage"],
		"exposure": summary["exposure"],
		"events": evidence_pack["events"].size()
	}, "\t"))
	quit(0)

func _validate_pack_shape(pack: Dictionary) -> Array[String]:
	var failures: Array[String] = []
	for key in ["schemaVersion", "runId", "adapter", "sessionId", "worldId", "worldRevision", "createdAtMs", "events", "summaries"]:
		if not pack.has(key):
			failures.append("Evidence Pack is missing %s" % key)
	if pack.get("adapter", "") != "godot":
		failures.append("Evidence Pack adapter must be godot")
	if not pack.get("events", []) is Array:
		failures.append("Evidence Pack events must be an array")
	if not pack.get("summaries", {}) is Dictionary:
		failures.append("Evidence Pack summaries must be a dictionary")
	var has_export_event := false
	for event in pack.get("events", []):
		if not event is Dictionary:
			failures.append("Evidence event must be a dictionary")
			continue
		for key in ["schemaVersion", "eventId", "eventName", "eventFamily", "adapter", "sessionId", "worldId", "worldRevision", "timestampMs", "summary"]:
			if not event.has(key):
				failures.append("Evidence event %s is missing %s" % [str(event.get("eventName", "<unknown>")), key])
		if event.get("eventFamily", "") == "evidence_export":
			has_export_event = true
	if not has_export_event:
		failures.append("Evidence Pack must include an evidence_export event")
	return failures

func _has_safe_contrast(summary: Dictionary) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "cover_test_defused":
			continue
		if str(event.get("speechAct", "")) != "SA_COMPLY":
			continue
		if int(event.get("exposureBefore", -1)) != 0:
			continue
		if int(event.get("exposureAfter", -1)) != 0:
			continue
		if not str(event.get("summary", "")).contains("procedural_speech_log"):
			continue
		return true
	return false

func _has_risky_contrast(summary: Dictionary) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "cover_test_pressure":
			continue
		if str(event.get("speechAct", "")) != "SA_BREAK":
			continue
		if int(event.get("exposureAfter", 0)) <= int(event.get("exposureBefore", 0)):
			continue
		if str(event.get("reasonCode", "")) != "policy_station_intake_requires_procedural_speech":
			continue
		if str(event.get("whyLineKey", "")) != "cover.CT_STATION_SOFT_INQUEST.pressure":
			continue
		if str(event.get("uiWhyLine", "")) != "담당자가 절차 불일치 노트를 엽니다.":
			continue
		return true
	return false

func _has_verdict_event(summary: Dictionary) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "verdict_reached":
			continue
		if str(event.get("sessionOutcome", "")) != "case_closed":
			continue
		if str(event.get("reasonCode", "")) != "policy_station_evidence_threshold_met":
			continue
		if not str(event.get("summary", "")).contains("why-line"):
			continue
		return true
	return false

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
