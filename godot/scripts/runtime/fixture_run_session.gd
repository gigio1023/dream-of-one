extends RefCounted
## Replays backend-generated, schema-validated RunService packets.
## No player line is classified and no social state is computed in Godot.

const FIXTURE_PATH := "res://data/fixtures/run-api-examples.json"

var _fixture: Dictionary = {}
var _started := false
var _conversation_started := false
var _answered := false
var _ended := false
var _selected_end_response: Dictionary = {}
var _selected_run_snapshot_response: Dictionary = {}
var _selected_end_run_snapshot_response: Dictionary = {}
var _selected_answer_request: Dictionary = {}
var _selected_answer_response: Dictionary = {}
var _advance_index := 0
var _advance_cache: Dictionary = {}
var _preload_cache: Dictionary = {}
var _decision_cache: Dictionary = {}
var _decision_call_count := 0
var _current_run_snapshot: Dictionary = {}
var _last_error: Dictionary = {}


func _init() -> void:
	_load_fixture()


func start_run(locale: String, start_id: String) -> Dictionary:
	reset()
	var packet := _endpoint("runStart")
	if packet.is_empty():
		return _stored_error("fixture_run_start_missing", "Fixture has no runStart packet.")
	var request := _dictionary_or_empty(packet.get("request"))
	if locale != str(request.get("locale", "")):
		return _stored_error("fixture_locale_mismatch", "Fixture does not contain locale: %s" % locale)
	if start_id != str(request.get("startId", "")):
		return _stored_error(
			"fixture_start_id_mismatch",
			"Fixture does not contain startId: %s" % start_id
		)
	_started = true
	_current_run_snapshot = _dictionary_or_empty(packet.get("response"))
	return _current_run_snapshot.duplicate(true)


func start_conversation(
	run_id: String,
	actor_id: String,
	interaction_zone_id: String,
	locale: String
) -> Dictionary:
	if not _started:
		return _stored_error("run_not_started", "Start the fixture run first.")
	var packet := _endpoint("sessionStart")
	var request := _dictionary_or_empty(packet.get("request"))
	if (
		run_id != str(request.get("runId", ""))
		or actor_id != str(request.get("actorId", ""))
		or interaction_zone_id != str(request.get("interactionZoneId", ""))
		or locale != str(request.get("locale", ""))
	):
		return _stored_error("fixture_conversation_miss", "Fixture has no matching conversation start.")
	var preload_signature := JSON.stringify({
		"runId": run_id,
		"actorId": actor_id,
		"interactionZoneId": interaction_zone_id,
		"locale": locale,
	})
	if not _preload_cache.has(preload_signature):
		return _stored_error(
			"conversation_not_ready",
			"Fixture conversation opening was not preloaded."
		)
	if _ended:
		return _stored_error(
			"conversation_not_ready",
			"Fixture conversation needs a later world event before reopening."
		)
	if _answered:
		return _stored_error("conversation_active", "Fixture conversation is awaiting clean end.")
	_conversation_started = true
	return _dictionary_or_empty(packet.get("response"))


func preload_conversation(
	run_id: String,
	actor_id: String,
	interaction_zone_id: String,
	locale: String
) -> Dictionary:
	if not _started:
		return _stored_error("run_not_started", "Start the fixture run first.")
	var signature := JSON.stringify({
		"runId": run_id,
		"actorId": actor_id,
		"interactionZoneId": interaction_zone_id,
		"locale": locale,
	})
	var session_start_request := _dictionary_or_empty(_endpoint("sessionStart").get("request"))
	if _ended and actor_id == str(session_start_request.get("actorId", "")):
		return _stored_error(
			"conversation_not_ready",
			"Fixture conversation evidence was already consumed."
		)
	if _preload_cache.has(signature):
		var cached_response := _dictionary_or_empty(_preload_cache.get(signature))
		var current_actor := _snapshot_actor(actor_id)
		if (
			not bool(current_actor.get("playerConversationReady", false))
			and int(cached_response.get("worldRevision", 0))
			< int(_current_run_snapshot.get("worldRevision", 0))
		):
			return _stored_error(
				"conversation_not_ready",
				"Fixture has no refreshed opening for the actor's newer evidence."
			)
		_last_error = {}
		return cached_response
	for packet_value in _preload_variants():
		if not packet_value is Dictionary:
			continue
		var packet := packet_value as Dictionary
		var request := _dictionary_or_empty(packet.get("request"))
		if signature != JSON.stringify({
			"runId": str(request.get("runId", "")),
			"actorId": str(request.get("actorId", "")),
			"interactionZoneId": str(request.get("interactionZoneId", "")),
			"locale": str(request.get("locale", "")),
		}):
			continue
		var response := _dictionary_or_empty(packet.get("response"))
		if response.is_empty():
			return _stored_error(
				"fixture_conversation_preload_missing",
				"Fixture conversation preload has no response."
			)
		_preload_cache[signature] = response.duplicate(true)
		_current_run_snapshot["worldRevision"] = maxi(
			int(_current_run_snapshot.get("worldRevision", 0)),
			int(response.get("worldRevision", 0))
		)
		_patch_snapshot_actor(_dictionary_or_empty(response.get("actor")))
		_last_error = {}
		return response.duplicate(true)
	return _stored_error(
		"fixture_conversation_preload_miss",
		"Fixture has no matching conversation preload."
	)


