extends Node

const ShellSchema := preload("res://scripts/data/shell_schema.gd")

const FOCUS_RADIUS := 3.0
const STATION_INTEREST_THRESHOLD := 60
const INQUEST_THRESHOLD := 80
const VERDICT_THRESHOLD := 100
const RUN_ID := "dre-171-playable-slice-run"
const SESSION_ID := "dre-171-playable-session"

const SPEECH_ACTS := {
	"speech_comply": {
		"id": "SA_COMPLY",
		"labelKey": "speech.SA_COMPLY.label",
		"delta": -10,
		"reason": "cover_test_defused",
		"tier": "reference"
	},
	"speech_inquire": {
		"id": "SA_INQUIRE",
		"labelKey": "speech.SA_INQUIRE.label",
		"delta": 5,
		"reason": "cover_test_minor_pressure",
		"tier": "attention"
	},
	"speech_frame": {
		"id": "SA_FRAME",
		"labelKey": "speech.SA_FRAME.label",
		"delta": 15,
		"reason": "cover_test_context_pressure",
		"tier": "attention"
	},
	"speech_break": {
		"id": "SA_BREAK",
		"labelKey": "speech.SA_BREAK.label",
		"delta": 25,
		"reason": "policy_station_intake_requires_procedural_speech",
		"tier": "blocking"
	}
}

const COVER_TESTS := {
	"CT_STORE_QUEUE_LANGUAGE": {
		"actorId": "NPC_Store_Clerk",
		"titleKey": "cover.CT_STORE_QUEUE_LANGUAGE.title",
		"promptKey": "cover.CT_STORE_QUEUE_LANGUAGE.prompt",
		"defuseKey": "cover.CT_STORE_QUEUE_LANGUAGE.defuse",
		"pressureKey": "cover.CT_STORE_QUEUE_LANGUAGE.pressure"
	},
	"CT_STUDIO_APPROVAL_GATE_SPEECH": {
		"actorId": "NPC_Studio_PM",
		"titleKey": "cover.CT_STUDIO_APPROVAL_GATE_SPEECH.title",
		"promptKey": "cover.CT_STUDIO_APPROVAL_GATE_SPEECH.prompt",
		"defuseKey": "cover.CT_STUDIO_APPROVAL_GATE_SPEECH.defuse",
		"pressureKey": "cover.CT_STUDIO_APPROVAL_GATE_SPEECH.pressure"
	},
	"CT_PARK_OBSERVATION_PRESSURE": {
		"actorId": "NPC_Park_Witness",
		"titleKey": "cover.CT_PARK_OBSERVATION_PRESSURE.title",
		"promptKey": "cover.CT_PARK_OBSERVATION_PRESSURE.prompt",
		"defuseKey": "cover.CT_PARK_OBSERVATION_PRESSURE.defuse",
		"pressureKey": "cover.CT_PARK_OBSERVATION_PRESSURE.pressure"
	},
	"CT_STATION_SOFT_INQUEST": {
		"actorId": "NPC_Station_Officer",
		"titleKey": "cover.CT_STATION_SOFT_INQUEST.title",
		"promptKey": "cover.CT_STATION_SOFT_INQUEST.prompt",
		"defuseKey": "cover.CT_STATION_SOFT_INQUEST.defuse",
		"pressureKey": "cover.CT_STATION_SOFT_INQUEST.pressure"
	}
}

var stage := "ambient"
var exposure := 0
var station := {
	"intakeOpen": false,
	"inquestOpen": false,
	"verdictReady": false,
	"sessionTerminationAllowed": false
}
var evidence_events: Array[Dictionary] = []
var read_surface_ids: Dictionary = {}
var current_focus: Node3D = null
var current_focus_kind := ""
var notice_title_key := "notice.opening.title"
var notice_title_args: Dictionary = {}
var notice_body_key := "notice.opening.body"
var notice_body_args: Dictionary = {}
var outcome_visible := false
var outcome_title_key := ""
var outcome_title_args: Dictionary = {}
var outcome_body_key := ""
var outcome_body_args: Dictionary = {}
var _event_sequence := 0

