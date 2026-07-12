extends SceneTree

## Live-provider-free process-boundary proof for the M3R Run API.
##
## A wrapper starts the scripted localhost sidecar and forces RunSession3D's
## real HTTP backend. This smoke verifies that one exact-six physical fact
## crosses that boundary and reconciles into the authoritative run snapshot.

const RUN_SESSION_SCRIPT := preload("res://scripts/runtime/run_session.gd")
const EXPECTED_ACTOR_IDS := [
	"NPC_Office_Worker",
	"NPC_Park_Caretaker",
	"NPC_Roaming_Liaison",
	"NPC_Station_Officer",
	"NPC_Studio_Manager",
	"NPC_Studio_Receptionist",
]
const PROP_ID := "Prop_Studio_Keyboard"
const PROP_EVENT_ID := "godot-http-prop-event-1"

var _run_session: Node


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await process_frame
	_run_session = RUN_SESSION_SCRIPT.new()
	_run_session.name = "RunApiHttpSmokeSession"
	root.add_child(_run_session)
	await process_frame

	if str(_run_session.call("mode")) != "http":
		await _abort("RunSession3D did not select its HTTP backend")
		return

	var started: Dictionary = await _run_session.call(
		"start_run",
		"ko-KR",
		"godot-http-parity-start-%d" % OS.get_process_id()
	)
	if _has_error(started):
		await _abort("/v1/run/start failed: %s" % JSON.stringify(started))
		return
	var run_id := str(started.get("runId", ""))
	var initial_revision := int(started.get("worldRevision", -1))
	var actor_ids := _actor_ids(started.get("actors", []))
	if run_id.is_empty() or str(started.get("runStatus", "")) != "active":
		await _abort("/v1/run/start returned no active run")
		return
	if initial_revision < 0:
		await _abort("/v1/run/start returned no world revision")
		return
	if actor_ids != EXPECTED_ACTOR_IDS:
		await _abort("/v1/run/start actor ids drifted: %s" % JSON.stringify(actor_ids))
		return
	var initial_clock := _dictionary_or_empty(started.get("worldClock"))
	var initial_speech := _dictionary_or_empty(started.get("ambientSpeech"))
	var initial_seconds := float(initial_clock.get("elapsedSeconds", -1.0))
	var initial_speech_cursor := int(initial_speech.get("cursor", -1))
	if initial_seconds < 0.0 or initial_speech_cursor < 0:
		await _abort("/v1/run/start omitted clock or ambient event cursor")
		return

	var observers: Array[Dictionary] = []
	for actor_id in actor_ids:
		observers.append({"actorId": actor_id, "visible": true})
	var advanced: Dictionary = await _run_session.call("advance", {
		"runId": run_id,
		"advanceId": "godot-http-parity-advance-1",
		"observedWorldRevision": initial_revision,
		"afterSpeechSeq": initial_speech_cursor,
		"elapsedSeconds": 10.0,
		"arrivals": [],
		"propHandlingEvents": [{
			"eventId": PROP_EVENT_ID,
			"propId": PROP_ID,
			"action": "pick_up",
			"playerPosition": [0.0, 0.0, 0.0],
			"objectPosition": [0.0, 0.8, 0.0],
			"observedWorldRevision": initial_revision,
			"observers": observers,
		}],
	})
	if _has_error(advanced):
		await _abort("/v1/run/advance failed: %s" % JSON.stringify(advanced))
		return
	var advanced_revision := int(advanced.get("worldRevision", -1))
	if (
		str(advanced.get("runId", "")) != run_id
		or int(advanced.get("previousWorldRevision", -1)) != initial_revision
		or advanced_revision <= initial_revision
	):
		await _abort("/v1/run/advance did not advance the expected run revision")
		return
	var clock := _dictionary_or_empty(advanced.get("clock"))
	if (
		not is_equal_approx(float(clock.get("fromSeconds", -1.0)), initial_seconds)
		or not is_equal_approx(float(clock.get("toSeconds", -1.0)), initial_seconds + 10.0)
		or not is_equal_approx(float(clock.get("appliedElapsedSeconds", -1.0)), 10.0)
	):
		await _abort("/v1/run/advance clock cursor did not move by ten seconds")
		return
	var accepted_event_ids := _string_array(advanced.get("acceptedPropEventIds", []))
	if accepted_event_ids != [PROP_EVENT_ID]:
		await _abort("/v1/run/advance did not accept the exact prop event")
		return
	if not await _check_prop_memories(advanced.get("propObservationMemories", []), actor_ids):
		return

	var prop_snapshot: Dictionary = await _run_session.call("run_snapshot", run_id)
	if _has_error(prop_snapshot):
		await _abort("/v1/run/snapshot failed: %s" % JSON.stringify(prop_snapshot))
		return
	if (
		str(prop_snapshot.get("runId", "")) != run_id
		or int(prop_snapshot.get("worldRevision", -1)) != advanced_revision
		or str(prop_snapshot.get("runStatus", "")) != "active"
	):
		await _abort("/v1/run/snapshot did not reconcile the advanced run")
		return
	var snapshot_clock := _dictionary_or_empty(prop_snapshot.get("worldClock"))
	if not is_equal_approx(
		float(snapshot_clock.get("elapsedSeconds", -1.0)),
		float(clock.get("toSeconds", -2.0))
	):
		await _abort("/v1/run/snapshot clock disagrees with the advance response")
		return
	var snapshot_speech := _dictionary_or_empty(prop_snapshot.get("ambientSpeech"))
	if int(snapshot_speech.get("cursor", -1)) != int(advanced.get("ambientSpeechCursor", -2)):
		await _abort("/v1/run/snapshot ambient event cursor disagrees with advance")
		return
	if not await _check_snapshot_actor_memories(prop_snapshot.get("actors", []), actor_ids):
		return
	var provider_budget := _dictionary_or_empty(prop_snapshot.get("providerBudget"))
	if (
		int(provider_budget.get("callsUsed", -1)) != 0
		or int(provider_budget.get("tokensUsed", -1)) != 0
		or prop_snapshot.get("lastProposalMeta") != null
	):
		await _abort("prop-only HTTP parity unexpectedly spent a provider call")
		return
	if not await _check_empty_complete_provider_audit(
		prop_snapshot.get("providerAudit"),
		"prop-only snapshot"
	):
		return
	if not await _check_provider_runtime_trace(
		prop_snapshot.get("providerRuntimeTrace"),
		0,
		""
	):
		return

	# Advance the deterministic schedule to its first meeting and report every
	# issued movement as an engine-confirmed arrival. The resulting decision is
	# still wholly scripted, but it proves an actual event cursor change across
	# the HTTP boundary instead of merely reconciling cursor zero.
	var latest := advanced
	var meeting_wake: Dictionary = {}
	for step in range(1, 10):
		if step > 1:
			latest = await _run_session.call("advance", {
				"runId": run_id,
				"advanceId": "godot-http-meeting-clock-%d" % step,
				"observedWorldRevision": int(latest.get("worldRevision", -1)),
				"afterSpeechSeq": initial_speech_cursor,
				"elapsedSeconds": 10.0,
				"arrivals": [],
			})
			if _has_error(latest):
				await _abort("meeting clock advance failed: %s" % JSON.stringify(latest))
				return
		meeting_wake = _find_schedule_wake(latest.get("scheduleWakes", []), "meeting_ready")
		var arrivals := _movement_arrivals(latest.get("movementDeltas", []))
		if not arrivals.is_empty():
			latest = await _run_session.call("advance", {
				"runId": run_id,
				"advanceId": "godot-http-meeting-arrivals-%d" % step,
				"observedWorldRevision": int(latest.get("worldRevision", -1)),
				"afterSpeechSeq": initial_speech_cursor,
				"elapsedSeconds": 0.0,
				"arrivals": arrivals,
			})
			if _has_error(latest):
				await _abort("meeting arrival advance failed: %s" % JSON.stringify(latest))
				return
			meeting_wake = _find_schedule_wake(
				latest.get("scheduleWakes", []),
				"meeting_ready"
			)
		if not meeting_wake.is_empty():
			break
	if meeting_wake.is_empty():
		await _abort("scripted Run API never produced a meeting_ready wake")
		return

	var decision: Dictionary = await _run_session.call("npc_decision", {
		"runId": run_id,
		"wakeId": str(meeting_wake.get("wakeId", "")),
		"observedWorldRevision": int(meeting_wake.get("observedWorldRevision", -1)),
	})
	if _has_error(decision):
		await _abort("/v1/npc/decision failed: %s" % JSON.stringify(decision))
		return
	var speech_events := _array_or_empty(decision.get("speechEvents"))
	if str(decision.get("status", "")) != "completed" or speech_events.size() != 2:
		await _abort("/v1/npc/decision did not complete two scripted utterances")
		return
	var last_speech := _dictionary_or_empty(speech_events[-1])
	var advanced_speech_cursor := int(last_speech.get("seq", -1))
	if advanced_speech_cursor <= initial_speech_cursor:
		await _abort("/v1/npc/decision did not advance the ambient speech cursor")
		return
	if not await _check_scripted_provider_metas(decision.get("providerMetas", [])):
		return

	var snapshot: Dictionary = await _run_session.call("run_snapshot", run_id)
	if _has_error(snapshot):
		await _abort("post-decision /v1/run/snapshot failed: %s" % JSON.stringify(snapshot))
		return
	if int(snapshot.get("worldRevision", -1)) != int(decision.get("worldRevision", -2)):
		await _abort("post-decision snapshot world revision did not reconcile")
		return
	var final_speech := _dictionary_or_empty(snapshot.get("ambientSpeech"))
	if int(final_speech.get("cursor", -1)) != advanced_speech_cursor:
		await _abort("post-decision snapshot did not retain the advanced speech cursor")
		return
	if not await _check_snapshot_actor_memories(snapshot.get("actors", []), actor_ids):
		return
	var last_meta := _dictionary_or_empty(snapshot.get("lastProposalMeta"))
	if (
		str(last_meta.get("transport", "")) != "scripted"
		or bool(last_meta.get("usedFallback", true))
	):
		await _abort("post-decision snapshot did not retain scripted/no-fallback provenance")
		return
	if not await _check_empty_complete_provider_audit(
		snapshot.get("providerAudit"),
		"scripted decision snapshot"
	):
		return
	if not await _check_provider_runtime_trace(
		snapshot.get("providerRuntimeTrace"),
		2,
		"scripted"
	):
		return

	await _dispose_session()
	print(
		"PASS run_api_http_smoke: RunSession3D HTTP start/advance/snapshot "
		+ "reconciled one exact-six prop event and an advanced scripted speech cursor"
	)
	quit(0)


