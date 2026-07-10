extends RefCounted
## FixtureSession replays backend-generated, schema-validated Session API
## packets. It never classifies input or computes suspicion/routes in Godot.
## The replay graph contains an authoritative response for every exposed M1
## answer variant and an exact snapshot after each transition.

const FIXTURE_PATH := "res://data/fixtures/session-api-examples.json"

var _fixture: Dictionary = {}
var _graph: Dictionary = {}
var _nodes: Dictionary = {}
var _session_id := ""
var _current_node_id := ""
var _current_turn: Dictionary = {}
var _snapshot_response: Dictionary = {}
var _terminal_end_response: Dictionary = {}
var _turn_count := 0
var _started := false
var _last_error: Dictionary = {}

func _init() -> void:
	_load_fixture()

func _load_fixture() -> void:
	if not FileAccess.file_exists(FIXTURE_PATH):
		_last_error = _error("fixture_missing", "Missing fixture: %s" % FIXTURE_PATH)
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE_PATH))
	if not parsed is Dictionary:
		_last_error = _error("fixture_invalid", "Fixture JSON could not be parsed.")
		return
	_fixture = parsed
	var graph_value = _fixture.get("replayGraph")
	if not graph_value is Dictionary:
		_last_error = _error("fixture_graph_missing", "Fixture has no generated replayGraph.")
		return
	_graph = graph_value
	var nodes_value = _graph.get("nodes")
	if not nodes_value is Dictionary:
		_last_error = _error("fixture_graph_invalid", "Fixture replayGraph has no nodes map.")
		_graph = {}
		return
	_nodes = nodes_value
	_last_error = {}

func start(storylet_id: String, _locale: String) -> Dictionary:
	reset()
	if _graph.is_empty():
		return _stored_error("fixture_graph_missing", "Fixture replay graph is unavailable.")
	if storylet_id != str(_fixture.get("storyletId", "")):
		return _stored_error("storylet_not_found", "Fixture does not contain storylet: %s" % storylet_id)
	var response := _copy_dictionary(_graph.get("startResponse"))
	var snapshot := _copy_dictionary(_graph.get("startSnapshotResponse"))
	var root_node_id := str(_graph.get("rootNodeId", ""))
	if response.is_empty() or snapshot.is_empty() or root_node_id.is_empty() or not _nodes.has(root_node_id):
		return _stored_error("fixture_graph_invalid", "Fixture replayGraph start state is incomplete.")
	_session_id = str(response.get("sessionId", ""))
	_current_node_id = root_node_id
	_current_turn = _copy_dictionary(response.get("nextTurn"))
	_snapshot_response = snapshot
	_started = true
	_last_error = {}
	return response

func reset() -> void:
	_session_id = ""
	_current_node_id = ""
	_current_turn = {}
	_snapshot_response = {}
	_terminal_end_response = {}
	_turn_count = 0
	_started = false
	_last_error = {}

func turn_count(_requested_session_id: String) -> int:
	return _turn_count

func current_beat(_requested_session_id: String) -> Dictionary:
	return _current_turn.duplicate(true)

func answer(requested_session_id: String, turn_id: String, payload: Dictionary) -> Dictionary:
	if not _started or requested_session_id != _session_id:
		return _stored_error("session_not_found", "Unknown fixture session.")
	if _current_turn.is_empty():
		return _stored_error("session_ended", "Fixture session has no active turn.")
	var expected_turn_id := str(_current_turn.get("turnId", ""))
	if turn_id != expected_turn_id:
		return _stored_error("unexpected_turn", "Expected %s, got %s." % [expected_turn_id, turn_id])
	var node := _copy_dictionary(_nodes.get(_current_node_id))
	var selected: Dictionary = {}
	for variant in node.get("variants", []):
		if variant is Dictionary and _answer_matches(_copy_dictionary(variant.get("match")), payload):
			selected = variant
			break
	if selected.is_empty():
		return _stored_error(
			"fixture_replay_miss",
			"No authoritative fixture response for %s at %s." % [JSON.stringify(payload), _current_node_id],
		)
	var response := _copy_dictionary(selected.get("response"))
	var snapshot := _copy_dictionary(selected.get("snapshotResponse"))
	if response.is_empty() or snapshot.is_empty():
		return _stored_error("fixture_graph_invalid", "Replay variant is missing response or snapshotResponse.")

	_turn_count += 1
	_snapshot_response = snapshot
	_terminal_end_response = _copy_dictionary(selected.get("endResponse"))
	var next_node_id := str(selected.get("nextNodeId", ""))
	if not next_node_id.is_empty():
		if not _nodes.has(next_node_id):
			return _stored_error("fixture_graph_invalid", "Replay points to missing node: %s" % next_node_id)
		_current_node_id = next_node_id
		var next_node := _copy_dictionary(_nodes.get(next_node_id))
		_current_turn = _copy_dictionary(next_node.get("nextTurn"))
		if _current_turn.is_empty():
			_current_turn = _copy_dictionary(response.get("nextTurn"))
	else:
		_current_node_id = ""
		_current_turn = {}
	_last_error = {}
	return response

func snapshot(requested_session_id: String) -> Dictionary:
	if not _started or requested_session_id != _session_id:
		return _stored_error("session_not_found", "Unknown fixture session.")
	return _snapshot_response.duplicate(true)

func npc_decision(_beat: int) -> Dictionary:
	if not _started:
		return _stored_error("session_not_found", "Unknown fixture session.")
	var endpoints := _copy_dictionary(_fixture.get("endpoints"))
	var decision := _copy_dictionary(endpoints.get("decision"))
	var response := _copy_dictionary(decision.get("response"))
	if response.is_empty():
		return _stored_error("fixture_decision_missing", "Fixture has no npc/decision response.")
	_last_error = {}
	return response

func end(requested_session_id: String) -> Dictionary:
	if not _started or requested_session_id != _session_id:
		return _stored_error("session_not_found", "Unknown fixture session.")
	var response := _terminal_end_response.duplicate(true)
	if response.is_empty() and not _current_node_id.is_empty():
		var node := _copy_dictionary(_nodes.get(_current_node_id))
		response = _copy_dictionary(node.get("endResponse"))
	if response.is_empty():
		return _stored_error("fixture_end_missing", "Replay state has no authoritative endResponse.")
	_current_turn = {}
	_current_node_id = ""
	_terminal_end_response = response.duplicate(true)
	_last_error = {}
	return response

func last_error() -> Dictionary:
	return _last_error.duplicate(true)

func _answer_matches(match_packet: Dictionary, payload: Dictionary) -> bool:
	var expected_type := str(match_packet.get("type", ""))
	if expected_type != str(payload.get("type", "")):
		return false
	if expected_type == "choice":
		return str(match_packet.get("choiceId", "")) == str(payload.get("choiceId", ""))
	if expected_type == "free_input":
		return not str(payload.get("text", "")).strip_edges().is_empty()
	return expected_type == "hesitation"

func _copy_dictionary(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}

func _stored_error(code: String, message: String) -> Dictionary:
	_last_error = _error(code, message)
	return _last_error.duplicate(true)

func _error(code: String, message: String) -> Dictionary:
	return {"error": code, "message": message}