@onready var _root: Node = get_parent()
@onready var _hud: CanvasLayer = $"../SocialStealthHud"
@onready var _player: CharacterBody3D = $"../Actors/Player"

func _ready() -> void:
	add_to_group("playable_sessions")
	_record_event(
		"session",
		"playable_session_started",
		"Session started near Station. Read a rule surface, then answer a Cover Test procedurally.",
		{
			"uiSummaryKey": "event.session_started",
			"uiSummaryArgs": {}
		}
	)
	_refresh_hud()

func _process(_delta: float) -> void:
	_update_focus()
	_refresh_hud()

func _unhandled_input(event: InputEvent) -> void:
	if not event.is_pressed() or event.is_echo():
		return
	if event.is_action_pressed(&"interact"):
		_interact()
		get_viewport().set_input_as_handled()
		return
	for action_name in SPEECH_ACTS.keys():
		if event.is_action_pressed(StringName(action_name)):
			_apply_speech_act(action_name)
			get_viewport().set_input_as_handled()
			return

func run_smoke_sequence() -> Dictionary:
	_force_focus_text_surface("TS_Station_IntakeRules")
	_interact()
	_force_focus_zone("StationIntakeZone")
	_apply_speech_act("speech_break")
	_apply_speech_act("speech_break")
	_apply_speech_act("speech_break")
	_apply_speech_act("speech_break")
	return build_summary()

func build_summary() -> Dictionary:
	return {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"runId": RUN_ID,
		"adapter": "godot",
		"sessionId": SESSION_ID,
		"worldId": _world_id(),
		"worldRevision": _world_revision(),
		"locale": _current_locale(),
		"stage": stage,
		"exposure": exposure,
		"station": station.duplicate(true),
		"noticeTitle": _text(notice_title_key, notice_title_args),
		"noticeBody": _text(notice_body_key, notice_body_args),
		"noticeTitleKey": notice_title_key,
		"noticeBodyKey": notice_body_key,
		"outcomeVisible": outcome_visible,
		"outcomeTitle": _text(outcome_title_key, outcome_title_args) if not outcome_title_key.is_empty() else "",
		"outcomeBody": _text(outcome_body_key, outcome_body_args) if not outcome_body_key.is_empty() else "",
		"outcomeTitleKey": outcome_title_key,
		"outcomeBodyKey": outcome_body_key,
		"readSurfaceIds": read_surface_ids.keys(),
		"events": evidence_events.duplicate(true)
	}

func build_evidence_pack(artifact_path: String) -> Dictionary:
	var summary := build_summary()
	var events := []
	for event in evidence_events:
		events.append(event.duplicate(true))
	events.append(_make_event(
		"evidence_export",
		"evidence_pack_created",
		"Godot playable slice Evidence Pack exported for backend validation.",
		{
			"artifactPath": artifact_path,
			"socialLoopStage": stage
		}
	))
	return {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"runId": RUN_ID,
		"adapter": "godot",
		"sessionId": SESSION_ID,
		"worldId": _world_id(),
		"worldRevision": _world_revision(),
		"createdAtMs": _now_ms(),
		"events": events,
		"summaries": {
			"runSignature": "%s:%s:%s:%s" % [RUN_ID, SESSION_ID, _world_id(), _world_revision()],
			"actorSignatures": _actor_signatures(),
			"fallbackCounters": {"total": 0},
			"commandOutcomeCounts": {"validated": 0, "executed": 0, "rejected": 0},
			"domainTriggerCounts": _event_family_counts("domain"),
			"verdictEndStateTrace": _verdict_end_state_trace(summary),
			"blockedChecks": []
		},
		"playableSummary": summary,
		"playability": {
			"inputPath": "read TS_Station_IntakeRules -> focus StationIntakeZone -> SA_BREAK x4",
			"expectedPlayerInterpretation": "Risky non-procedural speech is what exposes the player to Station systems.",
			"observedConfusionPoint": "The prototype uses a forced smoke path; manual play still needs human playtest notes."
		}
	}

