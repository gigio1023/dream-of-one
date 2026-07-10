extends Node
## Session autoload: one asynchronous facade for fixture replay and live HTTP.
## Successful method results are the live Session API dictionaries unchanged.
## current_beat_view adds only presentation aliases used by the Godot HUD.

const FixtureSession := preload("res://scripts/runtime/fixture_session.gd")
const HttpSession := preload("res://scripts/runtime/http_session.gd")
const INPUT_MAX_LENGTH := 40

signal session_started(world_snapshot: Dictionary)
signal beat_opened(beat_view: Dictionary)
signal answer_resolved(result: Dictionary)
signal ledger_event(event: Dictionary)
signal npc_reaction(reaction: Dictionary)
signal npc_decision_resolved(result: Dictionary)
signal location_transition(location_id: String)
signal route_ended(end_result: Dictionary)
signal request_failed(operation: String, error: Dictionary)

var _backend: Object = null
var _mode := "http"
var _session_id := ""
var _started := false
var _end_emitted := false
var _last_world_snapshot: Dictionary = {}
var _active_location_id := ""

func _ready() -> void:
	_mode = _resolve_mode()
	if _mode == "http":
		_backend = HttpSession.new()
		add_child(_backend)
		_backend.configure(_resolve_http_base())
	else:
		_mode = "fixture"
		_backend = FixtureSession.new()

func mode() -> String:
	return _mode

func is_started() -> bool:
	return _started

func session_id() -> String:
	return _session_id

## POST /v1/session/start. All public transport methods defer one frame so
## callers consistently use `await Session.start_session(...)` in both modes.
func start_session(storylet_id := "same-order", locale := "ko-KR") -> Dictionary:
	await get_tree().process_frame
	var result: Dictionary = await _backend.start(storylet_id, locale)
	if _emit_failure("start", result):
		return result
	_session_id = str(result.get("sessionId", ""))
	_started = true
	_end_emitted = false
	_last_world_snapshot = _dictionary_or_empty(result.get("worldSnapshot"))
	_active_location_id = _location_for_turn(_backend.current_beat(_session_id))
	session_started.emit(_last_world_snapshot.duplicate(true))
	_emit_ledger_events(result)
	return result

## Presentation view for the current live nextTurn, or {} after terminal state.
## `actorId` and `allowFreeInput` are stable HUD aliases; wire fields remain.
func current_beat_view() -> Dictionary:
	return _to_beat_view(_backend.current_beat(_session_id))

func open_current_beat() -> Dictionary:
	var view := current_beat_view()
	if not view.is_empty():
		beat_opened.emit(view)
	return view

## POST /v1/session/answer using the backend-issued nextTurn.turnId.
func answer(answer_payload: Dictionary) -> Dictionary:
	await get_tree().process_frame
	if not _started:
		return _local_failure("answer", "session_not_started", "Start a session before answering.")
	var current_turn: Dictionary = _backend.current_beat(_session_id)
	var turn_id := str(current_turn.get("turnId", ""))
	if turn_id.is_empty():
		return _local_failure("answer", "no_active_turn", "The session has no active turn.")
	var result: Dictionary = await _backend.answer(_session_id, turn_id, answer_payload)
	if _emit_failure("answer", result):
		return result
	_emit_ledger_events(result)
	for reaction in result.get("npcReactions", []):
		if reaction is Dictionary:
			npc_reaction.emit(reaction)
	answer_resolved.emit(result)

	var next_turn := _dictionary_or_empty(result.get("nextTurn"))
	_emit_location_if_changed(next_turn)
	var route_state := _dictionary_or_empty(result.get("routeState"))
	if bool(route_state.get("terminal", false)):
		await _end_and_emit()
	elif not next_turn.is_empty():
		beat_opened.emit(_to_beat_view(next_turn))
	return result