func answer(
	run_id: String,
	session_id: String,
	turn_id: String,
	answer_payload: Dictionary
) -> Dictionary:
	if not _conversation_started:
		return _stored_error("session_not_found", "Fixture conversation is not active.")
	if _answered:
		if (
			run_id == str(_selected_answer_request.get("runId", ""))
			and session_id == str(_selected_answer_request.get("sessionId", ""))
			and turn_id == str(_selected_answer_request.get("turnId", ""))
			and _answer_matches(
				_dictionary_or_empty(_selected_answer_request.get("answer")),
				answer_payload
			)
		):
			return _selected_answer_response.duplicate(true)
		return _stored_error("unexpected_turn", "A resolved fixture turn cannot accept another answer.")
	if _ended:
		return _stored_error("session_ended", "Fixture conversation has ended.")
	for variant_value in _answer_variants():
		if not variant_value is Dictionary:
			continue
		var variant := variant_value as Dictionary
		var request := _dictionary_or_empty(variant.get("request"))
		if (
			run_id == str(request.get("runId", ""))
			and session_id == str(request.get("sessionId", ""))
			and turn_id == str(request.get("turnId", ""))
			and _answer_matches(_dictionary_or_empty(request.get("answer")), answer_payload)
		):
			_answered = true
			_selected_answer_request = request.duplicate(true)
			_selected_answer_response = _dictionary_or_empty(variant.get("response"))
			_selected_end_response = _dictionary_or_empty(variant.get("endResponse"))
			_selected_run_snapshot_response = _dictionary_or_empty(
				variant.get("runSnapshotResponse")
			)
			_selected_end_run_snapshot_response = _dictionary_or_empty(
				variant.get("endRunSnapshotResponse")
			)
			_last_error = {}
			return _selected_answer_response.duplicate(true)
	return _stored_error("fixture_replay_miss", "Fixture has no authoritative response for that answer.")


func end_conversation(run_id: String, session_id: String) -> Dictionary:
	if not _conversation_started:
		return _stored_error("session_not_found", "Fixture conversation was not started.")
	var packet := _endpoint("sessionEnd")
	var request := _dictionary_or_empty(packet.get("request"))
	if run_id != str(request.get("runId", "")) or session_id != str(request.get("sessionId", "")):
		return _stored_error("fixture_end_miss", "Fixture has no matching session end.")
	if not _answered:
		return _stored_error("session_still_active", "Answer the active fixture turn before ending it.")
	if _ended and not _selected_end_response.is_empty():
		return _selected_end_response.duplicate(true)
	var response := _selected_end_response
	if response.is_empty():
		response = _dictionary_or_empty(packet.get("response"))
	if response.is_empty():
		return _stored_error("fixture_end_missing", "Fixture answer has no end response.")
	_ended = true
	_selected_end_response = response.duplicate(true)
	_last_error = {}
	return response.duplicate(true)


