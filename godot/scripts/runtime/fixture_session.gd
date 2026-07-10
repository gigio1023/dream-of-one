extends RefCounted
## FixtureSession — deterministic replay of the committed Same Order fixture.
##
## In fixture mode the fixture IS the deterministic authority (M1 has no live
## provider). This class walks its beats, classifies answers by the fixture's
## signal model, accumulates suspicion/report, and resolves one of the four
## canonical routes. It returns the same dictionary shapes an HTTP backend
## would, so Session can relay it unchanged. See docs/game/core-loop.md.

const FIXTURE_PATH := "res://data/fixtures/session-api-examples.json"
const WARNING_BAND := 60
const VERDICT_BAND := 100
const INPUT_MAX_LENGTH := 40

var _fixture: Dictionary = {}
var _snapshot: Dictionary = {}
var _session_id := ""
var _current_beat_id := ""
var _suspicion := 0
var _report := 0
var _turn := 0
var _emitted_signals: Dictionary = {}
var _ledger: Array = []
var _ledger_seq := 0
var _route := ""
var _loc: Object = null

func _init() -> void:
	_load_fixture()

func _load_fixture() -> void:
	var text := FileAccess.get_file_as_string(FIXTURE_PATH)
	var parsed = JSON.parse_string(text)
	if parsed is Dictionary:
		_fixture = parsed
	else:
		push_error("FixtureSession: could not parse %s" % FIXTURE_PATH)
		_fixture = {}

func _localization() -> Object:
	if _loc == null:
		var loop := Engine.get_main_loop()
		if loop is SceneTree:
			_loc = (loop as SceneTree).root.get_node_or_null("Localization")
	return _loc

func _t(key: String, args: Dictionary = {}) -> String:
	var loc := _localization()
	if loc != null:
		return str(loc.call("t", key, args))
	return key

# --- backend interface ---------------------------------------------------

func start(_storylet_id: String, _locale: String) -> Dictionary:
	reset()
	var start_block: Dictionary = _fixture.get("start", {})
	var response: Dictionary = (start_block.get("response", {}) as Dictionary).duplicate(true)
	_session_id = str(response.get("sessionId", "sess-same-order-fixture"))
	_snapshot = (response.get("worldSnapshot", {}) as Dictionary).duplicate(true)
	_current_beat_id = str(_fixture.get("firstBeat", ""))
	_ledger.clear()
	var opening: Array = []
	for ev in response.get("ledgerEvents", []):
		opening.append(_materialize_ledger_event(ev))
	response["ledgerEvents"] = opening
	response["worldSnapshot"] = _snapshot
	return response

func reset() -> void:
	_suspicion = 0
	_report = 0
	_turn = 0
	_route = ""
	_ledger_seq = 0
	_emitted_signals.clear()
	_ledger.clear()
	_current_beat_id = str(_fixture.get("firstBeat", ""))

func turn_count(_session_id: String) -> int:
	return _turn

func current_beat(_session_id: String) -> Dictionary:
	if _current_beat_id.is_empty() or not _route.is_empty():
		return {}
	var beats: Dictionary = _fixture.get("beats", {})
	if not beats.has(_current_beat_id):
		return {}
	var beat: Dictionary = beats[_current_beat_id]
	var choices: Array = []
	var index := 0
	for choice in beat.get("choices", []):
		choices.append({
			"choiceId": str(choice.get("choiceId", "")),
			"text": _t(str(choice.get("textKey", ""))),
			"intent": str(choice.get("intent", "")),
			"index": index,
		})
		index += 1
	return {
		"beatId": _current_beat_id,
		"actorId": str(beat.get("actorId", "")),
		"actorLabel": _actor_label(str(beat.get("actorId", ""))),
		"location": str(beat.get("location", "store")),
		"prompt": _t(str(beat.get("promptKey", ""))),
		"choices": choices,
		"allowFreeInput": bool(beat.get("allowFreeInput", false)),
		"inputMaxLength": INPUT_MAX_LENGTH,
	}