## GET /v1/session/snapshot. Returns the complete live wrapper, not only its
## worldSnapshot member.
func snapshot() -> Dictionary:
	await get_tree().process_frame
	if _session_id.is_empty():
		return _local_failure("snapshot", "session_not_started", "Start a session before requesting a snapshot.")
	var result: Dictionary = await _backend.snapshot(_session_id)
	if _emit_failure("snapshot", result):
		return result
	_last_world_snapshot = _dictionary_or_empty(result.get("worldSnapshot"))
	return result

## POST /v1/npc/decision. `beat` is the live nonnegative integer tick.
func npc_decision(beat: int) -> Dictionary:
	await get_tree().process_frame
	if not _started:
		return _local_failure("decision", "session_not_started", "Start a session before ticking NPCs.")
	var result: Dictionary = await _backend.npc_decision(beat)
	if _emit_failure("decision", result):
		return result
	_emit_ledger_events(result)
	npc_decision_resolved.emit(result)
	return result

## POST /v1/session/end. Explicit end and answer-triggered terminal end share
## one signal path, so route_ended is emitted at most once per session.
func end_session() -> Dictionary:
	await get_tree().process_frame
	if _session_id.is_empty():
		return _local_failure("end", "session_not_started", "Start a session before ending it.")
	return await _end_and_emit()

## Instant replay. The initial frame defer keeps fixture and HTTP call sites
## identical (`await Session.restart()`).
func restart(storylet_id := "same-order", locale := "ko-KR") -> Dictionary:
	await get_tree().process_frame
	_backend.reset()
	_session_id = ""
	_started = false
	_end_emitted = false
	_last_world_snapshot = {}
	_active_location_id = ""
	return await start_session(storylet_id, locale)

func last_world_snapshot() -> Dictionary:
	return _last_world_snapshot.duplicate(true)

func _end_and_emit() -> Dictionary:
	var result: Dictionary = await _backend.end(_session_id)
	if _emit_failure("end", result):
		return result
	_started = false
	if not _end_emitted:
		_end_emitted = true
		route_ended.emit(result)
	return result

func _emit_ledger_events(result: Dictionary) -> void:
	for event in result.get("ledgerEvents", []):
		if event is Dictionary:
			ledger_event.emit(event)

func _emit_location_if_changed(next_turn: Dictionary) -> void:
	if next_turn.is_empty():
		return
	var next_location := _location_for_turn(next_turn)
	if not next_location.is_empty() and next_location != _active_location_id:
		_active_location_id = next_location
		location_transition.emit(next_location)

func _location_for_turn(turn: Dictionary) -> String:
	var speaker_id := str(turn.get("speakerId", ""))
	if speaker_id.is_empty():
		return ""
	for actor in _last_world_snapshot.get("actors", []):
		if actor is Dictionary and str(actor.get("actorId", "")) == speaker_id:
			return str(actor.get("landmarkId", "")).to_lower()
	return ""

func _to_beat_view(turn: Dictionary) -> Dictionary:
	if turn.is_empty():
		return {}
	var view := turn.duplicate(true)
	view["actorId"] = str(turn.get("speakerId", ""))
	view["allowFreeInput"] = bool(turn.get("acceptsFreeInput", false))
	view["inputMaxLength"] = INPUT_MAX_LENGTH
	return view

func _emit_failure(operation: String, result: Dictionary) -> bool:
	if not result.has("error"):
		return false
	request_failed.emit(operation, result)
	return true

func _local_failure(operation: String, code: String, message: String) -> Dictionary:
	var error := {"error": code, "message": message}
	request_failed.emit(operation, error)
	return error

func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}

func _resolve_mode() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--session-mode="):
			return arg.get_slice("=", 1)
	var env := OS.get_environment("DREAM_SESSION_MODE")
	return "fixture" if env == "fixture" else "http"

func _resolve_http_base() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--session-url="):
			return arg.get_slice("=", 1)
	var env := OS.get_environment("DREAM_SESSION_URL")
	if not env.is_empty():
		return env
	var port := OS.get_environment("DREAM_SESSION_PORT")
	if port.is_empty():
		port = "8787"
	return "http://127.0.0.1:%s" % port