func run_snapshot(run_id: String) -> Dictionary:
	var expected_run_id := str(
		_dictionary_or_empty(_endpoint("runStart").get("response")).get("runId", "")
	)
	if run_id != expected_run_id:
		return _stored_error("run_not_found", "Fixture has no run: %s" % run_id)
	if _ended and not _selected_end_run_snapshot_response.is_empty():
		return _selected_end_run_snapshot_response.duplicate(true)
	if _answered and not _selected_run_snapshot_response.is_empty():
		return _selected_run_snapshot_response.duplicate(true)
	if not _current_run_snapshot.is_empty():
		return _current_run_snapshot.duplicate(true)
	return _dictionary_or_empty(_endpoint("runStart").get("response"))


func advance(request: Dictionary) -> Dictionary:
	if not _started:
		return _stored_error("run_not_started", "Start the fixture run first.")
	var advance_id := str(request.get("advanceId", ""))
	if _advance_cache.has(advance_id):
		var cached := _dictionary_or_empty(_advance_cache.get(advance_id))
		if _advance_request_signature(request) == _advance_request_signature(
			_dictionary_or_empty(cached.get("request"))
		):
			_last_error = {}
			return _dictionary_or_empty(cached.get("response"))
		return _stored_error(
			"advance_id_conflict",
			"Fixture advanceId was reused with a different payload."
		)
	if _conversation_started and not _ended:
		return _stored_error("run_paused", "Fixture run is paused by conversation.")
	var sequence := _advance_sequence()
	if _advance_index >= sequence.size():
		return _stored_error(
			"fixture_replay_complete",
			"Fixture advance replay has reached its bounded end."
		)
	var packet_value: Variant = sequence[_advance_index]
	if not packet_value is Dictionary:
		return _stored_error("fixture_advance_invalid", "Fixture advance packet is invalid.")
	var packet := packet_value as Dictionary
	var expected_request := _dictionary_or_empty(packet.get("request"))
	if _advance_request_signature(request) != _advance_request_signature(expected_request):
		return _stored_error(
			"fixture_advance_miss",
			"Fixture has no authoritative response for that advance packet."
		)
	var response := _dictionary_or_empty(packet.get("response"))
	if response.is_empty():
		return _stored_error("fixture_advance_missing", "Fixture advance has no response.")
	_advance_index += 1
	_advance_cache[advance_id] = {
		"request": expected_request.duplicate(true),
		"response": response.duplicate(true),
	}
	_apply_advance_to_snapshot(response)
	_last_error = {}
	return response.duplicate(true)


func npc_decision(request: Dictionary) -> Dictionary:
	if not _started:
		return _stored_error("run_not_started", "Start the fixture run first.")
	var packet := _endpoint("npcDecision")
	if packet.is_empty():
		return _stored_error(
			"fixture_npc_decision_missing",
			"Fixture has no npcDecision packet."
		)
	var expected_request := _dictionary_or_empty(packet.get("request"))
	var signature := _decision_request_signature(request)
	if signature != _decision_request_signature(expected_request):
		return _stored_error(
			"fixture_npc_decision_miss",
			"Fixture has no authoritative response for that NPC decision."
		)
	if _decision_cache.has(signature):
		_last_error = {}
		return _dictionary_or_empty(_decision_cache.get(signature))
	var response := _dictionary_or_empty(packet.get("response"))
	if response.is_empty():
		return _stored_error(
			"fixture_npc_decision_missing",
			"Fixture NPC decision has no response."
		)
	_decision_cache[signature] = response.duplicate(true)
	_decision_call_count += 1
	_apply_decision_to_snapshot(response)
	_last_error = {}
	return response.duplicate(true)


func reset() -> void:
	_started = false
	_conversation_started = false
	_answered = false
	_ended = false
	_selected_end_response = {}
	_selected_run_snapshot_response = {}
	_selected_end_run_snapshot_response = {}
	_selected_answer_request = {}
	_selected_answer_response = {}
	_advance_index = 0
	_advance_cache = {}
	_preload_cache = {}
	_decision_cache = {}
	_decision_call_count = 0
	_current_run_snapshot = {}
	_last_error = {}


func last_error() -> Dictionary:
	return _last_error.duplicate(true)


