extends SceneTree

## Drives the four backend-generated canonical walkthroughs through the public,
## asynchronous Session facade. The same code path is used for fixture replay
## and a live sidecar selected with --session-mode=http.

const FIXTURE_PATH := "res://data/fixtures/session-api-examples.json"
const EXPECTED_ROUTES := ["clean_cover", "repair_recovery", "soft_report", "hard_inquest"]

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await process_frame
	var session = root.get_node_or_null("Session")
	if session == null:
		_fail("Session autoload is missing")
		return

	var fixture := _load_fixture()
	if fixture.is_empty():
		return
	var walkthroughs_value: Variant = fixture.get("routeWalkthroughs", [])
	if not walkthroughs_value is Array:
		_fail("fixture routeWalkthroughs is not an array")
		return
	var walkthroughs: Array = walkthroughs_value
	if walkthroughs.size() != EXPECTED_ROUTES.size():
		_fail("expected 4 route walkthroughs, got %d" % walkthroughs.size())
		return

	var replay_by_route := _replays_by_route(fixture)
	if replay_by_route.size() != EXPECTED_ROUTES.size():
		_fail("fixture routeReplays does not cover all four routes")
		return
	var seen := {}
	for route_index in range(walkthroughs.size()):
		var walkthrough_value: Variant = walkthroughs[route_index]
		if not walkthrough_value is Dictionary:
			_fail("route walkthrough %d is not an object" % route_index)
			return
		var walkthrough: Dictionary = walkthrough_value
		var expected_route := str(walkthrough.get("expectedOutcome", walkthrough.get("route", "")))
		if not EXPECTED_ROUTES.has(expected_route) or seen.has(expected_route):
			_fail("invalid or duplicate canonical route: %s" % expected_route)
			return
		seen[expected_route] = true
		var replay: Dictionary = replay_by_route.get(expected_route, {})
		var ok := await _drive_route(session, walkthrough, replay, route_index == 0)
		if not ok:
			return

	for expected_route in EXPECTED_ROUTES:
		if not seen.has(expected_route):
			_fail("missing canonical route: %s" % expected_route)
			return
	if not await _check_hud_choice_activation(fixture):
		return
	print("PASS route_smoke: %s mode drove all four canonical routes" % str(session.call("mode")))
	quit(0)

func _check_hud_choice_activation(fixture: Dictionary) -> bool:
	var hud_resource := ResourceLoader.load("res://scenes/ui/hud.tscn")
	if not hud_resource is PackedScene:
		_fail("HUD scene did not load for choice activation regression")
		return false
	var hud: Node = (hud_resource as PackedScene).instantiate()
	root.add_child(hud)
	await process_frame
	var graph: Dictionary = fixture.get("replayGraph", {})
	var start_response: Dictionary = graph.get("startResponse", {})
	var turn: Dictionary = start_response.get("nextTurn", {})
	if turn.is_empty():
		_fail("HUD choice activation fixture has no opening nextTurn")
		hud.queue_free()
		return false
	var selected: Array[String] = []
	hud.choice_submitted.connect(func(choice_id: String) -> void: selected.append(choice_id))
	hud.show_turn(turn)
	await process_frame
	var buttons_value: Variant = hud.get("_choice_buttons")
	if not buttons_value is Array or (buttons_value as Array).is_empty():
		_fail("HUD built no choice buttons")
		hud.queue_free()
		return false
	var first_button := (buttons_value as Array)[0] as Button
	first_button.button_down.emit()
	await process_frame
	if selected != ["routine.safe"]:
		_fail("HUD mouse activation did not submit routine.safe: %s" % JSON.stringify(selected))
		hud.queue_free()
		return false

	selected.clear()
	hud.show_turn(turn)
	await process_frame
	first_button.grab_focus()
	await process_frame
	var enter_down := InputEventKey.new()
	enter_down.keycode = KEY_ENTER
	enter_down.pressed = true
	Input.parse_input_event(enter_down)
	var enter_up := InputEventKey.new()
	enter_up.keycode = KEY_ENTER
	enter_up.pressed = false
	Input.parse_input_event(enter_up)
	await process_frame
	if selected != ["routine.safe"]:
		_fail("HUD Enter activation did not submit routine.safe: %s" % JSON.stringify(selected))
		hud.queue_free()
		return false

	print("PASS route_smoke: HUD mouse + Enter choice activation")
	hud.queue_free()
	await process_frame
	return true

