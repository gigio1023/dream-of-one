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
	root.size = Vector2i(1920, 1080)
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
	var choices: Array = turn.get("choices", [])
	if choices.is_empty() or not choices[0] is Dictionary:
		_fail("HUD choice activation fixture has no generated choice")
		hud.queue_free()
		return false
	var expected_choice_id := str((choices[0] as Dictionary).get("choiceId", ""))
	var selected: Array[String] = []
	hud.choice_submitted.connect(func(choice_id: String) -> void: selected.append(choice_id))
	hud.show_turn(turn)
	await process_frame
	var mode_label := hud.get("_mode_label") as Label
	if mode_label == null or not mode_label.text.contains("scripted/test") or not mode_label.text.contains("scripted"):
		_fail("HUD does not expose scripted provider metadata: %s" % (mode_label.text if mode_label != null else "missing"))
		hud.queue_free()
		return false
	var buttons_value: Variant = hud.get("_choice_buttons")
	if not buttons_value is Array or (buttons_value as Array).is_empty():
		_fail("HUD built no choice buttons")
		hud.queue_free()
		return false
	var first_button := (buttons_value as Array)[0] as Button
	first_button.button_down.emit()
	await process_frame
	if selected != [expected_choice_id]:
		_fail("HUD mouse activation did not submit %s: %s" % [expected_choice_id, JSON.stringify(selected)])
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
	if selected != [expected_choice_id]:
		_fail("HUD Enter activation did not submit %s: %s" % [expected_choice_id, JSON.stringify(selected)])
		hud.queue_free()
		return false

	var long_turn := turn.duplicate(true)
	long_turn["prompt"] = "길어진 모델 발화가 대화 선택지를 밀어내지 않고 패널 안에서 스크롤되어야 합니다. ".repeat(48)
	hud.show_turn(long_turn)
	await process_frame
	await process_frame
	var prompt_scroll := hud.get("_prompt_scroll") as ScrollContainer
	if prompt_scroll == null or prompt_scroll.get_v_scroll_bar().max_value <= prompt_scroll.get_v_scroll_bar().page:
		_fail("HUD long generated prompt did not overflow into its internal scroll region")
		hud.queue_free()
		return false
	hud.set_pressure(18, 7, ["모델이 이 답변의 지역 루틴 불일치를 근거로 들었습니다."])
	hud.show_agent_step({
		"tool": "write_record",
		"proposalMeta": {"profileId": "scripted/test", "transport": "scripted", "usedFallback": false},
		"validation": {"ok": true},
	})
	hud.show_inspection({
		"kind": "npc",
		"title": "상점 점원",
		"role": "점원",
		"reaction": "메모",
		"utterance": "기록을 확인하겠습니다.",
		"action": "기록 작성",
		"actionSource": "scripted/test",
	})
	var inspect_body := hud.get("_inspect_body") as Label
	if inspect_body == null or not inspect_body.text.contains("현재 행동: 기록 작성") or not inspect_body.text.contains("행동 출처: scripted/test") or not inspect_body.text.contains("지역 루틴 불일치"):
		_fail("HUD inspect view did not separate action source and judgment reasons from the normal overlay")
		hud.queue_free()
		return false
	hud.hide_inspection()
	await process_frame
	var safe_rect := Rect2(280, 110, 1360, 720)
	var clerk_body := Rect2(530, 160, 100, 120)
	# The ambient customer sits behind the shipped bottom sheet. Native identity
	# and reaction chips must route across that panel edge instead of disappearing.
	var customer_body := Rect2(980, 740, 100, 120)
	var prop_body := Rect2(760, 300, 90, 90)
	var player_body := Rect2(700, 520, 100, 120)
	var extra_obstacles: Array[Rect2] = [player_body]
	hud.sync_world_overlays([
		{
			"actorId": "NPC_Store_Clerk",
			"label": "상점 점원",
			"role": "점원",
			"action": "기록 작성",
			"actionTool": "write_record",
			"accent": Color("#e2a33d"),
			"speech": "확인을 위해 정정표를 하나 붙이겠습니다. 잠시 기다려주세요…",
			"reaction": "보고함",
			"reactionVisible": true,
			"avoidRect": clerk_body,
			"onScreen": true,
		},
		{
			"actorId": "NPC_Waiting_Customer",
			"label": "대기 손님",
			"action": "주변 관찰",
			"actionTool": "observe",
			"accent": Color("#c0505a"),
			"reaction": "메모",
			"reactionVisible": true,
			"avoidRect": customer_body,
			"onScreen": true,
		},
	], [
		{
			"propId": "correction_slip",
			"label": "정정표",
			"state": "제시됨",
			"stateVisible": true,
			"avoidRect": prop_body,
			"onScreen": true,
		},
	], safe_rect, extra_obstacles)
	await process_frame
	await process_frame
	var overlay_root := hud.get_node_or_null("Root/WorldTextOverlays") as Control
	var speech_chip := hud.get_node_or_null("Root/WorldTextOverlays/Actors/Actor_NPC_Store_Clerk/SpeechChip") as Control
	var reaction_chip := hud.get_node_or_null("Root/WorldTextOverlays/Actors/Actor_NPC_Store_Clerk/ReactionChip") as Control
	var customer_nameplate := hud.get_node_or_null("Root/WorldTextOverlays/Actors/Actor_NPC_Waiting_Customer/Nameplate") as Control
	var customer_reaction := hud.get_node_or_null("Root/WorldTextOverlays/Actors/Actor_NPC_Waiting_Customer/ReactionChip") as Control
	var state_chip := hud.get_node_or_null("Root/WorldTextOverlays/Props/Prop_correction_slip/StateChip") as Control
	if overlay_root == null or speech_chip == null or reaction_chip == null or customer_nameplate == null or customer_reaction == null or state_chip == null:
		_fail("HUD did not build native speech/reaction/prop text surfaces")
		hud.queue_free()
		return false
	var callout_rects: Array[Rect2] = [
		speech_chip.get_global_rect(),
		reaction_chip.get_global_rect(),
		customer_nameplate.get_global_rect(),
		customer_reaction.get_global_rect(),
		state_chip.get_global_rect(),
	]
	var conversation_panel := hud.get("_conversation_panel") as Control
	var body_rects: Array[Rect2] = [clerk_body, customer_body, prop_body, player_body, conversation_panel.get_global_rect()]
	for rect in callout_rects:
		if not _rect_contains(safe_rect, rect):
			_fail("HUD world callout escaped its wall/apron-safe rect: %s" % rect)
			hud.queue_free()
			return false
		for body in body_rects:
			if rect.intersects(body):
				_fail("HUD world callout overlapped an actor/prop body: %s vs %s" % [rect, body])
				hud.queue_free()
				return false
	for first in range(callout_rects.size()):
		for second in range(first + 1, callout_rects.size()):
			if callout_rects[first].intersects(callout_rects[second]):
				_fail("HUD world callouts overlapped each other")
				hud.queue_free()
				return false
	if hud.world_overlay_fallback_count() != 0:
		_fail("HUD synthetic Store placement required a least-overlap fallback")
		hud.queue_free()
		return false
	hud.set_debug_mode(true)
	var debug_badge := hud.get("_debug_badge") as Label
	if debug_badge == null or not debug_badge.visible:
		_fail("HUD explicit debug mode did not expose its badge")
		hud.queue_free()
		return false
	hud.set_debug_mode(false)

	print("PASS route_smoke: HUD input + long text + normal/inspect/debug information layers")
	hud.queue_free()
	await process_frame
	return true

func _rect_contains(outer: Rect2, inner: Rect2) -> bool:
	return (
		inner.position.x >= outer.position.x
		and inner.position.y >= outer.position.y
		and inner.end.x <= outer.end.x
		and inner.end.y <= outer.end.y
	)

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
	var transcript_value: Variant = last_answer.get("transcriptDeltas", [])
	if not transcript_value is Array or (transcript_value as Array).is_empty():
		_fail("%s returned no provider agent transcript" % expected_route)
		return false
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