func _interact() -> void:
	if current_focus == null:
		_set_notice("notice.no_focus.title", "notice.no_focus.body")
		_record_event(
			"observation",
			"no_focus",
			"No readable rule or Cover Test zone is in range.",
			{
				"uiSummaryKey": "event.no_focus",
				"uiSummaryArgs": {}
			}
		)
		return

	if current_focus_kind == "text_surface":
		var surface_id := str(current_focus.get_meta("surface_id", ""))
		var surface_label := _localized_text_surface_label(current_focus, surface_id)
		read_surface_ids[surface_id] = true
		if stage == "ambient":
			stage = "report"
		_set_notice(
			"text_surface.%s.label" % surface_id,
			"notice.text_surface.body",
			{},
			{
				"bodyKey": "text_surface.%s.body" % surface_id,
				"law": str(current_focus.get_meta("law_id", "")),
				"coverTest": str(current_focus.get_meta("cover_test_id", ""))
			}
		)
		_record_event(
			"observation",
			"text_surface_read",
			"Read %s; Dream Law %s is now in player-facing evidence." % [
				surface_id,
				str(current_focus.get_meta("law_id", ""))
			],
			{
				"textSurfaceId": surface_id,
				"dreamLawIds": [str(current_focus.get_meta("law_id", ""))],
				"coverTestIds": [str(current_focus.get_meta("cover_test_id", ""))],
				"uiSummaryKey": "event.text_surface_read",
				"uiSummaryArgs": {
					"surface": surface_label,
					"law": str(current_focus.get_meta("law_id", ""))
				}
			}
		)
		return

	if current_focus_kind == "zone":
		var cover_test_id := str(current_focus.get_meta("cover_test_id", ""))
		var test: Dictionary = COVER_TESTS.get(cover_test_id, {})
		_set_notice(
			str(test.get("titleKey", "")),
			"notice.cover_test.body",
			{},
			{"promptKey": str(test.get("promptKey", ""))}
		)
		_record_event(
			"domain",
			"cover_test_focused",
			"Focused %s. Choose a bounded speech act." % cover_test_id,
			{
				"zoneId": str(current_focus.get_meta("zone_id", "")),
				"uiSummaryKey": "event.cover_test_focused",
				"uiSummaryArgs": {"coverTest": cover_test_id}
			}
		)

func _apply_speech_act(action_name: String) -> void:
	if current_focus == null or current_focus_kind != "zone":
		_set_notice("notice.no_cover_test.title", "notice.no_cover_test.body")
		_record_event(
			"domain",
			"speech_without_cover_test",
			"Speech choice ignored because no Cover Test zone is focused.",
			{
				"uiSummaryKey": "event.speech_without_cover_test",
				"uiSummaryArgs": {}
			}
		)
		return

	var speech: Dictionary = SPEECH_ACTS[action_name]
	var cover_test_id := str(current_focus.get_meta("cover_test_id", ""))
	var test: Dictionary = COVER_TESTS.get(cover_test_id, {})
	var zone_id := str(current_focus.get_meta("zone_id", ""))
	var delta := int(speech["delta"])
	var previous_exposure := exposure
	exposure = clampi(exposure + delta, 0, 125)
	_update_station_state()

	var defused := delta <= 0
	var pressure_line_key := str(test.get("defuseKey", "")) if defused else str(test.get("pressureKey", ""))
	var pressure_line := _text(pressure_line_key)
	_set_actor_line_key(str(test.get("actorId", "")), pressure_line_key)
	_set_notice(
		str(test.get("titleKey", "")),
		"notice.speech.body",
		{},
		{
			"pressureKey": pressure_line_key,
			"speechAct": speech["id"],
			"before": previous_exposure,
			"after": exposure
		}
	)
	var summary := "%s used %s in %s: Exposure %s%d -> %d." % [
		cover_test_id,
		speech["id"],
		zone_id,
		"+" if delta >= 0 else "",
		delta,
		exposure
	]
	if defused:
		summary += " Cover held through procedural speech."
	else:
		summary += " Pressure escalated with deterministic why-line."
	if station["verdictReady"]:
		summary += " Verdict is ready."
		outcome_visible = true
		outcome_title_key = "outcome.verdict.title"
		outcome_title_args = {}
		outcome_body_key = "outcome.verdict.body"
		outcome_body_args = {"pressureKey": pressure_line_key}
	elif station["inquestOpen"]:
		summary += " Inquest is open."
	elif station["intakeOpen"]:
		summary += " Station intake is open."

	_record_event(
		"domain",
		"cover_test_evaluated",
		summary,
		{
			"zoneId": zone_id,
			"coverTestId": cover_test_id,
			"speechAct": speech["id"],
			"reasonCode": str(speech["reason"]),
			"warningTier": str(speech["tier"]),
			"exposureBefore": previous_exposure,
			"exposureAfter": exposure,
			"socialLoopStage": stage,
			"uiSummaryKey": "event.cover_test_defused" if defused else "event.cover_test_pressure",
			"uiSummaryArgs": {
				"coverTest": cover_test_id,
				"speechAct": speech["id"],
				"delta": delta,
				"exposure": exposure
			}
		}
	)

