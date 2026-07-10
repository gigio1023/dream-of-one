extends Node
## Session autoload — the single conversation driver for the client.
##
## Boundary (docs/tech/architecture.md): Godot never computes truth in
## production. In fixture mode the deterministic authority is the committed
## fixture, replayed by FixtureSession; in http mode the TS sidecar is the
## authority and HttpSession relays. Both backends implement the same interface
## and return identical dictionary shapes, so this facade only relays and emits
## signals. Every ledgerEvent is emitted individually so consumers can surface a
## visible consequence within 1s (docs/tech/godot-2d-client.md, HUD rules).

const FixtureSession := preload("res://scripts/runtime/fixture_session.gd")
const HttpSession := preload("res://scripts/runtime/http_session.gd")

signal session_started(world_snapshot: Dictionary)
signal beat_opened(beat_view: Dictionary)
signal answer_resolved(result: Dictionary)
signal ledger_event(event: Dictionary)
signal npc_reaction(reaction: Dictionary)
signal location_transition(location_id: String)
signal route_ended(end_result: Dictionary)

var _backend: Object = null
var _mode := "fixture"
var _session_id := ""
var _started := false

func _ready() -> void:
	_mode = _resolve_mode()
	if _mode == "http":
		_backend = HttpSession.new()
		add_child(_backend)
		_backend.configure(_resolve_http_base())
	else:
		_backend = FixtureSession.new()

func mode() -> String:
	return _mode

func is_started() -> bool:
	return _started

## POST /v1/session/start. Emits session_started + one ledger_event per opening event.
func start_session(storylet_id := "same-order", locale := "ko") -> Dictionary:
	var res: Dictionary = _backend.start(storylet_id, locale)
	_session_id = str(res.get("sessionId", ""))
	_started = true
	var snapshot: Dictionary = res.get("worldSnapshot", {})
	session_started.emit(snapshot)
	for ev in res.get("ledgerEvents", []):
		ledger_event.emit(ev)
	return res

## Beat view for the current prompt (resolved strings), or {} if none/terminal.
func current_beat_view() -> Dictionary:
	return _backend.current_beat(_session_id)

## Open (emit) the current beat so the HUD shows the conversation panel.
func open_current_beat() -> Dictionary:
	var view := current_beat_view()
	if not view.is_empty():
		beat_opened.emit(view)
	return view

## POST /v1/session/answer. answer = {type, choiceId?, text?}. Emits per-event
## signals then answer_resolved; advances the beat or ends the session.
func answer(answer_payload: Dictionary) -> Dictionary:
	var turn_id := "turn-%d" % (int(_backend.turn_count(_session_id)) + 1)
	var result: Dictionary = _backend.answer(_session_id, turn_id, answer_payload)
	for ev in result.get("ledgerEvents", []):
		ledger_event.emit(ev)
	for reaction in result.get("npcReactions", []):
		npc_reaction.emit(reaction)
	answer_resolved.emit(result)
	var loc := str(result.get("locationTransition", ""))
	if not loc.is_empty():
		location_transition.emit(loc)
	var route_state := str(result.get("routeState", "in_progress"))
	if route_state == "in_progress":
		var view := current_beat_view()
		if not view.is_empty():
			beat_opened.emit(view)
	else:
		_end_and_emit()
	return result

func _end_and_emit() -> Dictionary:
	var end_result: Dictionary = _backend.end(_session_id)
	route_ended.emit(end_result)
	return end_result

## GET /v1/session/snapshot.
func snapshot() -> Dictionary:
	return _backend.snapshot(_session_id)

## POST /v1/session/end (explicit).
func end_session() -> Dictionary:
	return _backend.end(_session_id)

## Reset for instant replay. Keeps nothing but a fresh start.
func restart(storylet_id := "same-order", locale := "ko") -> Dictionary:
	_backend.reset()
	return start_session(storylet_id, locale)

func _resolve_mode() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--session-mode="):
			return arg.get_slice("=", 1)
	var env := OS.get_environment("DREAM_SESSION_MODE")
	if env == "http":
		return "http"
	return "fixture"

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