func diagnostics_snapshot() -> Dictionary:
	var session_end_response := _dictionary_or_empty(_endpoint("sessionEnd").get("response"))
	return {
		"advanceIndex": _advance_index,
		"preloadCount": _preload_cache.size(),
		"decisionCallCount": _decision_call_count,
		"sessionEndRevision": int(session_end_response.get("worldRevision", -1)),
	}


func _load_fixture() -> void:
	if not FileAccess.file_exists(FIXTURE_PATH):
		_last_error = _error("fixture_missing", "Missing fixture: %s" % FIXTURE_PATH)
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE_PATH))
	if not parsed is Dictionary:
		_last_error = _error("fixture_invalid", "Run fixture JSON could not be parsed.")
		return
	_fixture = parsed as Dictionary


func _endpoint(name: String) -> Dictionary:
	var endpoints := _dictionary_or_empty(_fixture.get("endpoints"))
	return _dictionary_or_empty(endpoints.get(name))


func _answer_variants() -> Array:
	var variants_value: Variant = _fixture.get("sessionAnswerVariants", [])
	if variants_value is Array and not (variants_value as Array).is_empty():
		return variants_value as Array
	var endpoint := _endpoint("sessionAnswer")
	return [endpoint] if not endpoint.is_empty() else []


func _preload_variants() -> Array:
	var endpoints := _dictionary_or_empty(_fixture.get("endpoints"))
	var variants_value: Variant = endpoints.get("sessionPreloads", [])
	return variants_value as Array if variants_value is Array else []


func _advance_sequence() -> Array:
	var sequence_value: Variant = _fixture.get("runAdvanceSequence", [])
	return sequence_value as Array if sequence_value is Array else []


func _apply_advance_to_snapshot(response: Dictionary) -> void:
	if _current_run_snapshot.is_empty():
		return
	_current_run_snapshot["worldRevision"] = maxi(
		int(_current_run_snapshot.get("worldRevision", 0)),
		int(response.get("worldRevision", 0))
	)
	var clock := _dictionary_or_empty(_current_run_snapshot.get("worldClock"))
	var response_clock := _dictionary_or_empty(response.get("clock"))
	if not response_clock.is_empty():
		clock["elapsedSeconds"] = float(response_clock.get(
			"toSeconds",
			clock.get("elapsedSeconds", 0)
		))
		clock["paused"] = false
		_current_run_snapshot["worldClock"] = clock
	var scheduler := _dictionary_or_empty(response.get("scheduler"))
	if not scheduler.is_empty():
		_current_run_snapshot["scheduler"] = scheduler.duplicate(true)
	for readiness_value in _array_or_empty(response.get("actorReadinessDeltas")):
		if readiness_value is Dictionary:
			_patch_snapshot_actor(readiness_value as Dictionary)
	for arrival_value in _array_or_empty(response.get("arrivalsApplied")):
		if not arrival_value is Dictionary:
			continue
		var arrival := arrival_value as Dictionary
		_patch_snapshot_actor({
			"actorId": str(arrival.get("actorId", "")),
			"locationId": str(arrival.get("locationId", "")),
		})
	_apply_ambient_to_snapshot(
		_array_or_empty(response.get("ambientSpeechEvents")),
		int(response.get("ambientSpeechCursor", 0)),
		null
	)


func _apply_decision_to_snapshot(response: Dictionary) -> void:
	if _current_run_snapshot.is_empty():
		return
	_current_run_snapshot["worldRevision"] = maxi(
		int(_current_run_snapshot.get("worldRevision", 0)),
		int(response.get("worldRevision", 0))
	)
	_apply_ambient_to_snapshot(
		_array_or_empty(response.get("speechEvents")),
		_highest_speech_seq(_array_or_empty(response.get("speechEvents"))),
		null
	)
	for readiness_value in _array_or_empty(response.get("actorReadinessDeltas")):
		if readiness_value is Dictionary:
			_patch_snapshot_actor(readiness_value as Dictionary)