func _update_focus() -> void:
	var best_node: Node3D = null
	var best_kind := ""
	var best_distance := FOCUS_RADIUS
	for node in get_tree().get_nodes_in_group("text_surfaces"):
		if node is Node3D:
			var distance := _player.global_position.distance_to((node as Node3D).global_position)
			if distance < best_distance:
				best_node = node as Node3D
				best_kind = "text_surface"
				best_distance = distance
	for node in get_tree().get_nodes_in_group("interaction_zones"):
		if node is Node3D:
			var distance := _player.global_position.distance_to((node as Node3D).global_position)
			if distance < best_distance:
				best_node = node as Node3D
				best_kind = "zone"
				best_distance = distance
	current_focus = best_node
	current_focus_kind = best_kind

func _force_focus_text_surface(surface_id: String) -> void:
	for node in get_tree().get_nodes_in_group("text_surfaces"):
		if str(node.get_meta("surface_id", "")) == surface_id and node is Node3D:
			current_focus = node as Node3D
			current_focus_kind = "text_surface"
			return

func _force_focus_zone(zone_id: String) -> void:
	for node in get_tree().get_nodes_in_group("interaction_zones"):
		if str(node.get_meta("zone_id", "")) == zone_id and node is Node3D:
			current_focus = node as Node3D
			current_focus_kind = "zone"
			return

func _update_station_state() -> void:
	if exposure >= STATION_INTEREST_THRESHOLD:
		station["intakeOpen"] = true
		stage = "intake"
	if exposure >= INQUEST_THRESHOLD:
		station["inquestOpen"] = true
		stage = "intake"
	if exposure >= VERDICT_THRESHOLD:
		station["verdictReady"] = true
		station["sessionTerminationAllowed"] = true
		stage = "verdict"

func _refresh_hud() -> void:
	if _hud == null:
		return
	var prompt := _text("prompt.default")
	var choices_enabled := false
	if current_focus != null and current_focus_kind == "text_surface":
		var surface_id := str(current_focus.get_meta("surface_id", ""))
		prompt = _text("prompt.read_surface", {"surface": _localized_text_surface_label(current_focus, surface_id)})
	elif current_focus != null and current_focus_kind == "zone":
		prompt = _text("prompt.cover_test", {"coverTest": str(current_focus.get_meta("cover_test_id", ""))})
		choices_enabled = true
	if _hud.has_method("set_status"):
		_hud.set_status(stage, exposure, station, _objective())
	if _hud.has_method("set_focus"):
		_hud.set_focus(prompt, choices_enabled)
	if _hud.has_method("set_notice"):
		_hud.set_notice(_text(notice_title_key, notice_title_args), _text(notice_body_key, notice_body_args), true)
	if _hud.has_method("set_outcome"):
		_hud.set_outcome(
			outcome_visible,
			_text(outcome_title_key, outcome_title_args) if not outcome_title_key.is_empty() else "",
			_text(outcome_body_key, outcome_body_args) if not outcome_body_key.is_empty() else ""
		)
	if _hud.has_method("set_evidence"):
		_hud.set_evidence(_recent_events())

func _objective() -> String:
	if station["verdictReady"]:
		return _text("objective.verdict")
	if station["inquestOpen"]:
		return _text("objective.inquest")
	if station["intakeOpen"]:
		return _text("objective.intake")
	if read_surface_ids.is_empty():
		return _text("objective.read_rule")
	return _text("objective.enter_cover_test")

