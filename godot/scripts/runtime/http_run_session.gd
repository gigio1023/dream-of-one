extends Node
## Thin localhost adapter for the M3R run-bound conversation endpoints.
## It owns transport state only; run, memory, stance, and judgment remain in
## the TypeScript RunService.

const RuntimeBridge := preload("res://scripts/runtime/runtime_bridge.gd")
const START_TIMEOUT_SECONDS := 60.0
const ANSWER_TIMEOUT_SECONDS := 300.0
const ADVANCE_TIMEOUT_SECONDS := 15.0
const DECISION_TIMEOUT_SECONDS := 300.0

var _bridge: Node
var _last_error: Dictionary = {}


func configure(base_url: String) -> bool:
	_bridge = RuntimeBridge.new()
	add_child(_bridge)
	if bool(_bridge.configure(base_url)):
		return true
	_last_error = {
		"error": "invalid_session_url",
		"message": "RunService URL must be an HTTP(S) loopback URL.",
	}
	return false


func start_run(locale: String, start_id: String) -> Dictionary:
	return await _post(
		"/v1/run/start",
		{"startId": start_id, "locale": locale},
		START_TIMEOUT_SECONDS,
		"run_start_failed"
	)


func start_conversation(
	run_id: String,
	actor_id: String,
	interaction_zone_id: String,
	locale: String
) -> Dictionary:
	return await _post(
		"/v1/session/start",
		{
			"runId": run_id,
			"actorId": actor_id,
			"interactionZoneId": interaction_zone_id,
			"locale": locale,
		},
		START_TIMEOUT_SECONDS,
		"conversation_start_failed"
	)


func preload_conversation(
	run_id: String,
	actor_id: String,
	interaction_zone_id: String,
	locale: String
) -> Dictionary:
	return await _post(
		"/v1/session/preload",
		{
			"runId": run_id,
			"actorId": actor_id,
			"interactionZoneId": interaction_zone_id,
			"locale": locale,
		},
		START_TIMEOUT_SECONDS,
		"conversation_preload_failed"
	)


func answer(
	run_id: String,
	session_id: String,
	turn_id: String,
	answer_payload: Dictionary
) -> Dictionary:
	return await _post(
		"/v1/session/answer",
		{
			"runId": run_id,
			"sessionId": session_id,
			"turnId": turn_id,
			"answer": answer_payload,
		},
		ANSWER_TIMEOUT_SECONDS,
		"conversation_answer_failed"
	)


func end_conversation(run_id: String, session_id: String) -> Dictionary:
	return await _post(
		"/v1/session/end",
		{"runId": run_id, "sessionId": session_id},
		START_TIMEOUT_SECONDS,
		"conversation_end_failed"
	)


func run_snapshot(run_id: String) -> Dictionary:
	var encoded_id := run_id.uri_encode()
	var result: Dictionary = await _bridge.get_json(
		"/v1/run/snapshot?runId=%s" % encoded_id,
		START_TIMEOUT_SECONDS
	)
	return _response_body(result, "run_snapshot_failed")


func encounter(run_id: String, encounter_id: String, encounter_packet: Dictionary) -> Dictionary:
	return await _post(
		"/v1/run/encounter",
		{
			"runId": run_id,
			"encounterId": encounter_id,
			"encounter": encounter_packet,
		},
		ADVANCE_TIMEOUT_SECONDS,
		"run_encounter_failed"
	)


func advance(request: Dictionary) -> Dictionary:
	return await _post(
		"/v1/run/advance",
		request,
		ADVANCE_TIMEOUT_SECONDS,
		"run_advance_failed"
	)


func npc_decision(request: Dictionary) -> Dictionary:
	return await _post(
		"/v1/npc/decision",
		request,
		DECISION_TIMEOUT_SECONDS,
		"npc_decision_failed"
	)


func last_error() -> Dictionary:
	return _last_error.duplicate(true)


func _post(path: String, body: Dictionary, timeout: float, fallback_code: String) -> Dictionary:
	if _bridge == null:
		return _local_error(fallback_code, "RunService transport is not configured.")
	var result: Dictionary = await _bridge.post_json(path, body, timeout)
	return _response_body(result, fallback_code)


func _response_body(result: Dictionary, fallback_code: String) -> Dictionary:
	var body := _dictionary_or_empty(result.get("json"))
	if bool(result.get("ok", false)):
		_last_error = {}
		return body
	if not body.is_empty():
		_last_error = body.duplicate(true)
		return body
	return _local_error(
		fallback_code,
		str(result.get("reason", "transport_error")),
		int(result.get("status", 0))
	)


func _local_error(code: String, message: String, status := 0) -> Dictionary:
	_last_error = {"error": code, "message": message, "status": status}
	return _last_error.duplicate(true)


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}
