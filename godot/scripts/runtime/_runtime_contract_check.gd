extends SceneTree

const FixtureSession := preload("res://scripts/runtime/fixture_session.gd")
const FIXTURE_PATH := "res://data/fixtures/session-api-examples.json"

var _failed := false
var _session: Node = null

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await process_frame
	_session = root.get_node_or_null("Session")
	_check(_session != null, "Session autoload exists")
	if _session == null:
		quit(1)
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE_PATH))
	_check(parsed is Dictionary, "fixture parses")
	if not parsed is Dictionary:
		quit(1)
		return
	var fixture: Dictionary = parsed
	if _session.call("mode") == "fixture":
		_check_exhaustive_fixture_graph(fixture)
	await _check_facade_walkthroughs(fixture)
	print("runtime_contract_check mode=%s result=%s" % [_session.call("mode"), "FAIL" if _failed else "PASS"])
	quit(1 if _failed else 0)

func _check_exhaustive_fixture_graph(fixture: Dictionary) -> void:
	var graph: Dictionary = fixture.get("replayGraph", {})
	var nodes: Dictionary = graph.get("nodes", {})
	var root_id := str(graph.get("rootNodeId", ""))
	var paths: Dictionary = {root_id: []}
	var queue: Array = [root_id]
	while not queue.is_empty():
		var node_id := str(queue.pop_front())
		var node: Dictionary = nodes.get(node_id, {})
		var prefix: Array = paths[node_id]
		for variant in node.get("variants", []):
			var next_id := str(variant.get("nextNodeId", ""))
			if not next_id.is_empty() and not paths.has(next_id):
				var next_path := prefix.duplicate(true)
				next_path.append((variant.get("request", {}) as Dictionary).get("answer", {}).duplicate(true))
				paths[next_id] = next_path
				queue.append(next_id)

	var checked_edges := 0
	for node_id in nodes:
		_check(paths.has(node_id), "node %s is reachable" % node_id)
		if not paths.has(node_id):
			continue
		var node: Dictionary = nodes[node_id]
		for variant in node.get("variants", []):
			var replay := FixtureSession.new()
			var start := replay.start(str(fixture.get("storyletId", "")), str(fixture.get("locale", "")))
			_check(not start.has("error"), "start before edge %s" % node_id)
			for answer in paths[node_id]:
				var turn := replay.current_beat(str(start.get("sessionId", "")))
				var result := replay.answer(str(start.get("sessionId", "")), str(turn.get("turnId", "")), answer)
				_check(not result.has("error"), "prefix answer before %s" % node_id)
			var turn := replay.current_beat(str(start.get("sessionId", "")))
			var request: Dictionary = variant.get("request", {})
			var answer: Dictionary = request.get("answer", {})
			var result := replay.answer(str(start.get("sessionId", "")), str(turn.get("turnId", "")), answer)
			_check(result == variant.get("response", {}), "edge response %s" % node_id)
			_check(replay.snapshot(str(start.get("sessionId", ""))) == variant.get("snapshotResponse", {}), "edge snapshot %s" % node_id)
			if not variant.has("nextNodeId"):
				_check(replay.end(str(start.get("sessionId", ""))) == variant.get("endResponse", {}), "terminal end %s" % node_id)
			checked_edges += 1
	_check(checked_edges == 70, "all 70 generated replay edges checked (got %d)" % checked_edges)

	for node_id in nodes:
		var replay := FixtureSession.new()
		var start := replay.start(str(fixture.get("storyletId", "")), str(fixture.get("locale", "")))
		for answer in paths.get(node_id, []):
			var turn := replay.current_beat(str(start.get("sessionId", "")))
			replay.answer(str(start.get("sessionId", "")), str(turn.get("turnId", "")), answer)
		_check(replay.end(str(start.get("sessionId", ""))) == (nodes[node_id] as Dictionary).get("endResponse", {}), "mid-session end %s" % node_id)

func _check_facade_walkthroughs(fixture: Dictionary) -> void:
	for walkthrough in fixture.get("routeWalkthroughs", []):
		var start: Dictionary = await _session.call("restart", str(fixture.get("storyletId", "")), str(fixture.get("locale", "")))
		_check(not start.has("error"), "facade start %s" % walkthrough.get("route", ""))
		var beat_view: Dictionary = _session.call("current_beat_view")
		_check(beat_view.get("turnId", "") == start.get("nextTurn", {}).get("turnId", ""), "facade uses backend turnId")
		for answer in walkthrough.get("answers", []):
			var result: Dictionary = await _session.call("answer", answer)
			_check(not result.has("error"), "facade answer %s" % walkthrough.get("route", ""))
			var snap: Dictionary = await _session.call("snapshot")
			_check(not snap.has("error") and snap.has("worldSnapshot"), "full snapshot wrapper %s" % walkthrough.get("route", ""))
		var end: Dictionary = await _session.call("end_session")
		_check(str(end.get("route", "")) == str(walkthrough.get("expectedOutcome", "")), "facade route %s" % walkthrough.get("route", ""))
		_check(str(end.get("outcomePanel", {}).get("title", "")) == str(walkthrough.get("expectedTitle", "")), "facade title %s" % walkthrough.get("route", ""))

func _check(condition: bool, label: String) -> void:
	if condition:
		return
	_failed = true
	push_error("runtime_contract_check: %s" % label)