func _recent_events() -> Array:
	var start_index: int = max(0, evidence_events.size() - 6)
	return evidence_events.slice(start_index, evidence_events.size())

func _record_event(event_family: String, event_name: String, summary: String, extra: Dictionary) -> void:
	evidence_events.append(_make_event(event_family, event_name, summary, extra))

func _make_event(event_family: String, event_name: String, summary: String, extra: Dictionary) -> Dictionary:
	_event_sequence += 1
	var timestamp_ms := _now_ms()
	var event := {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"eventId": "%s-%03d-%d" % [event_name, _event_sequence, timestamp_ms],
		"eventFamily": event_family,
		"eventName": event_name,
		"adapter": "godot",
		"sessionId": SESSION_ID,
		"worldId": _world_id(),
		"worldRevision": _world_revision(),
		"summary": summary,
		"timestampMs": timestamp_ms
	}
	if event_family == "domain" and not extra.has("socialLoopStage"):
		event["socialLoopStage"] = stage
	for key in extra.keys():
		event[key] = extra[key]
	return event

func _set_notice(title_key: String, body_key: String, title_args: Dictionary = {}, body_args: Dictionary = {}) -> void:
	notice_title_key = title_key
	notice_title_args = title_args.duplicate(true)
	notice_body_key = body_key
	notice_body_args = body_args.duplicate(true)

func _set_actor_line(actor_id: String, line: String) -> void:
	if actor_id.is_empty():
		return
	for node in get_tree().get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == actor_id and node.has_method("say"):
			node.say(line)
			return

func _set_actor_line_key(actor_id: String, line_key: String) -> void:
	if actor_id.is_empty():
		return
	for node in get_tree().get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == actor_id:
			if node.has_method("say_key"):
				node.say_key(line_key)
			elif node.has_method("say"):
				node.say(_text(line_key))
			return

func _text(key: String, args: Dictionary = {}, fallback := "") -> String:
	var localization := _localization()
	if localization != null and localization.has_method("text"):
		return str(localization.text(key, args, fallback))
	var translated := str(TranslationServer.translate(StringName(key)))
	if translated == key and not fallback.is_empty():
		translated = fallback
	return translated.format(args)

func _localized_text_surface_label(surface: Node, surface_id: String) -> String:
	if surface.has_method("localized_display_name"):
		return str(surface.localized_display_name())
	return _text("text_surface.%s.label" % surface_id, {}, surface_id)

func _localization() -> Node:
	var nodes := get_tree().get_nodes_in_group("localization_services")
	if nodes.is_empty():
		return null
	return nodes[0]

func _current_locale() -> String:
	var localization := _localization()
	if localization != null and localization.has_method("get_locale"):
		return str(localization.get_locale())
	var locale := TranslationServer.get_locale()
	if locale.begins_with("en"):
		return "en"
	return "ko"

func _world_id() -> String:
	return str(_root.get_meta("world_id", ShellSchema.WORLD_ID))

func _world_revision() -> String:
	return str(_root.get_meta("world_revision", ShellSchema.WORLD_REVISION))

func _actor_signatures() -> Dictionary:
	var signatures := {"player": "%s:player" % _world_id()}
	for node in get_tree().get_nodes_in_group("npc_placeholders"):
		var npc_id := str(node.get_meta("npc_id", ""))
		if not npc_id.is_empty():
			signatures[npc_id] = "%s:%s:%s" % [_world_id(), npc_id, stage]
	return signatures

func _event_family_counts(event_family: String) -> Dictionary:
	var counts := {}
	for event in evidence_events:
		if str(event.get("eventFamily", "")) != event_family:
			continue
		var event_name := str(event.get("eventName", ""))
		counts[event_name] = int(counts.get(event_name, 0)) + 1
	return counts

func _verdict_end_state_trace(summary: Dictionary) -> String:
	return "Text surface read -> Station cover test -> Exposure %d -> intake:%s inquest:%s verdict:%s termination:%s" % [
		int(summary.get("exposure", 0)),
		str(station.get("intakeOpen", false)),
		str(station.get("inquestOpen", false)),
		str(station.get("verdictReady", false)),
		str(station.get("sessionTerminationAllowed", false))
	]

func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
