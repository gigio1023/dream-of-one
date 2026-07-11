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
var _last_error: Dictionary = {}


func _init() -> void:
	_load_fixture()


func start_run(locale: String) -> Dictionary:
	reset()
	var packet := _endpoint("runStart")
	if packet.is_empty():
		return _stored_error("fixture_run_start_missing", "Fixture has no runStart packet.")
	if locale != str(_dictionary_or_empty(packet.get("request")).get("locale", "")):
		return _stored_error("fixture_locale_mismatch", "Fixture does not contain locale: %s" % locale)
	_started = true
	return _dictionary_or_empty(packet.get("response"))


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
	if _ended:
		return _stored_error(
			"conversation_not_ready",
			"Fixture conversation needs a later world event before reopening."
		)
	if _answered:
		return _stored_error("conversation_active", "Fixture conversation is awaiting clean end.")
	_conversation_started = true
	return _dictionary_or_empty(packet.get("response"))


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
	return _dictionary_or_empty(_endpoint("runStart").get("response"))


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
	_last_error = {}


func last_error() -> Dictionary:
	return _last_error.duplicate(true)


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
