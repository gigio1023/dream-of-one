extends Node
## HttpSession is a thin asynchronous adapter over the live Session API. It
## keeps only client transport state (session id, nextTurn, turn count); every
## suspicion, record, route, and terminal decision remains backend-owned.

const RuntimeBridge := preload("res://scripts/runtime/runtime_bridge.gd")

var _bridge: Node = null
var _session_id := ""
var _current_turn: Dictionary = {}
var _turn_count := 0
var _last_error: Dictionary = {}

func configure(base_url: String) -> void:
	_bridge = RuntimeBridge.new()
	add_child(_bridge)
	if not _bridge.configure(base_url):
		_last_error = {
			"error": "invalid_session_url",
			"message": "Session URL must be an HTTP(S) loopback URL.",
		}

func start(storylet_id: String, locale: String) -> Dictionary:
	_turn_count = 0
	_current_turn = {}
	_session_id = ""
	var result: Dictionary = await _bridge.post_json("/v1/session/start", {
		"storyletId": storylet_id,
		"locale": locale,
	})
	var body := _response_body(result, "session_start_failed")
	if not body.has("error"):
		_session_id = str(body.get("sessionId", ""))
		_current_turn = _dictionary_or_empty(body.get("nextTurn"))
	return body

func reset() -> void:
	_turn_count = 0
	_current_turn = {}
	_session_id = ""
	_last_error = {}

func turn_count(_requested_session_id: String) -> int:
	return _turn_count

func current_beat(_requested_session_id: String) -> Dictionary:
	return _current_turn.duplicate(true)

func answer(requested_session_id: String, turn_id: String, payload: Dictionary) -> Dictionary:
	var result: Dictionary = await _bridge.post_json("/v1/session/answer", {
		"sessionId": requested_session_id,
		"turnId": turn_id,
		"answer": payload,
	})
	var body := _response_body(result, "session_answer_failed")
	if not body.has("error"):
		_turn_count += 1
		_current_turn = _dictionary_or_empty(body.get("nextTurn"))
	return body

func snapshot(requested_session_id: String) -> Dictionary:
	var encoded_id := requested_session_id.uri_encode()
	var result: Dictionary = await _bridge.get_json("/v1/session/snapshot?sessionId=%s" % encoded_id)
	return _response_body(result, "session_snapshot_failed")

func npc_decision(beat: int) -> Dictionary:
	var result: Dictionary = await _bridge.post_json("/v1/npc/decision", {
		"sessionId": _session_id,
		"beat": beat,
	})
	return _response_body(result, "npc_decision_failed")

func end(requested_session_id: String) -> Dictionary:
	var result: Dictionary = await _bridge.post_json("/v1/session/end", {
		"sessionId": requested_session_id,
	})
	var body := _response_body(result, "session_end_failed")
	if not body.has("error"):
		_current_turn = {}
	return body

func last_error() -> Dictionary:
	return _last_error.duplicate(true)

func _response_body(result: Dictionary, fallback_code: String) -> Dictionary:
	var body: Dictionary = _dictionary_or_empty(result.get("json"))
	if bool(result.get("ok", false)):
		_last_error = {}
		return body
	if not body.is_empty():
		_last_error = body.duplicate(true)
		return body
	_last_error = {
		"error": fallback_code,
		"message": str(result.get("reason", "transport_error")),
		"status": int(result.get("status", 0)),
		"result": int(result.get("result", -1)),
	}
	return _last_error.duplicate(true)

func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}