func _apply_ambient_to_snapshot(
	events: Array,
	cursor: int,
	active_conversation: Variant
) -> void:
	var ambient := _dictionary_or_empty(_current_run_snapshot.get("ambientSpeech"))
	var existing_events := _array_or_empty(ambient.get("events"))
	var by_seq: Dictionary = {}
	for event_value in existing_events:
		if event_value is Dictionary:
			by_seq[int((event_value as Dictionary).get("seq", -1))] = (
				(event_value as Dictionary).duplicate(true)
			)
	for event_value in events:
		if event_value is Dictionary:
			by_seq[int((event_value as Dictionary).get("seq", -1))] = (
				(event_value as Dictionary).duplicate(true)
			)
	var merged: Array = by_seq.values()
	merged.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a.get("seq", -1)) < int(b.get("seq", -1))
	)
	ambient["events"] = merged
	ambient["cursor"] = maxi(
		int(ambient.get("cursor", 0)),
		maxi(cursor, _highest_speech_seq(merged))
	)
	if active_conversation != null:
		ambient["activeConversation"] = active_conversation
	elif not ambient.has("activeConversation"):
		ambient["activeConversation"] = null
	_current_run_snapshot["ambientSpeech"] = ambient


func _patch_snapshot_actor(patch: Dictionary) -> void:
	var actors_value: Variant = _current_run_snapshot.get("actors", [])
	if not actors_value is Array:
		return
	var actors := actors_value as Array
	for index in actors.size():
		var actor_value: Variant = actors[index]
		if (
			actor_value is Dictionary
			and str((actor_value as Dictionary).get("actorId", ""))
			== str(patch.get("actorId", ""))
		):
			var actor := (actor_value as Dictionary).duplicate(true)
			for key in patch:
				if key != "actorId":
					actor[key] = patch[key]
			actors[index] = actor
			return


func _snapshot_actor(actor_id: String) -> Dictionary:
	for actor_value in _array_or_empty(_current_run_snapshot.get("actors")):
		if (
			actor_value is Dictionary
			and str((actor_value as Dictionary).get("actorId", "")) == actor_id
		):
			return (actor_value as Dictionary).duplicate(true)
	return {}


func _advance_request_signature(request: Dictionary) -> String:
	var arrivals: Array = _array_or_empty(request.get("arrivals"))
	arrivals.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		if str(a.get("actorId", "")) == str(b.get("actorId", "")):
			return str(a.get("movementId", "")) < str(b.get("movementId", ""))
		return str(a.get("actorId", "")) < str(b.get("actorId", ""))
	)
	var normalized_arrivals: Array = []
	for arrival_value in arrivals:
		if arrival_value is Dictionary:
			var arrival := arrival_value as Dictionary
			normalized_arrivals.append({
				"movementId": str(arrival.get("movementId", "")),
				"actorId": str(arrival.get("actorId", "")),
				"anchorRef": str(arrival.get("anchorRef", "")),
			})
	return JSON.stringify({
		"runId": str(request.get("runId", "")),
		"advanceId": str(request.get("advanceId", "")),
		"observedWorldRevision": int(request.get("observedWorldRevision", -1)),
		"afterSpeechSeq": int(request.get("afterSpeechSeq", 0)),
		"elapsedSeconds": float(request.get("elapsedSeconds", -1.0)),
		"arrivals": normalized_arrivals,
	})


func _decision_request_signature(request: Dictionary) -> String:
	return JSON.stringify({
		"runId": str(request.get("runId", "")),
		"wakeId": str(request.get("wakeId", "")),
		"observedWorldRevision": int(request.get("observedWorldRevision", -1)),
	})


func _highest_speech_seq(events: Array) -> int:
	var highest := 0
	for event_value in events:
		if event_value is Dictionary:
			highest = maxi(highest, int((event_value as Dictionary).get("seq", 0)))
	return highest


func _answer_matches(expected: Dictionary, actual: Dictionary) -> bool:
	var answer_type := str(expected.get("type", ""))
	if answer_type != str(actual.get("type", "")):
		return false
	if answer_type == "choice":
		return str(expected.get("choiceId", "")) == str(actual.get("choiceId", ""))
	if answer_type == "free_input":
		return (
			str(expected.get("text", "")).strip_edges()
			== str(actual.get("text", "")).strip_edges()
		)
	return false


func _stored_error(code: String, message: String) -> Dictionary:
	_last_error = _error(code, message)
	return _last_error.duplicate(true)


func _error(code: String, message: String) -> Dictionary:
	return {"error": code, "message": message}


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _array_or_empty(value: Variant) -> Array:
	return (value as Array).duplicate(true) if value is Array else []