func answer(_session_id: String, turn_id: String, payload: Dictionary) -> Dictionary:
	_turn += 1
	var beats: Dictionary = _fixture.get("beats", {})
	var beat: Dictionary = beats.get(_current_beat_id, {})
	var kind := str(payload.get("type", "choice"))
	var outcome: Dictionary = {}
	match kind:
		"hesitation":
			outcome = _hesitation_outcome(beat)
		"free_input":
			outcome = _free_input_outcome(beat, str(payload.get("text", "")))
		_:
			outcome = _choice_outcome(beat, str(payload.get("choiceId", "")))

	var signals: Array = outcome.get("signals", [])
	var suspicion_delta := 0
	var report_delta := 0
	var why_lines: Array = []
	var signal_model: Dictionary = _fixture.get("signalModel", {})
	for sig in signals:
		var model: Dictionary = signal_model.get(sig, {})
		suspicion_delta += int(model.get("suspicion", 0))
		report_delta += int(model.get("report", 0))
		why_lines.append(_t(str(model.get("whyKey", ""))))
		_emitted_signals[sig] = true
	if why_lines.is_empty():
		why_lines.append(_t("why.clean"))
	_suspicion += suspicion_delta
	_report += report_delta

	var ledger_out: Array = []
	for ev in outcome.get("ledgerEvents", []):
		ledger_out.append(_materialize_ledger_event(ev))

	var reactions: Array = _build_reactions(outcome, str(beat.get("actorId", "")), str(outcome.get("npcResponseKey", "")))

	var next_beat := str(outcome.get("next", ""))
	var location_transition := ""
	var route_state := "in_progress"
	if next_beat.is_empty():
		_route = _resolve_route()
		route_state = _route
		_current_beat_id = ""
	else:
		var prev_location := str(beat.get("location", "store"))
		_current_beat_id = next_beat
		var next_location := str((beats.get(next_beat, {}) as Dictionary).get("location", prev_location))
		if next_location != prev_location:
			location_transition = next_location

	return {
		"turnId": turn_id,
		"signals": signals,
		"whyLines": why_lines,
		"suspicionDelta": suspicion_delta,
		"reportPressure": report_delta,
		"suspicionTotal": _suspicion,
		"reportTotal": _report,
		"band": _band(),
		"npcResponse": _t(str(outcome.get("npcResponseKey", ""))),
		"npcReactions": reactions,
		"ledgerEvents": ledger_out,
		"routeState": route_state,
		"locationTransition": location_transition,
	}

func snapshot(_session_id: String) -> Dictionary:
	var snap := _snapshot.duplicate(true)
	snap["hudState"] = {
		"suspicion": _suspicion,
		"reportPressure": _report,
		"band": _band(),
		"routeState": _route if not _route.is_empty() else "in_progress",
		"latestLedger": _latest_ledger_line(),
	}
	snap["ledgerEvents"] = _ledger.duplicate(true)
	snap["emittedSignals"] = _emitted_signals.keys()
	snap["currentBeat"] = _current_beat_id
	return snap

func end(_session_id: String) -> Dictionary:
	if _route.is_empty():
		_route = _resolve_route()
	var ends: Dictionary = _fixture.get("routeEnds", {})
	var end_block: Dictionary = (ends.get(_route, {}) as Dictionary).duplicate(true)
	var panel: Dictionary = end_block.get("outcomePanel", {})
	var cited_kinds: Array = panel.get("citedLedgerKinds", [])
	var cited_ids: Array = []
	for ev in _ledger:
		if cited_kinds.has(str(ev.get("kind", ""))):
			cited_ids.append(str(ev.get("id", "")))
	return {
		"route": _route,
		"outcomePanel": {
			"title": _t(str(panel.get("titleKey", ""))),
			"body": _t(str(panel.get("bodyKey", ""))),
			"citedLedgerIds": cited_ids,
		},
		"telemetrySummary": end_block.get("telemetrySummary", {}),
	}

# --- internals -----------------------------------------------------------

func _choice_outcome(beat: Dictionary, choice_id: String) -> Dictionary:
	for choice in beat.get("choices", []):
		if str(choice.get("choiceId", "")) == choice_id:
			return choice
	# Fallback to the first choice keeps headless drivers robust.
	var choices: Array = beat.get("choices", [])
	return choices[0] if not choices.is_empty() else {}