func _drive_route(session: Node, walkthrough: Dictionary, replay: Dictionary, first_route: bool) -> bool:
	var expected_route := str(walkthrough.get("expectedOutcome", walkthrough.get("route", "")))
	var expected_title := str(walkthrough.get("expectedTitle", ""))
	var ended: Array = []
	var on_route_ended := func(result: Dictionary) -> void:
		ended.append(result.duplicate(true))
	session.route_ended.connect(on_route_ended, Object.CONNECT_ONE_SHOT)

	var start_result: Dictionary
	if first_route:
		start_result = await session.start_session("same-order", "ko-KR")
	else:
		start_result = await session.restart("same-order", "ko-KR")
	if _has_error(start_result):
		_fail("%s start failed: %s" % [expected_route, JSON.stringify(start_result)])
		return false
	if not start_result.get("nextTurn", {}) is Dictionary or (start_result.get("nextTurn", {}) as Dictionary).is_empty():
		_fail("%s start returned no nextTurn" % expected_route)
		return false

	var answers_value: Variant = walkthrough.get("answers", [])
	if not answers_value is Array or (answers_value as Array).is_empty():
		_fail("%s has no canonical answers" % expected_route)
		return false
	var last_answer: Dictionary = {}
	for answer_value in answers_value as Array:
		if not answer_value is Dictionary:
			_fail("%s contains a non-object answer" % expected_route)
			return false
		var current_turn: Dictionary = session.current_beat_view()
		if current_turn.is_empty():
			_fail("%s ran out of turns before all answers" % expected_route)
			return false
		last_answer = await session.answer((answer_value as Dictionary).duplicate(true))
		if _has_error(last_answer):
			_fail("%s answer failed: %s" % [expected_route, JSON.stringify(last_answer)])
			return false
		if not _check_answer_visibility(expected_route, last_answer):
			return false

	var route_state: Dictionary = last_answer.get("routeState", {})
	if not bool(route_state.get("terminal", false)):
		_fail("%s did not return a terminal final answer" % expected_route)
		return false
	if ended.size() != 1:
		_fail("%s emitted route_ended %d times" % [expected_route, ended.size()])
		return false
	var end_result: Dictionary = ended[0]
	if str(end_result.get("route", "")) != expected_route:
		_fail("%s ended as %s" % [expected_route, str(end_result.get("route", ""))])
		return false
	var outcome: Dictionary = end_result.get("outcomePanel", {})
	if str(outcome.get("title", "")) != expected_title:
		_fail("%s title mismatch: %s" % [expected_route, str(outcome.get("title", ""))])
		return false
	if not _check_citations(expected_route, outcome, replay):
		return false

	print("PASS route_smoke: %s -> %s (%d cited ledger ids)" % [
		expected_route,
		expected_title,
		(outcome.get("citedLedgerIds", []) as Array).size(),
	])
	return true

func _check_answer_visibility(route: String, answer: Dictionary) -> bool:
	var suspicion_delta := int(answer.get("suspicionDelta", 0))
	var why_lines_value: Variant = answer.get("whyLines", [])
	if not why_lines_value is Array:
		_fail("%s whyLines is not an array" % route)
		return false
	var why_lines: Array = why_lines_value
	if suspicion_delta != 0 and why_lines.is_empty():
		_fail("%s changed suspicion by %d without a why-line" % [route, suspicion_delta])
		return false
	for line in why_lines:
		if str(line).strip_edges().is_empty():
			_fail("%s returned an empty why-line" % route)
			return false
	var ledger_value: Variant = answer.get("ledgerEvents", [])
	if not ledger_value is Array:
		_fail("%s ledgerEvents is not an array" % route)
		return false
	for event_value in ledger_value as Array:
		if not event_value is Dictionary:
			_fail("%s returned a non-object ledger event" % route)
			return false
		var event: Dictionary = event_value
		if str(event.get("eventId", event.get("id", ""))).is_empty():
			_fail("%s returned a ledger event without an id" % route)
			return false
	return true

func _check_citations(route: String, outcome: Dictionary, replay: Dictionary) -> bool:
	var actual_value: Variant = outcome.get("citedLedgerIds", [])
	if not actual_value is Array:
		_fail("%s citedLedgerIds is not an array" % route)
		return false
	var expected_end: Dictionary = replay.get("endResponse", {})
	var expected_panel: Dictionary = expected_end.get("outcomePanel", {})
	var expected_value: Variant = expected_panel.get("citedLedgerIds", [])
	if not expected_value is Array:
		_fail("%s replay has no citedLedgerIds expectation" % route)
		return false
	var actual: Array = actual_value
	var expected: Array = expected_value
	if not expected.is_empty() and actual.is_empty():
		_fail("%s should cite ledger ids but cited none" % route)
		return false
	if actual != expected:
		_fail("%s cited ids differ from backend fixture: expected=%s actual=%s" % [route, JSON.stringify(expected), JSON.stringify(actual)])
		return false
	for event_id in actual:
		if str(event_id).strip_edges().is_empty():
			_fail("%s contains an empty cited ledger id" % route)
			return false
	return true

func _load_fixture() -> Dictionary:
	if not FileAccess.file_exists(FIXTURE_PATH):
		_fail("missing route fixture: %s" % FIXTURE_PATH)
		return {}
	var json := JSON.new()
	var parse_error := json.parse(FileAccess.get_file_as_string(FIXTURE_PATH))
	if parse_error != OK:
		_fail("route fixture parse failed at line %d: %s" % [json.get_error_line(), json.get_error_message()])
		return {}
	if not json.data is Dictionary:
		_fail("route fixture root is not an object")
		return {}
	return json.data

func _replays_by_route(fixture: Dictionary) -> Dictionary:
	var out := {}
	var replays_value: Variant = fixture.get("routeReplays", [])
	if not replays_value is Array:
		return out
	for replay_value in replays_value as Array:
		if replay_value is Dictionary:
			var replay: Dictionary = replay_value
			out[str(replay.get("route", ""))] = replay
	return out

func _has_error(result: Dictionary) -> bool:
	return result.is_empty() or result.has("error")

func _fail(message: String) -> void:
	print("FAIL route_smoke: %s" % message)
	quit(1)