func _check_prop_memories(value: Variant, expected_actor_ids: Array) -> bool:
	if not value is Array:
		await _abort("/v1/run/advance propObservationMemories is not an array")
		return false
	var memories := value as Array
	if memories.size() != EXPECTED_ACTOR_IDS.size():
		await _abort("/v1/run/advance did not return six prop observation memories")
		return false
	var listener_ids: Array[String] = []
	for memory_value in memories:
		if not memory_value is Dictionary:
			await _abort("/v1/run/advance returned a malformed prop memory")
			return false
		var memory := memory_value as Dictionary
		if (
			str(memory.get("kind", "")) != "prop_handling_observation"
			or str(memory.get("sourceActorId", "")) != "player"
			or str(memory.get("eventId", "")) != PROP_EVENT_ID
			or str(memory.get("propId", "")) != PROP_ID
			or str(memory.get("action", "")) != "pick_up"
		):
			await _abort("/v1/run/advance returned the wrong prop observation fact")
			return false
		listener_ids.append(str(memory.get("listenerActorId", "")))
	listener_ids.sort()
	if listener_ids != expected_actor_ids:
		await _abort("/v1/run/advance listener ids drifted: %s" % JSON.stringify(listener_ids))
		return false
	return true


func _check_snapshot_actor_memories(value: Variant, expected_actor_ids: Array) -> bool:
	if not value is Array or (value as Array).size() != EXPECTED_ACTOR_IDS.size():
		await _abort("/v1/run/snapshot did not retain exactly six actors")
		return false
	var actor_ids: Array[String] = []
	for actor_value in value as Array:
		if not actor_value is Dictionary:
			await _abort("/v1/run/snapshot returned a malformed actor")
			return false
		var actor := actor_value as Dictionary
		var actor_id := str(actor.get("actorId", ""))
		actor_ids.append(actor_id)
		var matching_memories := 0
		for memory_value in _array_or_empty(actor.get("memories")):
			if (
				memory_value is Dictionary
				and str((memory_value as Dictionary).get("eventId", "")) == PROP_EVENT_ID
			):
				matching_memories += 1
		if matching_memories != 1:
			await _abort(
				"/v1/run/snapshot actor %s retained %d matching prop memories"
				% [actor_id, matching_memories]
			)
			return false
	actor_ids.sort()
	if actor_ids != expected_actor_ids:
		await _abort("/v1/run/snapshot actor ids drifted: %s" % JSON.stringify(actor_ids))
		return false
	return true