func _free_input_outcome(beat: Dictionary, text: String) -> Dictionary:
	var rules: Array = beat.get("freeInputRules", [])
	var lowered := text.to_lower()
	for rule in rules:
		if bool(rule.get("default", false)):
			return rule
		for kw in rule.get("anyKeywords", []):
			if lowered.find(str(kw).to_lower()) >= 0:
				return rule
	# No matching rule and no default: treat as safe.
	return {"signals": [], "npcResponseKey": "", "ledgerEvents": [], "npcReactions": [], "next": ""}

func _hesitation_outcome(beat: Dictionary) -> Dictionary:
	return {
		"signals": ["response_hesitation"],
		"npcResponseKey": str(beat.get("promptKey", "")),
		"ledgerEvents": [{
			"kind": "response_hesitation_noted",
			"summaryKey": "ledger.response_hesitation_noted",
			"actorId": str(beat.get("actorId", "")),
			"objectId": "",
			"toState": "",
		}],
		"npcReactions": [{"actorId": str(beat.get("actorId", "")), "reaction": "probing"}],
		"next": _current_beat_id,
	}

func _build_reactions(outcome: Dictionary, beat_actor: String, npc_response_key: String) -> Array:
	var out: Array = []
	var attached := false
	for reaction in outcome.get("npcReactions", []):
		var actor := str(reaction.get("actorId", ""))
		var entry := {
			"actorId": actor,
			"reaction": str(reaction.get("reaction", "calm")),
			"label": _t("reaction.%s" % str(reaction.get("reaction", "calm"))),
		}
		if reaction.has("influenceFrom"):
			entry["influenceFrom"] = str(reaction["influenceFrom"])
		if actor == beat_actor and not npc_response_key.is_empty() and not attached:
			entry["utterance"] = _t(npc_response_key)
			attached = true
		out.append(entry)
	if not attached and not npc_response_key.is_empty():
		out.push_front({
			"actorId": beat_actor,
			"reaction": "calm",
			"label": _t("reaction.calm"),
			"utterance": _t(npc_response_key),
		})
	return out

func _resolve_route() -> String:
	for rule in _fixture.get("routeResolution", []):
		if bool(rule.get("default", false)):
			return str(rule.get("route", "clean_cover"))
		if rule.has("ifSignalsAny"):
			for sig in rule["ifSignalsAny"]:
				if _emitted_signals.has(str(sig)):
					return str(rule.get("route", "clean_cover"))
		if rule.has("ifSuspicionGte") and _suspicion >= int(rule["ifSuspicionGte"]):
			return str(rule.get("route", "clean_cover"))
		if rule.has("ifReportGte") and _report >= int(rule["ifReportGte"]):
			return str(rule.get("route", "clean_cover"))
	return "clean_cover"

func _materialize_ledger_event(ev: Dictionary) -> Dictionary:
	var out := {
		"id": "ev-%03d" % _ledger_seq,
		"kind": str(ev.get("kind", "")),
		"summary": _t(str(ev.get("summaryKey", ""))),
		"actorId": str(ev.get("actorId", "")),
		"objectId": str(ev.get("objectId", "")),
		"toState": str(ev.get("toState", "")),
	}
	_ledger_seq += 1
	_ledger.append(out)
	# Reflect the prop state change into the mutable snapshot immediately.
	var object_id := str(ev.get("objectId", ""))
	var to_state := str(ev.get("toState", ""))
	if not object_id.is_empty() and not to_state.is_empty():
		for prop in _snapshot.get("recordProps", []):
			if str(prop.get("propId", "")) == object_id:
				prop["state"] = to_state
	return out

func _band() -> String:
	var exposure = max(_suspicion, _report)
	if exposure >= VERDICT_BAND:
		return "verdict"
	if exposure >= WARNING_BAND:
		return "warning"
	return "low"

func _latest_ledger_line() -> String:
	if _ledger.is_empty():
		return ""
	var latest: Dictionary = _ledger[_ledger.size() - 1]
	return "%s %s" % [str(latest.get("id", "")), str(latest.get("summary", ""))]

func _actor_label(actor_id: String) -> String:
	return _t("npc.%s.label" % actor_id)
