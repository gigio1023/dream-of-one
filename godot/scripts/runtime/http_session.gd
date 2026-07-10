extends Node
## HttpSession — real HTTP backend to the TS sidecar, behind the http config
## flag (DREAM_SESSION_MODE=http or --session-mode=http). Implements the same
## interface as FixtureSession so Session relays either unchanged. Untested
## against a live sidecar in M1 (none runs yet); the fixture backend is the M1
## deliverable path. Contract: docs/tech/architecture.md + M1 work order.

const RuntimeBridge := preload("res://scripts/runtime/runtime_bridge.gd")

var _bridge: RefCounted = null
var _session_id := ""
var _current_beat: Dictionary = {}
var _turn := 0

func configure(base_url: String) -> void:
	_bridge = RuntimeBridge.new()
	_bridge.configure(base_url)

func start(storylet_id: String, locale: String) -> Dictionary:
	_turn = 0
	var res: Dictionary = _bridge.post_json("/v1/session/start", {"storyletId": storylet_id, "locale": locale})
	var body: Dictionary = res.get("json", {})
	_session_id = str(body.get("sessionId", ""))
	_current_beat = body.get("firstBeat", body.get("beat", {}))
	return body

func reset() -> void:
	_turn = 0
	_current_beat = {}
	_session_id = ""

func turn_count(_session_id: String) -> int:
	return _turn

func current_beat(_session_id: String) -> Dictionary:
	return _current_beat

func answer(_session_id: String, turn_id: String, payload: Dictionary) -> Dictionary:
	_turn += 1
	var res: Dictionary = _bridge.post_json("/v1/session/answer", {
		"sessionId": _session_id,
		"turnId": turn_id,
		"answer": payload,
	})
	var body: Dictionary = res.get("json", {})
	_current_beat = body.get("nextBeat", {})
	return body

func snapshot(_session_id: String) -> Dictionary:
	var res: Dictionary = _bridge.get_json("/v1/session/snapshot?sessionId=%s" % _session_id)
	return res.get("json", {})

func npc_decision(beat: Dictionary) -> Dictionary:
	var res: Dictionary = _bridge.post_json("/v1/npc/decision", {"sessionId": _session_id, "beat": beat})
	return res.get("json", {})

func end(_session_id: String) -> Dictionary:
	var res: Dictionary = _bridge.post_json("/v1/session/end", {"sessionId": _session_id})
	return res.get("json", {})