func _check_scripted_provider_metas(value: Variant) -> bool:
	if not value is Array or (value as Array).size() != 2:
		await _abort("ambient decision did not return two provider provenance entries")
		return false
	for meta_value in value as Array:
		if not meta_value is Dictionary:
			await _abort("ambient decision returned malformed provider provenance")
			return false
		var meta := meta_value as Dictionary
		if str(meta.get("transport", "")) != "scripted" or bool(meta.get("usedFallback", true)):
			await _abort("ambient decision used non-scripted or fallback provider provenance")
			return false
	return true


func _check_empty_complete_provider_audit(value: Variant, label: String) -> bool:
	if not value is Dictionary:
		await _abort("%s omitted providerAudit" % label)
		return false
	var audit := value as Dictionary
	if (
		int(audit.get("callsUsed", -1)) != 0
		or int(audit.get("tokensUsed", -1)) != 0
		or int(audit.get("inFlightCalls", -1)) != 0
		or int(audit.get("inFlightTokens", -1)) != 0
		or not bool(audit.get("complete", false))
		or bool(audit.get("truncated", true))
		or int(audit.get("droppedCount", -1)) != 0
		or not _array_or_empty(audit.get("calls")).is_empty()
		or not _array_or_empty(audit.get("resolutions")).is_empty()
	):
		await _abort("%s providerAudit is not empty and complete" % label)
		return false
	return true


