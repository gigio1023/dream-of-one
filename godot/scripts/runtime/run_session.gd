class_name RunSession3D
extends Node
## Local M3R facade selecting fixture replay or localhost HTTP transport.
## It deliberately does not replace the retained 2D Session autoload.

const FixtureRunSession := preload("res://scripts/runtime/fixture_run_session.gd")
const HttpRunSession := preload("res://scripts/runtime/http_run_session.gd")

var _backend: Object
var _mode := "http"


func _ready() -> void:
	_mode = _resolve_mode()
	if _mode == "fixture":
		_backend = FixtureRunSession.new()
		return
	_backend = HttpRunSession.new()
	add_child(_backend)
	_backend.configure(_resolve_http_base())


func mode() -> String:
	return _mode


func diagnostics_snapshot() -> Dictionary:
	var last_error: Dictionary = {}
	if _backend != null and _backend.has_method("last_error"):
		last_error = _backend.call("last_error")
	var backend_diagnostics: Dictionary = {}
	if _backend != null and _backend.has_method("diagnostics_snapshot"):
		var diagnostics_value: Variant = _backend.call("diagnostics_snapshot")
		if diagnostics_value is Dictionary:
			backend_diagnostics = (diagnostics_value as Dictionary).duplicate(true)
	var fixture_advance_index: Variant = null
	if _mode == "fixture":
		fixture_advance_index = backend_diagnostics.get("advanceIndex")
	return {
		"mode": _mode,
		"lastError": _diagnostic_error_summary(last_error),
		"fixtureAdvanceIndex": fixture_advance_index,
	}


func start_run(locale := "ko-KR", start_id := "") -> Dictionary:
	await get_tree().process_frame
	return await _backend.start_run(locale, start_id)


func start_conversation(
	run_id: String,
	actor_id: String,
	interaction_zone_id: String,
	locale := "ko-KR"
) -> Dictionary:
	await get_tree().process_frame
	return await _backend.start_conversation(run_id, actor_id, interaction_zone_id, locale)


func answer(
	run_id: String,
	session_id: String,
	turn_id: String,
	answer_payload: Dictionary
) -> Dictionary:
	await get_tree().process_frame
	return await _backend.answer(run_id, session_id, turn_id, answer_payload)


func end_conversation(run_id: String, session_id: String) -> Dictionary:
	await get_tree().process_frame
	return await _backend.end_conversation(run_id, session_id)


func run_snapshot(run_id: String) -> Dictionary:
	await get_tree().process_frame
	return await _backend.run_snapshot(run_id)


func advance(request: Dictionary) -> Dictionary:
	await get_tree().process_frame
	return await _backend.advance(request)


func _diagnostic_error_summary(error: Dictionary) -> Dictionary:
	if error.is_empty():
		return {}
	return {
		"code": str(error.get("error", "unknown_error")),
		"status": int(error.get("status", 0)),
	}


func _resolve_mode() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--session-mode="):
			return "fixture" if arg.get_slice("=", 1) == "fixture" else "http"
	return "fixture" if OS.get_environment("DREAM_SESSION_MODE") == "fixture" else "http"


func _resolve_http_base() -> String:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--session-url="):
			return arg.get_slice("=", 1)
	var url := OS.get_environment("DREAM_SESSION_URL")
	if not url.is_empty():
		return url
	var port := OS.get_environment("DREAM_SESSION_PORT")
	if port.is_empty():
		port = "8787"
	return "http://127.0.0.1:%s" % port