func _check_provider_runtime_trace(
	value: Variant,
	expected_entry_count: int,
	expected_transport: String
) -> bool:
	if not value is Dictionary:
		await _abort("snapshot omitted providerRuntimeTrace")
		return false
	var trace := value as Dictionary
	var entries := _array_or_empty(trace.get("entries"))
	if (
		not bool(trace.get("complete", false))
		or bool(trace.get("truncated", true))
		or int(trace.get("droppedCount", -1)) != 0
		or entries.size() != expected_entry_count
	):
		await _abort("providerRuntimeTrace is not complete at the expected size")
		return false
	for index in entries.size():
		var entry_value: Variant = entries[index]
		if not entry_value is Dictionary:
			await _abort("providerRuntimeTrace contains a malformed entry")
			return false
		var entry := entry_value as Dictionary
		var meta := _dictionary_or_empty(entry.get("meta"))
		if (
			int(entry.get("seq", -1)) != index + 1
			or str(meta.get("transport", "")) != expected_transport
			or bool(meta.get("usedFallback", true))
		):
			await _abort("providerRuntimeTrace provenance drifted")
			return false
	return true


func _movement_arrivals(value: Variant) -> Array[Dictionary]:
	var arrivals: Array[Dictionary] = []
	if not value is Array:
		return arrivals
	for movement_value in value as Array:
		if not movement_value is Dictionary:
			continue
		var movement := movement_value as Dictionary
		arrivals.append({
			"movementId": str(movement.get("movementId", "")),
			"actorId": str(movement.get("actorId", "")),
			"anchorRef": str(movement.get("targetAnchorRef", "")),
		})
	return arrivals


func _find_schedule_wake(value: Variant, kind: String) -> Dictionary:
	if not value is Array:
		return {}
	for wake_value in value as Array:
		if wake_value is Dictionary and str((wake_value as Dictionary).get("kind", "")) == kind:
			return (wake_value as Dictionary).duplicate(true)
	return {}


func _actor_ids(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not value is Array:
		return result
	for actor_value in value as Array:
		if actor_value is Dictionary:
			result.append(str((actor_value as Dictionary).get("actorId", "")))
	result.sort()
	return result


func _string_array(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if value is Array:
		for entry in value as Array:
			result.append(str(entry))
	return result


func _array_or_empty(value: Variant) -> Array:
	return (value as Array) if value is Array else []


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary) if value is Dictionary else {}


func _has_error(response: Dictionary) -> bool:
	return not str(response.get("error", "")).is_empty()


func _abort(message: String) -> void:
	push_error(message)
	await _dispose_session()
	quit(1)


func _dispose_session() -> void:
	if is_instance_valid(_run_session):
		_run_session.queue_free()
		await process_frame
	_run_session = null
