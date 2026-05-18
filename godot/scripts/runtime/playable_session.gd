extends Node

const ShellSchema := preload("res://scripts/data/shell_schema.gd")

const FOCUS_RADIUS := 3.0
const RUN_ID := "dre-171-playable-slice-run"
const SESSION_ID := "dre-171-playable-session"
const CONVERSATION_ID := "conv-same-order"
const RECORDED_STATEMENT_LINE := "저는 이 꿈에 방금 들어왔어요."
const RECORDED_STATEMENT_SCOPE := "legacy_explicit_recorded_statement_internal"
const RESPONSE_HESITATION_THRESHOLD_MS := 12000
const SHARE_THRESHOLD := 50
const REPORT_THRESHOLD := 70
const INQUEST_THRESHOLD := 100
const PROVIDER_STATE := {
	"mode": "fallback_only_m1",
	"modeLabel": "fallback-only M1",
	"liveVerified": false,
	"selectedModel": "none",
	"authorityBoundary": "wording_only_when_later_enabled",
	"decisionPath": "deterministic_fallback"
}

const SIGNAL_SUSPICION_WEIGHT := {
	"local_routine_mismatch": 35,
	"dream_language_leak": 60,
	"memory_gap_admission": 20,
	"role_script_break": 20,
	"prior_statement_contradiction": 40,
	"authority_evasion": 25,
	"over_explanation": 15,
	"response_hesitation": 10
}

const SIGNAL_REPORT_WEIGHT := {
	"local_routine_mismatch": 30,
	"dream_language_leak": 55,
	"memory_gap_admission": 10,
	"role_script_break": 15,
	"prior_statement_contradiction": 35,
	"authority_evasion": 25,
	"over_explanation": 10,
	"response_hesitation": 5
}

const SIGNAL_WHY_LINES := {
	"local_routine_mismatch": "그 말은 점원이 전제한 단골 루틴과 맞지 않습니다.",
	"dream_language_leak": "그 말에는 이곳 사람이 쓰지 않는 꿈/바깥 세계 표현이 들어 있습니다.",
	"memory_gap_admission": "그 말은 알고 있어야 할 지역 기억이 비어 있음을 인정합니다.",
	"role_script_break": "그 말은 평범한 구매 상황의 사회적 대본에서 벗어납니다.",
	"prior_statement_contradiction": "그 말은 앞선 대화 기록과 충돌합니다.",
	"authority_evasion": "그 말은 직접적인 절차 질문을 피합니다.",
	"over_explanation": "그 말은 일상 루틴에 비해 지나치게 길게 해명합니다.",
	"response_hesitation": "평범한 주문 질문에서 답변이 늦어져 불확실성 기록으로 남았습니다."
}

const ACTOR_AGENT_ROLES := {
	"NPC_Store_Clerk": "store_clerk",
	"NPC_Store_Manager": "store_manager",
	"NPC_Waiting_Customer": "waiting_customer",
	"NPC_Studio_PM": "studio_pm",
	"NPC_Park_Witness": "park_witness",
	"NPC_Station_Officer": "station_officer"
}

const OBJECT_VISIBILITY := {
	"store_queue_mark": ["store_clerk", "waiting_customer"],
	"store_counter": ["store_clerk", "waiting_customer", "store_manager"],
	"usual_order_cue": ["store_clerk", "store_manager", "waiting_customer"],
	"receipt_tray": ["store_clerk", "store_manager"],
	"correction_slip": ["store_clerk", "store_manager"],
	"report_tray": ["store_clerk", "store_manager", "station_officer"],
	"park_notice_board": ["park_witness", "waiting_customer", "studio_pm"],
	"studio_review_queue": ["studio_pm"],
	"station_dossier": ["station_officer"],
	"civic_ledger": ["station_officer"]
}

const ENVIRONMENT_OBJECT_ORDER := [
	"store_queue_mark",
	"store_counter",
	"usual_order_cue",
	"receipt_tray",
	"correction_slip",
	"report_tray",
	"park_notice_board",
	"studio_review_queue",
	"station_dossier",
	"civic_ledger"
]

const ENVIRONMENT_AFFORDANCE_ORDER := [
	"accept_routine",
	"note_wary",
	"complain_delay",
	"accept_repair",
	"leave_queue",
	"refuse_contact",
	"share_local_tip",
	"keep_distance",
	"pause_service",
	"cite_expected_order",
	"create_receipt",
	"mark_receipt",
	"offer_correction",
	"attach_correction",
	"place_note",
	"post_rumor",
	"vouch_routine",
	"post_warning",
	"post_repair_notice",
	"invite_review",
	"offer_conditional_review",
	"defer_review",
	"block_review",
	"forward_report",
	"cite_record"
]

const STORE_LEDGER_EVENT_KINDS := [
	"store_sale_normal",
	"store_sale_corrected",
	"queue_repair_accepted",
	"queue_left",
	"queue_contact_refused",
	"store_exception_reported",
	"store_report_escalated",
	"service_paused",
	"store_receipt_marked",
	"correction_offered",
	"correction_attached"
]

const ENVIRONMENT_ACTION_RULES := {
	"store_counter": {
		"pause_service": {
			"fromStates": ["serving", "idle"],
			"toState": "paused",
			"eventKind": "service_paused",
			"allowedRoles": ["store_clerk", "store_manager"]
		}
	},
	"store_queue_mark": {
		"accept_routine": {
			"fromStates": ["player_waiting", "delayed"],
			"toState": "settled",
			"eventKind": "queue_routine_kept",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true,
			"requiresStoreLedgerEvent": true
		},
		"note_wary": {
			"fromStates": ["player_waiting", "delayed"],
			"toState": "delayed",
			"eventKind": "queue_wary_noted",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true,
			"requiresStoreLedgerEvent": true
		},
		"complain_delay": {
			"fromStates": ["player_waiting", "delayed", "disrupted"],
			"toState": "disrupted",
			"eventKind": "queue_delay_noted",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true
		},
		"accept_repair": {
			"fromStates": ["player_waiting", "delayed", "disrupted"],
			"toState": "settled",
			"eventKind": "queue_repair_accepted",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true
		},
		"leave_queue": {
			"fromStates": ["disrupted"],
			"toState": "empty",
			"eventKind": "queue_left",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true,
			"requiresStoreLedgerEvent": true
		},
		"refuse_contact": {
			"fromStates": ["disrupted"],
			"toState": "refused",
			"eventKind": "queue_contact_refused",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true
		},
		"share_local_tip": {
			"fromStates": ["settled"],
			"toState": "helped",
			"eventKind": "local_tip_shared",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true,
			"requiresLedgerEventKinds": ["public_routine_vouched"],
			"minimumLocalTrust": 55
		},
		"keep_distance": {
			"fromStates": ["delayed"],
			"toState": "distanced",
			"eventKind": "queue_distance_kept",
			"allowedRoles": ["waiting_customer"],
			"requiresLedgerEvent": true,
			"requiresLedgerEventKinds": ["public_warning_posted"],
			"maximumLocalTrust": 45
		}
	},
	"usual_order_cue": {
		"cite_expected_order": {
			"fromStates": ["read", "cited"],
			"toState": "cited",
			"eventKind": "usual_order_cited",
			"allowedRoles": ["store_clerk", "store_manager"]
		}
	},
	"receipt_tray": {
		"create_receipt": {
			"fromStates": ["blank"],
			"toState": "normal",
			"eventKind": "store_sale_normal",
			"allowedRoles": ["store_clerk"]
		},
		"mark_receipt": {
			"fromStates": ["blank", "normal"],
			"toState": "marked",
			"eventKind": "store_receipt_marked",
			"allowedRoles": ["store_clerk", "store_manager"]
		}
	},
	"correction_slip": {
		"offer_correction": {
			"fromStates": ["absent"],
			"toState": "offered",
			"eventKind": "correction_offered",
			"allowedRoles": ["store_clerk", "store_manager"]
		},
		"attach_correction": {
			"fromStates": ["offered", "accepted"],
			"toState": "attached",
			"eventKind": "store_sale_corrected",
			"allowedRoles": ["store_clerk", "store_manager"]
		}
	},
	"report_tray": {
		"place_note": {
			"fromStates": ["empty", "pending"],
			"toState": "pending",
			"eventKind": "store_exception_reported",
			"allowedRoles": ["store_clerk", "store_manager"]
		},
		"forward_report": {
			"fromStates": ["pending", "filed"],
			"toState": "forwarded",
			"eventKind": "store_report_escalated",
			"allowedRoles": ["store_manager"]
		}
	},
	"park_notice_board": {
		"post_rumor": {
			"fromStates": ["clear", "rumored"],
			"toState": "rumored",
			"eventKind": "public_rumor_posted",
			"allowedRoles": ["park_witness"],
			"requiresLedgerEvent": true
		},
		"vouch_routine": {
			"fromStates": ["clear", "vouched"],
			"toState": "vouched",
			"eventKind": "public_routine_vouched",
			"allowedRoles": ["park_witness"],
			"requiresLedgerEvent": true
		},
		"post_warning": {
			"fromStates": ["clear", "warned"],
			"toState": "warned",
			"eventKind": "public_warning_posted",
			"allowedRoles": ["park_witness"],
			"requiresLedgerEvent": true
		},
		"post_repair_notice": {
			"fromStates": ["clear", "rumored"],
			"toState": "repaired",
			"eventKind": "public_repair_noted",
			"allowedRoles": ["park_witness"],
			"requiresLedgerEvent": true,
			"requiresStoreLedgerEvent": true
		}
	},
	"studio_review_queue": {
		"invite_review": {
			"fromStates": ["open"],
			"toState": "invited",
			"eventKind": "studio_review_invited",
			"allowedRoles": ["studio_pm"],
			"requiresLedgerEvent": true,
			"requiresLedgerEventKinds": ["public_routine_vouched"],
			"minimumLocalTrust": 55
		},
		"offer_conditional_review": {
			"fromStates": ["open"],
			"toState": "conditional",
			"eventKind": "studio_review_conditioned",
			"allowedRoles": ["studio_pm"],
			"requiresLedgerEvent": true,
			"requiresLedgerEventKinds": ["public_repair_noted"],
			"minimumLocalTrust": 48
		},
		"defer_review": {
			"fromStates": ["open"],
			"toState": "deferred",
			"eventKind": "studio_review_deferred",
			"allowedRoles": ["studio_pm"],
			"requiresLedgerEvent": true,
			"requiresLedgerEventKinds": ["public_warning_posted"],
			"maximumLocalTrust": 45
		},
		"block_review": {
			"fromStates": ["open"],
			"toState": "blocked",
			"eventKind": "studio_review_blocked",
			"allowedRoles": ["studio_pm"],
			"requiresLedgerEvent": true,
			"requiresLedgerEventKinds": ["station_record_cited"]
		}
	},
	"station_dossier": {
		"cite_record": {
			"fromStates": ["absent", "opened", "cited"],
			"toState": "cited",
			"eventKind": "station_record_cited",
			"allowedRoles": ["station_officer"],
			"requiresLedgerEvent": true,
			"requiresStoreLedgerEvent": true
		}
	}
}

const CONVERSATION_BEATS := {
	"store.same_order.routine": {
		"actorId": "NPC_Store_Clerk",
		"choiceSetId": "store.same_order.routine.choices",
		"npcLine": "오늘도 같은 걸로 드릴까요?",
		"choices": [
			{
				"id": "store.same_order.safe",
				"line": "네, 같은 걸로 부탁해요.",
				"intent": "safe/local",
				"signals": [],
				"npcResponse": "네. 표식 하나, 같은 봉투로 처리하겠습니다.",
				"nextPromptId": "store.same_order.probe"
			},
			{
				"id": "store.same_order.repair",
				"line": "제가 보통 뭘 시켰죠?",
				"intent": "uncertain/repair",
				"signals": ["memory_gap_admission"],
				"npcResponse": "보통은 표식 하나라고 하셨죠. 오늘은 왜 확인하시나요?",
				"nextPromptId": "store.same_order.probe"
			},
			{
				"id": "store.same_order.risky",
				"line": "오늘 처음 왔는데요.",
				"intent": "risky/weird",
				"signals": ["local_routine_mismatch"],
				"npcResponse": "처음이라고요? 어제도 같은 자리에서 같은 말을 하셨는데요.",
				"nextPromptId": "store.same_order.probe"
			}
		]
	},
	"store.same_order.probe": {
		"actorId": "NPC_Store_Clerk",
		"choiceSetId": "store.same_order.probe.choices",
		"npcLine": "어제 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?",
		"choices": [
			{
				"id": "store.same_order.probe.safe",
				"line": "맞습니다. 제가 착각했습니다.",
				"intent": "safe/local",
				"signals": [],
				"npcResponse": "그럼 같은 봉투로 두겠습니다.",
				"nextPromptId": ""
			},
			{
				"id": "store.same_order.probe.repair",
				"line": "어제 일이 조금 흐릿해서 확인했습니다.",
				"intent": "uncertain/repair",
				"signals": ["memory_gap_admission"],
				"npcResponse": "흐릿하다고요. 기록에는 남겨두겠습니다.",
				"nextPromptId": ""
			},
			{
				"id": "store.same_order.probe.risky",
				"line": "저는 여기 사람이 아닙니다.",
				"intent": "risky/weird",
				"signals": ["role_script_break", "prior_statement_contradiction"],
				"npcResponse": "그 말은 그냥 넘길 수 없습니다.",
				"nextPromptId": ""
			}
		]
	}
}

const DIALOGUE_ACTIONS := {
	"dialogue_choice_1": 0,
	"dialogue_choice_2": 1,
	"dialogue_choice_3": 2
}

var stage := "normal"
var suspicion := 0
var report_weight := 0
var exposure := 0
var station := {
	"intakeOpen": false,
	"inquestOpen": false,
	"verdictReady": false,
	"sessionTerminationAllowed": false
}
var evidence_events: Array[Dictionary] = []
var prologue_evidence: Array[Dictionary] = []
var command_outcome_counts := {"validated": 0, "executed": 0, "rejected": 0}
var read_surface_ids: Dictionary = {}
var current_focus: Node3D = null
var current_focus_kind := ""
var codex_focus_hold_frames := 0
var conversation_active := false
var current_prompt_id := "store.same_order.routine"
var current_turn_number := 0
var current_turn_id := "turn-0"
var conversation_history: Array[Dictionary] = []
var choice_catalog: Array = []
var notice_title := "시작 절차"
var notice_body := "상점 카운터에서 점원의 평범한 질문에 답하세요. 말이 기록이 될 수 있습니다."
var inspected_world_record_prop: Dictionary = {}
var inspected_world_record_history: Array[Dictionary] = []
var inspected_npc_state: Dictionary = {}
var inspected_npc_history: Array[Dictionary] = []
var outcome_visible := false
var outcome_title := ""
var outcome_body := ""
var last_why_line := ""
var last_why_line_key := ""
var last_dialogue_choice := ""
var last_choice_intent := ""
var last_reason_code := ""
var session_outcome := "running"
var route_outcome := "running"
var repair_attempt_count := 0
var repair_state := "unused"
var response_hesitation_count := 0
var _prompt_started_ms := 0
var _hesitation_recorded_turn_ids: Dictionary = {}
var record_objects := {
	"store_queue_mark": "player_waiting",
	"store_counter": "serving",
	"usual_order_cue": "read",
	"receipt_tray": "blank",
	"correction_slip": "absent",
	"report_tray": "empty",
	"park_notice_board": "clear",
	"studio_review_queue": "open",
	"station_dossier": "absent",
	"civic_ledger": "append_only"
}
var civic_economy := {
	"accountCredit": 3,
	"localTrust": 50,
	"recordBurden": 0,
	"stationAttention": 0
}
var civic_ledger: Array[Dictionary] = []
var agent_action_log: Array[Dictionary] = []
var _event_sequence := 0
var _civic_ledger_sequence := 0
var _agent_action_sequence := 0

@onready var _root: Node = get_parent()
@onready var _hud: CanvasLayer = $"../SocialStealthHud"
@onready var _player: CharacterBody3D = $"../Actors/Player"

func _ready() -> void:
	add_to_group("playable_sessions")
	if _hud != null and _hud.has_signal(&"free_input_submitted"):
		_hud.connect(&"free_input_submitted", Callable(self, "submit_free_input"))
	_record_event(
		"session",
		"playable_session_started",
		"Conversation-first prologue started. Reach the Store Clerk and answer the Same Order prompt.",
		{
			"prologueStep": "beginning",
			"sessionOutcome": session_outcome,
			"uiSummaryKey": "event.session_started",
			"uiSummaryArgs": {}
		}
	)
	_refresh_hud()

func _process(_delta: float) -> void:
	if codex_focus_hold_frames > 0:
		codex_focus_hold_frames -= 1
	else:
		_update_focus()
	_maybe_record_response_hesitation()
	_refresh_hud()

func _unhandled_input(event: InputEvent) -> void:
	if not event.is_pressed() or event.is_echo():
		return
	if _session_locked():
		if event.is_action_pressed(&"restart_session"):
			get_tree().reload_current_scene()
			get_viewport().set_input_as_handled()
			return
		if event.is_action_pressed(&"quit_session"):
			get_tree().quit()
			get_viewport().set_input_as_handled()
			return
		get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed(&"interact"):
		_interact()
		get_viewport().set_input_as_handled()
		return
	for action_name in DIALOGUE_ACTIONS.keys():
		if event.is_action_pressed(StringName(action_name)):
			_select_dialogue_index(int(DIALOGUE_ACTIONS[action_name]))
			get_viewport().set_input_as_handled()
			return
	if event.is_action_pressed(&"dialogue_recorded_statement"):
		submit_recorded_statement()
		get_viewport().set_input_as_handled()

func run_smoke_sequence() -> Dictionary:
	_force_focus_zone("StoreCounterZone")
	_interact()
	_select_dialogue_choice("store.same_order.risky")
	submit_recorded_statement()
	return build_summary()

func debug_codex_gameplay_action_catalog() -> Array[Dictionary]:
	return [
		{
			"actionId": "focus.store_counter",
			"payloadSchema": {},
			"playerMeaning": "Move Codex/player attention to the Store counter interaction zone."
		},
		{
			"actionId": "conversation.start",
			"payloadSchema": {},
			"playerMeaning": "Start the Store Clerk conversation inside the running scene."
		},
		{
			"actionId": "player.wait.hesitation_record",
			"payloadSchema": {},
			"playerMeaning": "Record a delayed answer as player uncertainty."
		},
		{
			"actionId": "dialogue.choice.by_id",
			"payloadSchema": {"choiceId": "string"},
			"playerMeaning": "Choose one currently available dialogue line by stable id."
		},
		{
			"actionId": "dialogue.choice.by_index",
			"payloadSchema": {"index": "int"},
			"playerMeaning": "Choose one currently available dialogue line by zero-based position."
		},
		{
			"actionId": "player.type.free_input",
			"payloadSchema": {"line": "string"},
			"playerMeaning": "Submit typed player speech through the same deterministic consequence path used by the HUD."
		},
		{
			"actionId": "focus.world_record_prop",
			"payloadSchema": {"objectId": "string"},
			"playerMeaning": "Move Codex/player attention to one visible environment record prop."
		},
		{
			"actionId": "focus.text_surface",
			"payloadSchema": {"surfaceId": "string"},
			"playerMeaning": "Move Codex/player attention to a place rule board so its local social rule can be read."
		},
		{
			"actionId": "focus.npc",
			"payloadSchema": {"npcId": "string"},
			"playerMeaning": "Move Codex/player attention to one visible NPC so their current social reaction can be read."
		},
		{
			"actionId": "player.interact.focused",
			"payloadSchema": {},
			"playerMeaning": "Press the current focused interaction in the running scene."
		},
		{
			"actionId": "inspect.world_record_prop",
			"payloadSchema": {"objectId": "string"},
			"playerMeaning": "Read one visible environment record prop, such as the Park notice board, through the same HUD notice area a player uses."
		},
		{
			"actionId": "inspect.npc",
			"payloadSchema": {"npcId": "string"},
			"playerMeaning": "Read one visible NPC reaction through the same HUD notice area a player uses."
		}
	]

func debug_codex_gameplay_snapshot() -> Dictionary:
	var summary := build_summary()
	return {
		"schemaVersion": "codex-gameplay-snapshot-v1",
		"actionCatalog": debug_codex_gameplay_action_catalog(),
		"summary": summary,
		"worldRecordProps": _world_record_prop_snapshot(),
		"inspectedWorldRecordProp": inspected_world_record_prop.duplicate(true),
		"inspectedWorldRecordHistory": inspected_world_record_history.duplicate(true),
		"inspectedNpcState": inspected_npc_state.duplicate(true),
		"inspectedNpcHistory": inspected_npc_history.duplicate(true),
		"hud": _codex_hud_snapshot()
	}

func debug_live_provider_packet(session_id_override: String = "", actor_id_override: String = "", extra_recent_events: Array = []) -> Dictionary:
	var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
	var actor_id := actor_id_override if not actor_id_override.is_empty() else str(beat.get("actorId", "NPC_Store_Clerk"))
	if actor_id.is_empty():
		actor_id = "NPC_Store_Clerk"
	var actor_role := str(ACTOR_AGENT_ROLES.get(actor_id, "store_clerk"))
	var tool_catalog := _compact_provider_tool_catalog(_environment_tool_catalog_for_actor(actor_id))
	var tool_summaries := _environment_tool_summary_lines_for_actor(actor_id)
	var recent_events: Array[String] = [
		"stage:%s" % stage,
		"prompt:%s" % current_prompt_id,
		"route:%s" % route_outcome,
		"last_choice:%s" % last_choice_intent
	]
	for line in tool_summaries:
		recent_events.append("tool:%s" % str(line))
	for event in _recent_civic_ledger_events(2):
		recent_events.append("ledger:%s:%s:%s" % [
			str(event.get("eventId", "")),
			str(event.get("kind", "")),
			str(event.get("affordance", ""))
		])
	for event in extra_recent_events:
		var event_text := str(event).strip_edges()
		if not event_text.is_empty():
			recent_events.append(event_text)

	var nearby_actors: Array[String] = ["player"]
	for npc_id in _visible_npc_states().keys():
		if str(npc_id) != actor_id:
			nearby_actors.append(str(npc_id))
		if nearby_actors.size() >= 5:
			break

	return {
		"sessionId": session_id_override if not session_id_override.is_empty() else "%s-live-provider-%d" % [SESSION_ID, Time.get_ticks_msec()],
		"npcId": actor_id,
		"landmarkId": _provider_landmark_for_actor(actor_id),
		"nearbyActors": nearby_actors,
		"recentEvents": recent_events,
		"organizationContext": {
			"organization": _provider_landmark_for_actor(actor_id),
			"role": actor_role,
			"duty": _provider_duty_for_actor(actor_id, actor_role),
			"roleVoicePolicy": _provider_role_voice_policy(actor_id, actor_role),
			"currentActorState": _provider_actor_state(actor_id),
			"currentPromptId": current_prompt_id,
			"currentTurnId": current_turn_id,
			"availableChoices": _provider_available_choices_for_actor(actor_id, beat),
			"environmentToolCatalog": tool_catalog,
			"providerJobId": "%s.%s.live-wording-proposal" % [route_outcome, current_prompt_id]
		},
		"playerSignals": {
			"suspicion": suspicion,
			"reportWeight": report_weight,
			"exposure": exposure,
			"lastSpeechAct": "SA_INQUIRE",
			"lastChoiceIntent": last_choice_intent,
			"deterministicOutcome": _session_outcome(),
			"providerBoundary": "wording_only_no_state_mutation"
		}
	}

func _provider_available_choices_for_actor(actor_id: String, beat: Dictionary) -> Array[String]:
	if actor_id != str(beat.get("actorId", "")):
		return []
	return _current_choice_lines()

func _provider_actor_state(actor_id: String) -> Dictionary:
	var state: Dictionary = _visible_npc_states().get(actor_id, {})
	return {
		"state": str(state.get("state", "normal")),
		"reactionLabel": str(state.get("reactionLabel", "")),
		"spokenLine": str(state.get("spokenLine", "")),
		"homeLandmark": str(state.get("homeLandmark", ""))
	}

func _provider_landmark_for_actor(actor_id: String) -> String:
	for npc_id in _visible_npc_states().keys():
		if str(npc_id) != actor_id:
			continue
		var state: Dictionary = _visible_npc_states().get(npc_id, {})
		var home_landmark := str(state.get("homeLandmark", ""))
		if not home_landmark.is_empty():
			return home_landmark
	match actor_id:
		"NPC_Park_Witness":
			return "Park"
		"NPC_Station_Officer":
			return "Station"
		"NPC_Studio_PM":
			return "Studio"
	return "Store"

func _provider_role_voice_policy(actor_id: String, actor_role: String) -> String:
	match actor_id:
		"NPC_Store_Clerk":
			return "Use clerk procedure voice. Do not speak as the player or decide record consequences."
		"NPC_Waiting_Customer":
			return "Use waiting-customer observer voice. Comment on queue, public records, or distance/help stance. Never confess as the player or take blame for the order."
		"NPC_Park_Witness":
			return "Use public-witness voice. Comment on notice-board facts without inventing a report."
		"NPC_Studio_PM":
			return "Use Studio PM review-gate voice. Comment on public review access without changing queue state."
		"NPC_Station_Officer":
			return "Use Station procedure voice. Ask from cited records without deciding verdicts."
	return "Use %s voice only. Do not speak as the player or change deterministic state." % actor_role

func _provider_duty_for_actor(actor_id: String, actor_role: String) -> String:
	match actor_id:
		"NPC_Store_Clerk":
			return "speak from the current Store procedure without changing records"
		"NPC_Waiting_Customer":
			return "react to visible queue and public record facts without changing authority state"
		"NPC_Park_Witness":
			return "comment on public notices and observed routine records without inventing reports"
		"NPC_Studio_PM":
			return "comment on review access from public records without changing review state"
		"NPC_Station_Officer":
			return "speak only from cited records and intake procedure without deciding verdicts"
	return "speak from the %s role without changing deterministic records" % actor_role

func _compact_provider_tool_catalog(tool_catalog: Array[Dictionary]) -> Array[Dictionary]:
	var compact: Array[Dictionary] = []
	for action in tool_catalog:
		compact.append({
			"affordance": str(action.get("affordance", "")),
			"objectId": str(action.get("objectId", "")),
			"fromStates": action.get("fromStates", []),
			"toState": str(action.get("toState", "")),
			"ledgerEventKind": str(action.get("ledgerEventKind", ""))
		})
		if compact.size() >= 4:
			break
	return compact

func debug_codex_gameplay_action(action_id: String, payload: Dictionary = {}) -> Dictionary:
	var before := _codex_small_summary(build_summary())
	var accepted := true
	var reason := "accepted"
	var action_result := {}

	match action_id:
		"focus.store_counter":
			_force_focus_zone("StoreCounterZone")
		"conversation.start":
			_start_conversation()
		"player.wait.hesitation_record":
			debug_record_response_hesitation()
		"dialogue.choice.by_id":
			var choice_id := str(payload.get("choiceId", ""))
			if choice_id.is_empty() or not _codex_choice_id_available(choice_id):
				accepted = false
				reason = "choice_id_unavailable"
			else:
				_select_dialogue_choice(choice_id)
		"dialogue.choice.by_index":
			var index := int(payload.get("index", -1))
			if index < 0 or index >= _current_choices().size():
				accepted = false
				reason = "choice_index_unavailable"
			else:
				_select_dialogue_index(index)
		"player.type.free_input":
			var line := str(payload.get("line", "")).strip_edges()
			if line.is_empty():
				accepted = false
				reason = "line_required"
			else:
				submit_free_input(line)
		"focus.world_record_prop":
			var object_id := str(payload.get("objectId", "")).strip_edges()
			if object_id.is_empty():
				accepted = false
				reason = "object_id_required"
			elif not _force_focus_record_prop(object_id):
				accepted = false
				reason = "record_prop_unavailable"
			else:
				codex_focus_hold_frames = 4
		"focus.text_surface":
			var surface_id := str(payload.get("surfaceId", "")).strip_edges()
			if surface_id.is_empty():
				accepted = false
				reason = "surface_id_required"
			elif not _force_focus_text_surface(surface_id):
				accepted = false
				reason = "text_surface_unavailable"
			else:
				codex_focus_hold_frames = 4
		"focus.npc":
			var npc_id := str(payload.get("npcId", "")).strip_edges()
			if npc_id.is_empty():
				accepted = false
				reason = "npc_id_required"
			elif not _force_focus_npc(npc_id):
				accepted = false
				reason = "npc_unavailable"
			else:
				codex_focus_hold_frames = 4
		"player.interact.focused":
			if current_focus == null:
				accepted = false
				reason = "focus_required"
			else:
				_interact()
		"inspect.world_record_prop":
			var object_id := str(payload.get("objectId", "")).strip_edges()
			if object_id.is_empty():
				accepted = false
				reason = "object_id_required"
			else:
				action_result = _inspect_world_record_prop(object_id)
				if not bool(action_result.get("ok", false)):
					accepted = false
					reason = str(action_result.get("reason", "record_prop_unavailable"))
		"inspect.npc":
			var npc_id := str(payload.get("npcId", "")).strip_edges()
			if npc_id.is_empty():
				accepted = false
				reason = "npc_id_required"
			else:
				action_result = _inspect_npc(npc_id)
				if not bool(action_result.get("ok", false)):
					accepted = false
					reason = str(action_result.get("reason", "npc_unavailable"))
		_:
			accepted = false
			reason = "unsupported_action"

	return {
		"actionId": action_id,
		"payload": payload.duplicate(true),
		"accepted": accepted,
		"reason": reason,
		"actionResult": action_result,
		"before": before,
		"after": _codex_small_summary(build_summary())
	}

func build_summary() -> Dictionary:
	_refresh_world_record_props()
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
		"suspicion": suspicion,
		"reportWeight": report_weight,
		"station": station.duplicate(true),
		"noticeTitle": notice_title,
		"noticeBody": notice_body,
		"outcomeVisible": outcome_visible,
		"outcomeTitle": outcome_title,
		"outcomeBody": outcome_body,
		"readSurfaceIds": read_surface_ids.keys(),
		"inspectedWorldRecordProp": inspected_world_record_prop.duplicate(true),
		"inspectedWorldRecordHistory": inspected_world_record_history.duplicate(true),
		"inspectedNpcState": inspected_npc_state.duplicate(true),
		"inspectedNpcHistory": inspected_npc_history.duplicate(true),
		"sessionOutcome": _session_outcome(),
		"lastWhyLine": last_why_line,
		"lastWhyLineKey": last_why_line_key,
		"lastDialogueChoice": last_dialogue_choice,
		"lastChoiceIntent": last_choice_intent,
		"lastReasonCode": last_reason_code,
		"routeOutcome": route_outcome,
		"repairAttemptCount": repair_attempt_count,
		"repairState": repair_state,
		"responseHesitationCount": response_hesitation_count,
		"recordObjects": record_objects.duplicate(true),
		"civicEconomy": civic_economy.duplicate(true),
		"civicLedger": civic_ledger.duplicate(true),
		"agentActionLog": agent_action_log.duplicate(true),
		"socialObservationTrace": _social_observation_trace(),
		"visibleNpcStates": _visible_npc_states(),
		"worldRecordProps": _world_record_prop_snapshot(),
		"providerState": _provider_state(),
		"inputLocked": _session_locked(),
		"authorityMode": _authority_mode(),
		"releaseAuthorityRequirement": _release_authority_requirement(),
		"prologueEvidence": prologue_evidence.duplicate(true),
		"conversation": {
			"conversationId": CONVERSATION_ID,
			"currentPromptId": current_prompt_id,
			"currentTurnId": current_turn_id,
			"history": conversation_history.duplicate(true),
			"availableChoices": _current_choice_lines(),
			"environmentToolCatalog": _current_environment_tool_catalog(),
			"environmentToolSummary": _current_environment_tool_summary_lines(),
			"recordedStatementLine": "",
			"recordedStatementScope": "",
			"recordedStatementAction": "",
			"typedFreeInputLine": RECORDED_STATEMENT_LINE,
			"typedFreeInputAction": "free_input_submitted",
			"typedFreeInputAvailable": true
		},
		"prologueLoop": {
			"beginning": "focus StoreCounterZone and start the Store Clerk conversation",
			"defaultVerb": "three diegetic dialogue choices plus optional typed free input; delayed answers can become records",
			"recordedStatement": "legacy recorded-statement fallback remains internal; tester-facing proof uses HUD typed input",
			"typedFreeInput": "HUD text entry submits the player's typed line into the same deterministic Evidence path",
			"responseHesitation": "If the player waits too long during a prompt, the delay is recorded as uncertainty before any provider wording can act.",
			"outcome": _session_outcome(),
			"routeOutcome": route_outcome,
			"repairState": repair_state,
			"recordObjects": record_objects.duplicate(true),
			"civicEconomy": civic_economy.duplicate(true),
			"civicLedger": civic_ledger.duplicate(true),
			"agentActionLog": agent_action_log.duplicate(true),
			"socialObservationTrace": _social_observation_trace(),
			"visibleNpcStates": _visible_npc_states(),
			"worldRecordProps": _world_record_prop_snapshot(),
			"inspectedWorldRecordProp": inspected_world_record_prop.duplicate(true),
			"inspectedWorldRecordHistory": inspected_world_record_history.duplicate(true),
			"inspectedNpcState": inspected_npc_state.duplicate(true),
			"inspectedNpcHistory": inspected_npc_history.duplicate(true),
			"providerState": _provider_state(),
			"endControls": _end_controls()
		},
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
		"Godot conversation playable Evidence Pack exported for backend validation.",
		{
			"artifactPath": artifact_path
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
			"commandOutcomeCounts": command_outcome_counts.duplicate(true),
			"domainTriggerCounts": _event_family_counts("domain"),
			"verdictEndStateTrace": _verdict_end_state_trace(summary),
			"blockedChecks": []
		},
		"playableSummary": summary,
		"playability": {
			"inputPath": "focus StoreCounterZone -> E start Same Order -> 3 risky choice -> HUD typed line",
			"expectedPlayerInterpretation": "Odd dialogue creates NPC suspicion, a report, and Station inquest pressure.",
			"deterministicOutcome": _session_outcome(),
			"routeOutcome": route_outcome,
			"repairState": repair_state,
			"responseHesitationCount": response_hesitation_count,
			"recordObjects": record_objects.duplicate(true),
			"civicEconomy": civic_economy.duplicate(true),
			"civicLedger": civic_ledger.duplicate(true),
			"agentActionLog": agent_action_log.duplicate(true),
			"socialObservationTrace": _social_observation_trace(),
			"visibleNpcStates": _visible_npc_states(),
			"worldRecordProps": _world_record_prop_snapshot(),
			"inspectedWorldRecordProp": inspected_world_record_prop.duplicate(true),
			"inspectedWorldRecordHistory": inspected_world_record_history.duplicate(true),
			"inspectedNpcState": inspected_npc_state.duplicate(true),
			"inspectedNpcHistory": inspected_npc_history.duplicate(true),
			"providerState": _provider_state(),
			"endControls": _end_controls(),
			"visibleWhyLine": last_why_line,
			"inputLocked": _session_locked(),
			"authorityMode": _authority_mode(),
			"releaseAuthorityRequirement": _release_authority_requirement(),
			"observedConfusionPoint": "Smoke and capture now target HUD typed input; the legacy recorded-statement fallback remains internal."
		}
	}

func _interact() -> void:
	if current_focus != null and current_focus_kind == "record_prop":
		var object_id := str(current_focus.get_meta("record_object_id", ""))
		var result := _inspect_world_record_prop(object_id)
		if not bool(result.get("ok", false)):
			_set_notice("기록 없음", "이 환경 기록물은 아직 읽을 수 있는 상태가 아닙니다.")
		return

	if current_focus != null and current_focus_kind == "npc":
		var npc_id := str(current_focus.get_meta("npc_id", ""))
		var result := _inspect_npc(npc_id)
		if not bool(result.get("ok", false)):
			_set_notice("NPC 없음", "이 NPC의 현재 반응은 아직 읽을 수 없습니다.")
		return

	if _session_locked():
		return

	if current_focus == null:
		_set_notice("초점 없음", "범위 안에 말을 걸 수 있는 상점 카운터나 읽을 수 있는 안내문이 없습니다.")
		_record_event(
			"observation",
			"no_focus",
			"No conversation prompt or readable text surface is in range.",
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
		_set_notice(surface_label, _text_surface_context_body(current_focus, surface_id))
		_record_event(
			"observation",
			"text_surface_read",
			"Read %s as local context before speaking." % surface_id,
			{
				"textSurfaceId": surface_id,
				"dreamLawIds": [str(current_focus.get_meta("law_id", ""))],
				"coverTestIds": [str(current_focus.get_meta("cover_test_id", ""))],
				"uiSummaryKey": "event.text_surface_read",
				"uiSummaryArgs": {"surface": surface_label, "law": str(current_focus.get_meta("law_id", ""))}
			}
		)
		return

	if current_focus_kind == "zone":
		var zone_id := str(current_focus.get_meta("zone_id", ""))
		if zone_id == "StoreCounterZone":
			_start_conversation()
			return
		_set_notice("대화 없음", "이 구역은 아직 대화 프롤로그에 연결되지 않았습니다. 상점 카운터로 가세요.")
		_record_event(
			"domain",
			"conversation_zone_unavailable",
			"Focused %s, but the conversation-first prologue starts at StoreCounterZone." % zone_id,
			{"zoneId": zone_id, "socialLoopStage": stage}
		)

func _start_conversation() -> void:
	if conversation_active:
		_show_current_prompt()
		return
	conversation_active = true
	current_prompt_id = "store.same_order.routine"
	current_turn_number = 1
	current_turn_id = "turn-%d" % current_turn_number
	_show_current_prompt()
	_record_event(
		"domain",
		"conversation_started",
		"Store Clerk opened the Same Order conversation.",
		{
			"actorId": "NPC_Store_Clerk",
			"conversationId": CONVERSATION_ID,
			"turnId": current_turn_id,
			"promptId": current_prompt_id,
			"choiceSetId": _current_choice_set_id(),
			"speakerId": "NPC_Store_Clerk",
			"conversationStage": stage,
			"outcome": _session_outcome(),
			"socialLoopStage": stage
		}
	)

func _select_dialogue_index(index: int) -> void:
	if not conversation_active:
		_set_notice("대화 전", "상점 카운터에서 E를 눌러 대화를 시작하세요.")
		return
	var choices := _current_choices()
	if index < 0 or index >= choices.size():
		return
	_apply_dialogue_turn(choices[index], "")

func _select_dialogue_choice(choice_id: String) -> void:
	for choice in _current_choices():
		if str(choice.get("id", "")) == choice_id:
			_apply_dialogue_turn(choice, "")
			return

func submit_free_input(line: String) -> void:
	if not conversation_active:
		_start_conversation()
	_apply_dialogue_turn({}, line, "typed_free_input")

func submit_recorded_statement() -> void:
	if not conversation_active:
		_set_notice("대화 전", "기록된 진술은 상점 점원과 대화를 시작한 뒤에만 제출할 수 있습니다.")
		return
	_apply_dialogue_turn({}, RECORDED_STATEMENT_LINE, "explicit_recorded_statement")

func debug_record_response_hesitation() -> void:
	_record_response_hesitation(RESPONSE_HESITATION_THRESHOLD_MS)

func _maybe_record_response_hesitation() -> void:
	if not conversation_active or _session_locked():
		return
	if _prompt_started_ms <= 0:
		return
	if _hesitation_recorded_turn_ids.has(current_turn_id):
		return
	var elapsed_ms := _now_ms() - _prompt_started_ms
	if elapsed_ms < RESPONSE_HESITATION_THRESHOLD_MS:
		return
	_record_response_hesitation(elapsed_ms)

func _record_response_hesitation(elapsed_ms: int) -> void:
	if not conversation_active or _session_locked():
		return
	if _hesitation_recorded_turn_ids.has(current_turn_id):
		return
	_hesitation_recorded_turn_ids[current_turn_id] = true
	response_hesitation_count += 1
	var signals: Array[String] = ["response_hesitation"]
	var suspicion_before := suspicion
	var report_before := report_weight
	var suspicion_delta := int(SIGNAL_SUSPICION_WEIGHT.get("response_hesitation", 0))
	var report_delta := int(SIGNAL_REPORT_WEIGHT.get("response_hesitation", 0))
	suspicion = clampi(suspicion + suspicion_delta, 0, 125)
	report_weight = clampi(report_weight + report_delta, 0, 125)
	exposure = max(suspicion, report_weight)
	_update_stage_from_pressure()
	last_reason_code = "response_hesitation"
	last_why_line = str(SIGNAL_WHY_LINES.get("response_hesitation", "응답 지연이 기록되었습니다."))
	last_why_line_key = "response_hesitation"
	var evaluation := {
		"conversationId": CONVERSATION_ID,
		"turnId": current_turn_id,
		"promptId": current_prompt_id,
		"choiceSetId": _current_choice_set_id(),
		"speakerId": "player",
		"selectedChoiceId": "",
		"freeInputHash": "",
		"inputMode": "response_hesitation",
		"recordedStatementScope": "",
		"displayedPlayerLine": "응답 지연 %dms" % elapsed_ms,
		"priorTurnIds": _prior_turn_ids(),
		"suspicionSignals": signals,
		"suspicionBefore": suspicion_before,
		"suspicionAfter": suspicion,
		"suspicionDelta": suspicion - suspicion_before,
		"reportWeightBefore": report_before,
		"reportWeightAfter": report_weight,
		"reportDelta": report_weight - report_before,
		"whyLine": last_why_line,
		"whyLineKey": "response_hesitation",
		"conversationStage": stage,
		"outcome": _session_outcome()
	}
	_record_event(
		"domain",
		"response_hesitation_noted",
		"The Store Clerk records a delayed answer before the player speaks.",
		_conversation_event_extra(evaluation)
	)
	_add_prologue_evidence(
		"response_hesitation.%s" % current_turn_id,
		"procedural_speech_log",
		stage,
		"Response hesitation recorded on %s after %dms." % [current_turn_id, elapsed_ms]
	)
	_set_notice("상점 점원", "%s\nwhy-line: %s" % [
		"답변이 늦었습니다. 점원이 불확실성으로 표시합니다.",
		last_why_line
	])

func _apply_dialogue_turn(choice: Dictionary, free_line: String, input_mode := "choice") -> void:
	if _session_locked():
		return
	var free_input := not free_line.strip_edges().is_empty()
	var selected_choice_id := ""
	var player_line := free_line.strip_edges()
	var authored_signals: Array[String] = []
	var intent := "free/recorded"
	if not free_input:
		selected_choice_id = str(choice.get("id", ""))
		player_line = str(choice.get("line", ""))
		authored_signals = _string_array(choice.get("signals", []))
		intent = str(choice.get("intent", ""))
	if player_line.is_empty():
		return

	var evaluation := _evaluate_dialogue_turn(player_line, selected_choice_id, _free_input_hash(player_line) if free_input else "", authored_signals, intent, input_mode)
	last_dialogue_choice = selected_choice_id if not selected_choice_id.is_empty() else "free_input"
	last_choice_intent = intent
	if intent == "uncertain/repair":
		repair_attempt_count += 1
		repair_state = "used_pending"
	var evaluation_signals: Array = evaluation.get("suspicionSignals", [])
	last_reason_code = str(evaluation_signals[0]) if not evaluation_signals.is_empty() else "none"
	if not str(evaluation["whyLine"]).is_empty():
		last_why_line = str(evaluation["whyLine"])
		last_why_line_key = str(evaluation.get("whyLineKey", ""))
	_apply_record_object_state(evaluation, intent)

	conversation_history.append({
		"turnId": current_turn_id,
		"promptId": current_prompt_id,
		"choiceSetId": _current_choice_set_id(),
		"selectedChoiceId": selected_choice_id,
		"freeInputHash": evaluation.get("freeInputHash", ""),
		"intent": intent,
		"inputMode": evaluation.get("inputMode", ""),
		"recordedStatementScope": evaluation.get("recordedStatementScope", ""),
		"playerLine": player_line,
		"suspicionSignals": evaluation["suspicionSignals"],
		"suspicionBefore": evaluation["suspicionBefore"],
		"suspicionAfter": evaluation["suspicionAfter"],
		"reportWeightBefore": evaluation["reportWeightBefore"],
		"reportWeightAfter": evaluation["reportWeightAfter"],
		"whyLine": evaluation["whyLine"]
	})
	_add_prologue_evidence(
		"dialogue_turn.%s" % current_turn_id,
		"procedural_speech_log",
		stage,
		"%s: %s. Signals: %s." % [current_turn_id, player_line, ", ".join(evaluation["suspicionSignals"])]
	)

	_record_event(
		"domain",
		"free_input_submitted" if free_input else "dialogue_choice_selected",
		"Player answered the Store Clerk: %s" % player_line,
		_conversation_event_extra(evaluation)
	)
	if not evaluation["suspicionSignals"].is_empty():
		_record_event(
			"domain",
			"conversation_anomaly_detected",
			"Deterministic conversation signals fired: %s." % ", ".join(evaluation["suspicionSignals"]),
			_conversation_event_extra(evaluation)
		)
	if int(evaluation["suspicionDelta"]) > 0 or int(evaluation["reportDelta"]) > 0:
		_record_event(
			"domain",
			"npc_suspicion_changed",
			"NPC suspicion changed from %d to %d." % [int(evaluation["suspicionBefore"]), int(evaluation["suspicionAfter"])],
			_conversation_event_extra(evaluation)
		)

	_apply_social_consequence(evaluation)
	_apply_npc_response(choice, free_input, evaluation)
	if _session_locked():
		return
	_advance_prompt(choice)

func _evaluate_dialogue_turn(
	player_line: String,
	selected_choice_id: String,
	free_input_hash: String,
	authored_signals: Array[String],
	intent: String,
	input_mode: String
) -> Dictionary:
	var signals := _unique_signals(authored_signals)
	if player_line.contains("꿈") or player_line.to_lower().contains("dream") or player_line.contains("세계") or player_line.contains("세이브") or player_line.contains("로드"):
		signals = _append_signal(signals, "dream_language_leak")
	if current_prompt_id.contains("same_order") and (player_line.contains("처음") or player_line.contains("방금")):
		signals = _append_signal(signals, "local_routine_mismatch")
	if player_line.contains("보통") and (player_line.contains("뭘") or player_line.contains("무엇")):
		signals = _append_signal(signals, "memory_gap_admission")
	if player_line.contains("중요하지 않") or player_line.contains("말할 수 없"):
		signals = _append_signal(signals, "authority_evasion")
	if player_line.length() > 80:
		signals = _append_signal(signals, "over_explanation")
	if intent == "risky/weird" and signals.is_empty():
		signals = _append_signal(signals, "role_script_break")

	var suspicion_before := suspicion
	var report_before := report_weight
	var suspicion_delta := 0
	var report_delta := 0
	for signal_id in signals:
		suspicion_delta += int(SIGNAL_SUSPICION_WEIGHT.get(signal_id, 0))
		report_delta += int(SIGNAL_REPORT_WEIGHT.get(signal_id, 0))
	suspicion = clampi(suspicion + suspicion_delta, 0, 125)
	report_weight = clampi(report_weight + report_delta, 0, 125)
	exposure = max(suspicion, report_weight)
	_update_stage_from_pressure()

	return {
		"conversationId": CONVERSATION_ID,
		"turnId": current_turn_id,
		"promptId": current_prompt_id,
		"choiceSetId": _current_choice_set_id(),
		"speakerId": "player",
		"selectedChoiceId": selected_choice_id,
		"freeInputHash": free_input_hash,
		"inputMode": input_mode,
		"recordedStatementScope": RECORDED_STATEMENT_SCOPE if input_mode == "explicit_recorded_statement" else "",
		"displayedPlayerLine": player_line,
		"priorTurnIds": _prior_turn_ids(),
		"suspicionSignals": signals,
		"suspicionBefore": suspicion_before,
		"suspicionAfter": suspicion,
		"suspicionDelta": suspicion - suspicion_before,
		"reportWeightBefore": report_before,
		"reportWeightAfter": report_weight,
		"reportDelta": report_weight - report_before,
		"whyLine": _why_line_for_signals(signals),
		"whyLineKey": str(signals[0]) if not signals.is_empty() else "",
		"conversationStage": stage,
		"outcome": _session_outcome()
	}

func _apply_social_consequence(evaluation: Dictionary) -> void:
	var report_before := int(evaluation["reportWeightBefore"])
	var report_after := int(evaluation["reportWeightAfter"])
	if report_before < SHARE_THRESHOLD and report_after >= SHARE_THRESHOLD:
		_record_event(
			"domain",
			"suspicion_shared",
			"The clerk shared the odd statement with the nearby witness route.",
			_conversation_event_extra(evaluation)
		)
		_set_actor_line("NPC_Park_Witness", "상점 쪽 말이 기록과 맞지 않는다고요?")
	if report_after >= REPORT_THRESHOLD and not bool(station["intakeOpen"]):
		station["intakeOpen"] = true
		stage = "reported"
		var clerk_note := _apply_role_agent_action(
			"report.clerk.place_note",
			"NPC_Store_Clerk",
			"store_clerk",
			"place_note",
			"report_tray",
			"store_same_order_clerk_statement",
			"Report pressure crossed the Store threshold, so the clerk creates a reportable Store note."
		)
		var clerk_note_event: Dictionary = clerk_note.get("event", {})
		var clerk_note_event_id := str(clerk_note_event.get("eventId", ""))
		if bool(clerk_note.get("ok", false)) and not clerk_note_event_id.is_empty():
			_apply_role_agent_action(
				"report.waiting_customer.complain_delay",
				"NPC_Waiting_Customer",
				"waiting_customer",
				"complain_delay",
				"store_queue_mark",
				"store_same_order_queue_delay",
				"A waiting customer sees the clerk note slow the line and adds public queue pressure.",
				clerk_note_event_id,
				[clerk_note_event_id]
			)
			_set_actor_line("NPC_Waiting_Customer", "줄이 멈췄어요. 저 사람 말 때문에 기록이 붙었대요.")
			_apply_role_agent_action(
				"report.park_witness.post_rumor",
				"NPC_Park_Witness",
				"park_witness",
				"post_rumor",
				"park_notice_board",
				"park_public_rumor",
				"The Park witness can see the Store note becoming public talk and pins a small notice outside the queue.",
				clerk_note_event_id,
				[clerk_note_event_id]
			)
			_set_actor_line("NPC_Park_Witness", "공원 게시판에 적어둘게요. 같은 말이 동네를 돕니다.")
		if report_after < INQUEST_THRESHOLD and bool(clerk_note.get("ok", false)):
			_apply_role_agent_action(
				"report.manager.place_followup_note",
				"NPC_Store_Manager",
				"store_manager",
				"place_note",
				"report_tray",
				"store_same_order_manager_followup",
				"The manager can see the pending Store note and adds a liability note without citing private Station facts."
			)
			var pause_result := _apply_role_agent_action(
				"report.manager.pause_service",
				"NPC_Store_Manager",
				"store_manager",
				"pause_service",
				"store_counter",
				"",
				"The manager pauses counter service because the pending Store note has made normal service unsafe to continue."
			)
			var pause_event: Dictionary = pause_result.get("event", {})
			var pause_event_id := str(pause_event.get("eventId", ""))
			if bool(pause_result.get("ok", false)) and not pause_event_id.is_empty():
				_apply_role_agent_action(
					"report.waiting_customer.leave_queue",
					"NPC_Waiting_Customer",
					"waiting_customer",
					"leave_queue",
					"store_queue_mark",
					"store_same_order_queue_left",
					"A waiting customer sees counter service pause and leaves the line instead of waiting for the unresolved report.",
					pause_event_id,
					[pause_event_id]
				)
				_set_actor_line("NPC_Waiting_Customer", "카운터까지 멈추면 저는 빠질게요.")
			_set_actor_line("NPC_Store_Manager", "보고가 붙은 동안 카운터를 잠시 멈춥니다.")
		_record_event(
			"domain",
			"station_report_created",
			"Station received a report from the Store Clerk conversation.",
			_conversation_event_extra(evaluation)
		)
		_set_actor_line("NPC_Station_Officer", "상점 기록을 접수했습니다. 이전 발화와 대조합니다.")
		_add_prologue_evidence(
			"witness_reference.%s" % current_turn_id,
			"witness_reference",
			stage,
			"Store Clerk report: %s" % str(evaluation["whyLine"])
		)
	if report_after >= INQUEST_THRESHOLD and not bool(station["inquestOpen"]):
		_open_inquest(evaluation)

func _open_inquest(evaluation: Dictionary) -> void:
	station["intakeOpen"] = true
	station["inquestOpen"] = true
	station["sessionTerminationAllowed"] = true
	stage = "inquest"
	session_outcome = "inquest_opened"
	route_outcome = "inquest_opened"
	var escalated_result := _apply_role_agent_action(
		"inquest.manager.forward_report",
		"NPC_Store_Manager",
		"store_manager",
		"forward_report",
		"report_tray",
		"store_same_order_clerk_statement",
		"The manager forwards the Store report for Station reconciliation."
	)
	var escalated_event: Dictionary = escalated_result.get("event", {})
	var escalated_event_id := str(escalated_event.get("eventId", ""))
	var cited_store_record := escalated_event_id if not escalated_event_id.is_empty() else "상점 전달 기록"
	if bool(escalated_result.get("ok", false)):
		_set_actor_line("NPC_Store_Manager", "이 상점 기록은 스테이션이 대조해야 합니다.")
	var station_citation := _apply_role_agent_action(
		"inquest.station.cite_store_report",
		"NPC_Station_Officer",
		"station_officer",
		"cite_record",
		"station_dossier",
		"station_same_order_dossier",
		"The Station cites the exact forwarded Store ledger event before narrowing the player's answer.",
		escalated_event_id,
		[escalated_event_id]
	)
	var station_citation_event: Dictionary = station_citation.get("event", {})
	var station_citation_event_id := str(station_citation_event.get("eventId", ""))
	if bool(station_citation.get("ok", false)) and not station_citation_event_id.is_empty():
		_block_studio_review_after_station_citation(station_citation_event_id)
		_apply_role_agent_action(
			"inquest.waiting_customer.refuse_contact",
			"NPC_Waiting_Customer",
			"waiting_customer",
			"refuse_contact",
			"store_queue_mark",
			"store_same_order_contact_refused",
			"A waiting customer sees the Station cite the player and refuses contact while the inquest is open.",
			station_citation_event_id,
			[station_citation_event_id]
		)
		_set_actor_line("NPC_Waiting_Customer", "스테이션이 인용했으면 저는 말 섞지 않겠습니다.")
	outcome_visible = true
	outcome_title = "스테이션 심문 개시"
	outcome_body = "상점 대화 기록이 접수되었습니다.\n사슬: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 스튜디오 리뷰 차단 -> 접촉 거부 -> 심문\n사회 반응: 대기 손님이 점원 기록을 보고 줄이 멈췄다고 말했고, 공원 목격자가 게시판에 소문을 남겼으며, 상점 관리자가 그 기록을 전달했고, 스테이션 직원이 전달 기록을 인용했습니다. 그 인용을 본 스튜디오 PM은 리뷰 줄을 차단하고, 대기 손님은 플레이어와 말 섞기를 거부했습니다.\n스테이션 인용: 보고 트레이에서 전달된 장부 %s\n역할 행동: 스테이션 직원이 전달된 Store 장부를 인용했고, 스튜디오 PM이 그 인용 기록으로 리뷰 대기열을 차단했으며, 대기 손님이 같은 인용 기록을 보고 대기 표식을 접촉 거부 상태로 바꿨습니다.\n대조 대상: 이전 발화와 방금 입력한 말\n기록된 why-line: %s\nR 다시 시작 / Q 종료" % [cited_store_record, str(evaluation["whyLine"])]
	_record_event(
		"domain",
		"station_inquest_opened",
		"Station opened formal questioning from accumulated conversation Evidence.",
		_conversation_event_extra(evaluation)
	)
	_set_actor_line("NPC_Station_Officer", "같은 대화에 두 출처가 있습니다. 지금부터 접수 형식으로만 남깁니다.")
	_add_prologue_evidence(
		"intake_dossier.%s" % current_turn_id,
		"intake_dossier",
		stage,
		"Station opened inquest from conversation %s." % CONVERSATION_ID
	)

func _block_studio_review_after_station_citation(station_citation_event_id: String) -> void:
	if station_citation_event_id.is_empty():
		return
	if str(record_objects.get("studio_review_queue", "")) != "open":
		return
	var result := _apply_role_agent_action(
		"inquest.studio_pm.block_review",
		"NPC_Studio_PM",
		"studio_pm",
		"block_review",
		"studio_review_queue",
		"studio_public_review_blocked",
		"The Studio PM sees the formal Station citation and blocks the review queue until the player has a cleaner record.",
		station_citation_event_id,
		[station_citation_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Studio_PM", "스테이션 인용이 붙었네요. 리뷰 줄은 오늘 차단하겠습니다.")
		_set_actor_reaction_state("NPC_Studio_PM", "blocked", 45)

func _apply_npc_response(choice: Dictionary, free_input: bool, evaluation: Dictionary) -> void:
	var actor_id := "NPC_Store_Clerk"
	var response := str(choice.get("npcResponse", "")) if not free_input else "그 말은 상점 기록에 그대로 남기겠습니다."
	if bool(station["inquestOpen"]):
		response = "잠시만요. 이 대화는 스테이션으로 넘기겠습니다."
	elif int(evaluation["reportWeightAfter"]) >= REPORT_THRESHOLD:
		response = "기록과 다릅니다. 담당자에게 전달하겠습니다."
	elif int(evaluation["suspicionAfter"]) >= SHARE_THRESHOLD:
		response = "잠깐만요. 방금 말은 확인이 필요합니다."
	elif int(evaluation["suspicionAfter"]) > 0 and response.is_empty():
		response = "그렇게 말씀하신 이유가 있나요?"
	elif response.is_empty():
		response = "알겠습니다."
	_set_actor_line(actor_id, response)
	_set_notice(actor_id, "%s\n플레이어 발화: %s\nwhy-line: %s" % [
		response,
		str(evaluation["displayedPlayerLine"]),
		str(evaluation["whyLine"])
	])

func _advance_prompt(choice: Dictionary) -> void:
	var next_prompt := str(choice.get("nextPromptId", "")) if not choice.is_empty() else ""
	if next_prompt.is_empty():
		_resolve_terminal_outcome()
		station["sessionTerminationAllowed"] = true
		outcome_visible = true
		outcome_title = _terminal_outcome_title()
		outcome_body = _terminal_outcome_body()
		_record_event(
			"domain",
			"conversation_outcome_reached",
			"Same Order route ended as %s." % _session_outcome(),
			{
				"actorId": "NPC_Store_Clerk",
				"conversationId": CONVERSATION_ID,
				"turnId": current_turn_id,
				"promptId": current_prompt_id,
				"choiceSetId": _current_choice_set_id(),
				"speakerId": "system",
				"conversationStage": stage,
				"outcome": _session_outcome(),
				"routeOutcome": route_outcome,
				"socialLoopStage": stage
			}
		)
		return
	current_prompt_id = next_prompt
	current_turn_number += 1
	current_turn_id = "turn-%d" % current_turn_number
	_show_current_prompt()

func _show_current_prompt() -> void:
	var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
	var npc_line := _current_npc_line(beat)
	choice_catalog = _current_choices()
	_prompt_started_ms = _now_ms()
	_set_actor_line(str(beat.get("actorId", "NPC_Store_Clerk")), npc_line)
	_set_notice("상점 점원", npc_line)

func _update_stage_from_pressure() -> void:
	if report_weight >= REPORT_THRESHOLD:
		stage = "reported"
	elif suspicion >= SHARE_THRESHOLD:
		stage = "probing"
	elif suspicion > 0:
		stage = "uneasy"
	else:
		stage = "normal"

func _refresh_hud() -> void:
	if _hud == null:
		return
	_refresh_world_record_props()
	_set_actor_reaction_state("NPC_Store_Clerk", stage, exposure)
	_set_actor_reaction_state("NPC_Store_Manager", _store_manager_reaction_stage(), exposure)
	_set_actor_reaction_state("NPC_Waiting_Customer", _waiting_customer_reaction_stage(), exposure)
	_set_actor_reaction_state("NPC_Park_Witness", _park_witness_reaction_stage(stage), exposure)
	_set_actor_reaction_state("NPC_Station_Officer", "inquest" if bool(station["inquestOpen"]) else ("reported" if bool(station["intakeOpen"]) else "normal"), exposure)
	var prompt := "WASD로 이동. 상점 카운터에 접근해 E로 대화를 시작하세요."
	var choices_enabled := false
	if conversation_active and not _session_locked():
		var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
		var tool_summary := _current_environment_tool_summary_text()
		prompt = _current_npc_line(beat)
		if not tool_summary.is_empty():
			prompt = "%s\n%s" % [prompt, tool_summary]
		choices_enabled = true
	elif current_focus != null and current_focus_kind == "record_prop":
		var object_id := str(current_focus.get_meta("record_object_id", ""))
		prompt = "E: %s 읽기" % _world_record_prop_title(object_id)
	elif current_focus != null and current_focus_kind == "text_surface":
		var surface_id := str(current_focus.get_meta("surface_id", ""))
		prompt = "E: %s 읽기" % _localized_text_surface_label(current_focus, surface_id)
	elif current_focus != null and current_focus_kind == "npc":
		prompt = "E: %s 반응 읽기" % str(current_focus.get_meta("role", "NPC"))
	elif current_focus != null and current_focus_kind == "zone":
		var zone_id := str(current_focus.get_meta("zone_id", ""))
		prompt = "E: 상점 점원과 대화 시작" if zone_id == "StoreCounterZone" else "상점 카운터가 현재 대화 프롤로그입니다."
	if _hud.has_method("set_status"):
		_hud.set_status(stage, exposure, station, _objective())
	if _hud.has_method("set_conversation"):
		_hud.set_conversation(prompt, _current_choice_lines(), RECORDED_STATEMENT_LINE, _conversation_history_lines(), choices_enabled)
	elif _hud.has_method("set_focus"):
		_hud.set_focus(prompt, choices_enabled)
	if _hud.has_method("set_notice"):
		_hud.set_notice(notice_title, notice_body, true)
	if _hud.has_method("set_outcome"):
		_hud.set_outcome(outcome_visible, outcome_title, outcome_body)
	if _hud.has_method("set_record_state"):
		_hud.set_record_state(record_objects, civic_economy, civic_ledger, _social_observation_trace(), _visible_npc_states())
	if _hud.has_method("set_provider_state"):
		_hud.set_provider_state(_provider_state())
	if _hud.has_method("set_evidence"):
		_hud.set_evidence(_recent_events())

func _store_manager_reaction_stage() -> String:
	for index in range(agent_action_log.size()):
		var reverse_index := agent_action_log.size() - 1 - index
		var action: Dictionary = agent_action_log[reverse_index]
		if str(action.get("actorId", "")) != "NPC_Store_Manager" or not bool(action.get("accepted", false)):
			continue
		match str(action.get("affordance", "")):
			"pause_service":
				return "paused"
			"forward_report":
				return "forwarded"
			"place_note":
				return "noted"
	if int(civic_economy.get("recordBurden", 0)) >= 50:
		return "reported"
	return "normal"

func _waiting_customer_reaction_stage() -> String:
	for index in range(agent_action_log.size()):
		var reverse_index := agent_action_log.size() - 1 - index
		var action: Dictionary = agent_action_log[reverse_index]
		if str(action.get("actorId", "")) != "NPC_Waiting_Customer" or not bool(action.get("accepted", false)):
			continue
		match str(action.get("affordance", "")):
			"share_local_tip":
				return "helped"
			"accept_repair":
				return "repair_accepted"
			"keep_distance":
				return "distanced"
			"leave_queue":
				return "left"
			"refuse_contact":
				return "refused"
			"note_wary", "complain_delay":
				return "delayed"
			"accept_routine":
				return "helped"
	return "normal"

func _park_witness_reaction_stage(stage: String) -> String:
	for index in range(agent_action_log.size()):
		var reverse_index := agent_action_log.size() - 1 - index
		var action: Dictionary = agent_action_log[reverse_index]
		if str(action.get("actorId", "")) != "NPC_Park_Witness" or not bool(action.get("accepted", false)):
			continue
		match str(action.get("affordance", "")):
			"vouch_routine":
				return "vouched"
			"post_repair_notice":
				return "repaired"
			"post_warning":
				return "warned"
			"post_rumor":
				return "rumored"
	if ["reported", "inquest"].has(stage):
		return "reported"
	return "normal"

func _objective() -> String:
	if _session_locked():
		return "현재 대화 결과: %s. R로 다시 시작하거나 Q로 종료하세요." % _session_outcome()
	if bool(station["intakeOpen"]):
		return "상점 대화 기록이 스테이션에 접수되었습니다. 답변의 일관성을 유지하세요."
	if conversation_active:
		return "점원의 질문에 맞는 말을 고르거나 직접 입력하세요. 말은 상점 기록에 남습니다."
	return "상점 카운터에서 점원과 대화하세요. 플레이어는 조사자가 아니라 조사받는 대상입니다."

func _recent_events() -> Array:
	var start_index: int = max(0, evidence_events.size() - 6)
	return evidence_events.slice(start_index, evidence_events.size())

func _record_event(event_family: String, event_name: String, summary: String, extra: Dictionary) -> void:
	evidence_events.append(_make_event(event_family, event_name, summary, extra))

func _add_prologue_evidence(id: String, artifact_type: String, artifact_stage: String, summary: String) -> void:
	prologue_evidence.append({
		"id": id,
		"type": artifact_type,
		"stage": artifact_stage,
		"summary": summary
	})

func _apply_record_object_state(evaluation: Dictionary, intent: String) -> void:
	var signals: Array = evaluation.get("suspicionSignals", [])
	var why_line := str(evaluation.get("whyLine", ""))
	if signals.has("memory_gap_admission"):
		_mark_receipt_if_needed(why_line)
		if str(record_objects.get("correction_slip", "")) == "absent":
			_apply_role_agent_action(
				"repair.clerk.offer_correction",
				"NPC_Store_Clerk",
				"store_clerk",
				"offer_correction",
				"correction_slip",
				"store_same_order_correction",
				"The clerk offers a correction slip because the player's memory gap can still be repaired locally."
			)
	if signals.has("local_routine_mismatch") or signals.has("role_script_break") or signals.has("prior_statement_contradiction") or signals.has("dream_language_leak"):
		_mark_receipt_if_needed(why_line)
	if intent == "safe/local" and current_prompt_id == "store.same_order.probe" and repair_attempt_count > 0:
		_attach_correction_if_needed("The player returns to the clerk's premise, so the Store attaches the correction instead of escalating.")

func _mark_receipt_if_needed(why_line: String) -> String:
	if str(record_objects.get("receipt_tray", "")) == "marked":
		return _latest_civic_ledger_id("store_receipt_marked")
	if str(record_objects.get("receipt_tray", "")) == "blank":
		var result := _apply_role_agent_action(
			"anomaly.clerk.mark_receipt",
			"NPC_Store_Clerk",
			"store_clerk",
			"mark_receipt",
			"receipt_tray",
			"store_same_order_receipt",
			why_line
		)
		var event: Dictionary = result.get("event", {})
		return str(event.get("eventId", ""))
	return ""

func _attach_correction_if_needed(why_line: String) -> void:
	var correction_event_id := _latest_civic_ledger_id("store_sale_corrected")
	if str(record_objects.get("correction_slip", "")) != "attached":
		var result := _apply_role_agent_action(
			"repair.clerk.attach_correction",
			"NPC_Store_Clerk",
			"store_clerk",
			"attach_correction",
			"correction_slip",
			"store_same_order_correction",
			why_line
		)
		var event: Dictionary = result.get("event", {})
		correction_event_id = str(event.get("eventId", correction_event_id))
	_settle_queue_after_repair(correction_event_id)

func _settle_queue_after_repair(correction_event_id: String) -> void:
	if correction_event_id.is_empty():
		return
	if str(record_objects.get("store_queue_mark", "")) == "settled":
		return
	var result := _apply_role_agent_action(
		"repair.waiting_customer.accept_repair",
		"NPC_Waiting_Customer",
		"waiting_customer",
		"accept_repair",
		"store_queue_mark",
		"store_same_order_queue_repair",
		"A waiting customer sees the correction slip attach and lets the line settle instead of turning it into a complaint.",
		correction_event_id,
		[correction_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Waiting_Customer", "정정됐으면 줄은 계속 가도 되겠네요.")
		_post_repair_notice(correction_event_id)

func _post_repair_notice(correction_event_id: String) -> void:
	if correction_event_id.is_empty():
		return
	var result := _apply_role_agent_action(
		"repair.park_witness.post_repair_notice",
		"NPC_Park_Witness",
		"park_witness",
		"post_repair_notice",
		"park_notice_board",
		"park_public_repair_notice",
		"The Park witness sees the correction record and posts that the mismatch was repaired instead of becoming a rumor.",
		correction_event_id,
		[correction_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Park_Witness", "정정 기록이 붙었으니 소문으로 돌릴 일은 아니겠네요.")
		_set_actor_reaction_state("NPC_Park_Witness", "repaired", 20)
		var event: Dictionary = result.get("event", {})
		_offer_conditional_studio_review_after_repair(str(event.get("eventId", "")))

func _offer_conditional_studio_review_after_repair(repair_notice_event_id: String) -> void:
	if repair_notice_event_id.is_empty():
		return
	if str(record_objects.get("studio_review_queue", "")) != "open":
		return
	var result := _apply_role_agent_action(
		"repair.studio_pm.offer_conditional_review",
		"NPC_Studio_PM",
		"studio_pm",
		"offer_conditional_review",
		"studio_review_queue",
		"studio_public_review_conditional",
		"The Studio PM reads the public repair notice and keeps the review queue conditional instead of fully opening or closing it.",
		repair_notice_event_id,
		[repair_notice_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Studio_PM", "공개 수습 기록은 봤습니다. 리뷰 줄은 조건부로 남겨둘게요.")
		_set_actor_reaction_state("NPC_Studio_PM", "conditional", 20)

func _note_wary_after_marked_receipt(marked_receipt_event_id: String) -> void:
	if marked_receipt_event_id.is_empty():
		return
	if str(record_objects.get("store_queue_mark", "")) != "player_waiting":
		return
	var result := _apply_role_agent_action(
		"wary.waiting_customer.note_wary",
		"NPC_Waiting_Customer",
		"waiting_customer",
		"note_wary",
		"store_queue_mark",
		"store_same_order_queue_wary",
		"A waiting customer sees the marked receipt and slows down without turning it into a formal complaint.",
		marked_receipt_event_id,
		[marked_receipt_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Waiting_Customer", "정리됐어도 방금 표시는 남았죠. 줄은 조금 천천히 갑니다.")
		var event: Dictionary = result.get("event", {})
		_post_public_warning_after_wary(str(event.get("eventId", "")))

func _post_public_warning_after_wary(wary_event_id: String) -> void:
	if wary_event_id.is_empty():
		return
	if str(record_objects.get("park_notice_board", "")) != "clear":
		return
	var result := _apply_role_agent_action(
		"wary.park_witness.post_warning",
		"NPC_Park_Witness",
		"park_witness",
		"post_warning",
		"park_notice_board",
		"park_public_warning",
		"A Park witness sees the wary queue note and posts a public warning instead of turning it into a formal report.",
		wary_event_id,
		[wary_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Park_Witness", "줄이 늦춰진 건 남겨둘게요. 아직 보고는 아니고, 조심하라는 표시입니다.")
		_set_actor_reaction_state("NPC_Park_Witness", "warned", 35)
		var event: Dictionary = result.get("event", {})
		_keep_distance_after_warning(str(event.get("eventId", "")))

func _keep_distance_after_warning(warning_event_id: String) -> void:
	if warning_event_id.is_empty():
		return
	if str(record_objects.get("store_queue_mark", "")) != "delayed":
		return
	var result := _apply_role_agent_action(
		"wary.waiting_customer.keep_distance",
		"NPC_Waiting_Customer",
		"waiting_customer",
		"keep_distance",
		"store_queue_mark",
		"store_same_order_queue_distance",
		"The public warning has lowered local trust enough that the waiting customer keeps distance.",
		warning_event_id,
		[warning_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Waiting_Customer", "공원 게시판에 경고가 붙었으니 조금 떨어져 있을게요. 보고까지는 아니지만 가까이 서지는 않겠습니다.")
		_defer_studio_review_after_warning(warning_event_id)

func _defer_studio_review_after_warning(warning_event_id: String) -> void:
	if warning_event_id.is_empty():
		return
	if str(record_objects.get("studio_review_queue", "")) != "open":
		return
	var result := _apply_role_agent_action(
		"wary.studio_pm.defer_review",
		"NPC_Studio_PM",
		"studio_pm",
		"defer_review",
		"studio_review_queue",
		"studio_public_review_deferred",
		"The Studio PM reads the public warning and keeps the review queue on hold instead of opening an opportunity.",
		warning_event_id,
		[warning_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Studio_PM", "공개 경고가 붙었네요. 리뷰 줄은 오늘 보류하겠습니다.")
		_set_actor_reaction_state("NPC_Studio_PM", "deferred", 25)

func debug_agent_action_log() -> Array:
	return agent_action_log.duplicate(true)

func _recent_civic_ledger_events(limit: int) -> Array[Dictionary]:
	var events: Array[Dictionary] = []
	for index in range(civic_ledger.size() - 1, -1, -1):
		var event: Dictionary = civic_ledger[index]
		events.append(event.duplicate(true))
		if events.size() >= limit:
			break
	return events

func _codex_choice_id_available(choice_id: String) -> bool:
	if not conversation_active or _session_locked():
		return false
	for choice in _current_choices():
		if str(choice.get("id", "")) == choice_id:
			return true
	return false

func _codex_small_summary(summary: Dictionary) -> Dictionary:
	return {
		"stage": summary.get("stage", ""),
		"sessionOutcome": summary.get("sessionOutcome", ""),
		"routeOutcome": summary.get("routeOutcome", ""),
		"suspicion": summary.get("suspicion", 0),
		"reportWeight": summary.get("reportWeight", 0),
		"responseHesitationCount": summary.get("responseHesitationCount", 0),
		"lastDialogueChoice": summary.get("lastDialogueChoice", ""),
		"lastReasonCode": summary.get("lastReasonCode", ""),
		"inspectedWorldRecordProp": summary.get("inspectedWorldRecordProp", {}),
		"inspectedNpcState": summary.get("inspectedNpcState", {}),
		"inputLocked": summary.get("inputLocked", false)
	}

func _codex_hud_snapshot() -> Dictionary:
	if _hud != null and _hud.has_method("debug_snapshot"):
		var snapshot: Variant = _hud.call("debug_snapshot")
		if snapshot is Dictionary:
			return snapshot
	return {}

func _social_observation_trace() -> Array[Dictionary]:
	var observations: Array[Dictionary] = []
	for index in range(1, agent_action_log.size()):
		var action: Dictionary = agent_action_log[index]
		if str(action.get("actorRole", "")) == "store_clerk":
			continue
		var observed := _observed_agent_action(action, agent_action_log.slice(0, index))
		if observed.is_empty():
			continue
		var economy: Dictionary = observed.get("economyAfter", {})
		observations.append({
			"observerActorId": str(action.get("actorId", "")),
			"observerRole": str(action.get("actorRole", "")),
			"observedLedgerEventId": str(observed.get("ledgerEventId", "")),
			"observedActorRole": str(observed.get("actorRole", "")),
			"observedAffordance": str(observed.get("affordance", "")),
			"observedObjectId": str(observed.get("objectId", "")),
			"economyPressure": {
				"localTrust": int(economy.get("localTrust", 0)),
				"recordBurden": int(economy.get("recordBurden", 0)),
				"stationAttention": int(economy.get("stationAttention", 0))
			},
			"resultingStepId": str(action.get("stepId", "")),
			"resultingAffordance": str(action.get("affordance", "")),
			"whyLine": "%s reads %s's %s record before choosing %s." % [
				str(action.get("actorRole", "")),
				str(observed.get("actorRole", "")),
				str(observed.get("affordance", "")),
				str(action.get("affordance", ""))
			]
		})
	return observations

func _observed_agent_action(action: Dictionary, previous_actions: Array) -> Dictionary:
	var cited_ledger_event_id := str(action.get("citedLedgerEventId", ""))
	if not cited_ledger_event_id.is_empty():
		for previous in previous_actions:
			if previous is Dictionary and str(previous.get("ledgerEventId", "")) == cited_ledger_event_id:
				return previous
	for offset in range(previous_actions.size()):
		var previous_index := previous_actions.size() - 1 - offset
		var previous: Variant = previous_actions[previous_index]
		if not previous is Dictionary:
			continue
		var previous_action: Dictionary = previous
		if str(previous_action.get("objectId", "")) == str(action.get("objectId", "")):
			return previous_action
		var previous_record_id := str(previous_action.get("recordId", ""))
		if not previous_record_id.is_empty() and previous_record_id == str(action.get("recordId", "")):
			return previous_action
	return {}

func _apply_role_agent_action(
	step_id: String,
	actor_id: String,
	actor_role: String,
	affordance: String,
	object_id: String,
	record_id: String,
	why_line: String,
	cited_ledger_event_id: String = "",
	known_ledger_event_ids: Array = []
) -> Dictionary:
	_agent_action_sequence += 1
	var available_actions := _available_role_agent_actions(actor_role, known_ledger_event_ids)
	var selected_action_descriptor := _find_available_action_descriptor(
		available_actions,
		affordance,
		object_id,
		cited_ledger_event_id
	)
	var validation := _validate_role_agent_action(
		actor_id,
		actor_role,
		affordance,
		object_id,
		record_id,
		why_line,
		cited_ledger_event_id,
		known_ledger_event_ids
	)
	var trace := {
		"sequence": _agent_action_sequence,
		"stepId": step_id,
		"actorId": actor_id,
		"actorRole": actor_role,
		"perceivedObjectIds": _visible_object_ids(actor_role),
		"affordance": affordance,
		"objectId": object_id,
		"recordId": record_id,
		"citedLedgerEventId": cited_ledger_event_id,
		"availableActions": available_actions,
		"selectedActionDescriptor": selected_action_descriptor,
		"selectionReason": why_line,
		"whyLine": why_line,
		"accepted": bool(validation.get("ok", false)),
		"validation": "accepted" if bool(validation.get("ok", false)) else "rejected"
	}
	if not bool(validation.get("ok", false)):
		trace["reason"] = str(validation.get("reason", "unknown"))
		trace["detail"] = str(validation.get("detail", ""))
		trace["stateBefore"] = str(record_objects.get(object_id, "unknown"))
		agent_action_log.append(trace)
		return {"ok": false, "trace": trace, "reason": trace["reason"], "detail": trace["detail"]}

	var rule: Dictionary = validation.get("rule", {})
	var resolved_record_id := str(validation.get("recordId", ""))
	var event_kind := str(rule.get("eventKind", ""))
	record_objects[object_id] = str(rule.get("toState", record_objects.get(object_id, "")))
	var event := _append_civic_ledger(
		event_kind,
		actor_id,
		actor_role,
		affordance,
		object_id,
		resolved_record_id,
		cited_ledger_event_id,
		why_line
	)
	trace["ledgerEventId"] = str(event.get("eventId", ""))
	trace["ledgerEventKind"] = event_kind
	trace["recordId"] = resolved_record_id
	trace["economyAfter"] = civic_economy.duplicate(true)
	agent_action_log.append(trace)
	return {"ok": true, "trace": trace, "event": event}

func _validate_role_agent_action(
	actor_id: String,
	actor_role: String,
	affordance: String,
	object_id: String,
	record_id: String,
	why_line: String,
	cited_ledger_event_id: String,
	known_ledger_event_ids: Array
) -> Dictionary:
	if str(ACTOR_AGENT_ROLES.get(actor_id, "")) != actor_role:
		return _agent_action_rejection("agent_role_mismatch", "action actor identity does not match actor context")
	if why_line.strip_edges().is_empty():
		return _agent_action_rejection("why_line_required", "accepted environment actions must explain why")
	if not record_objects.has(object_id):
		return _agent_action_rejection("object_unknown", "unknown environment object: %s" % object_id)

	var perceived_object_ids := _visible_object_ids(actor_role)
	if not perceived_object_ids.has(object_id):
		return _agent_action_rejection("object_not_perceived", "%s cannot currently perceive %s" % [actor_role, object_id])

	var object_rules: Dictionary = ENVIRONMENT_ACTION_RULES.get(object_id, {})
	var rule: Dictionary = object_rules.get(affordance, {})
	if rule.is_empty():
		return _agent_action_rejection("affordance_unavailable", "%s is unavailable on %s" % [affordance, object_id])
	var current_state := str(record_objects.get(object_id, ""))
	var from_states: Array = rule.get("fromStates", [])
	if not from_states.has(current_state):
		return _agent_action_rejection("affordance_unavailable", "%s is unavailable on %s while state is %s" % [affordance, object_id, current_state])
	var allowed_roles: Array = rule.get("allowedRoles", [])
	if not allowed_roles.has(actor_role):
		return _agent_action_rejection("role_authority_exceeded", "%s cannot apply %s to %s" % [actor_role, affordance, object_id])
	if not _economy_condition_met(rule):
		return _agent_action_rejection("economy_condition_unmet", _economy_condition_failure(affordance, rule))

	var requires_ledger_event := bool(rule.get("requiresLedgerEvent", false))
	var cited_event := _civic_ledger_event_by_id(cited_ledger_event_id)
	if requires_ledger_event and cited_ledger_event_id.is_empty():
		return _agent_action_rejection("ledger_event_unknown", "%s requires a cited ledger event" % affordance)
	if not cited_ledger_event_id.is_empty() and cited_event.is_empty():
		return _agent_action_rejection("ledger_event_unknown", "unknown ledger event: %s" % cited_ledger_event_id)
	if not cited_ledger_event_id.is_empty() and not known_ledger_event_ids.has(cited_ledger_event_id):
		return _agent_action_rejection("ledger_event_not_known", "%s cannot cite an unobserved ledger event" % actor_role)
	if not cited_event.is_empty() and not _ledger_event_kind_allowed(str(cited_event.get("kind", "")), rule):
		return _agent_action_rejection("ledger_event_kind_unaccepted", "%s cannot cite %s" % [affordance, str(cited_event.get("kind", ""))])
	if bool(rule.get("requiresStoreLedgerEvent", false)) and not _is_store_ledger_event_kind(str(cited_event.get("kind", ""))):
		return _agent_action_rejection("station_citation_requires_store_record", "Station citation must cite a Store ledger event")

	var resolved_record_id := record_id
	if resolved_record_id.is_empty():
		resolved_record_id = _record_id_for_object(object_id)
	if _record_mutation_affordances().has(affordance) and resolved_record_id.strip_edges().is_empty():
		return _agent_action_rejection("invalid_record_mutation", "%s requires a record id" % affordance)

	return {"ok": true, "rule": rule, "recordId": resolved_record_id}

func _agent_action_rejection(reason: String, detail: String) -> Dictionary:
	return {"ok": false, "reason": reason, "detail": detail}

func _visible_object_ids(actor_role: String) -> Array[String]:
	var ids: Array[String] = []
	for object_id in ENVIRONMENT_OBJECT_ORDER:
		var roles: Array = OBJECT_VISIBILITY.get(object_id, [])
		if roles.has(actor_role):
			ids.append(str(object_id))
	return ids

func _available_role_agent_actions(actor_role: String, known_ledger_event_ids: Array = []) -> Array[Dictionary]:
	var actions: Array[Dictionary] = []
	for object_id in ENVIRONMENT_OBJECT_ORDER:
		var roles: Array = OBJECT_VISIBILITY.get(object_id, [])
		if not roles.has(actor_role):
			continue
		if not record_objects.has(object_id):
			continue
		var object_rules: Dictionary = ENVIRONMENT_ACTION_RULES.get(object_id, {})
		if object_rules.is_empty():
			continue
		var current_state := str(record_objects.get(object_id, ""))
		for affordance in ENVIRONMENT_AFFORDANCE_ORDER:
			var rule: Dictionary = object_rules.get(affordance, {})
			if rule.is_empty():
				continue
			var from_states: Array = rule.get("fromStates", [])
			var allowed_roles: Array = rule.get("allowedRoles", [])
			if not from_states.has(current_state) or not allowed_roles.has(actor_role):
				continue
			if not _economy_condition_met(rule):
				continue
			var requires_ledger_event := bool(rule.get("requiresLedgerEvent", false))
			var citable_ledger_event_ids := _citable_ledger_event_ids(known_ledger_event_ids, rule)
			if requires_ledger_event and citable_ledger_event_ids.is_empty():
				continue
			var action := {
				"actionId": "%s.%s" % [str(object_id), str(affordance)],
				"objectId": str(object_id),
				"objectState": current_state,
				"affordance": str(affordance),
				"playerLabel": _action_player_label(str(affordance)),
				"eligibleRoles": allowed_roles.duplicate(true),
				"preconditions": _action_preconditions(str(object_id), current_state, rule),
				"visibleTo": roles.duplicate(true),
				"perceivedAs": _action_perceived_as(str(object_id), str(affordance)),
				"priorityHints": _action_priority_hints(str(affordance), rule),
				"toState": str(rule.get("toState", current_state)),
				"ledgerEventKind": str(rule.get("eventKind", "")),
				"civicEconomyEffects": _civic_economy_effects(str(rule.get("eventKind", ""))),
				"validationRuleId": "same_order.%s.%s" % [str(object_id), str(affordance)],
				"failureReasons": _action_failure_reasons(rule),
				"recordId": _record_id_for_object(str(object_id)),
				"requiresLedgerEvent": requires_ledger_event,
				"requiresStoreLedgerEvent": bool(rule.get("requiresStoreLedgerEvent", false)),
				"citableLedgerEventIds": citable_ledger_event_ids
			}
			actions.append(action)
	return actions

func _find_available_action_descriptor(
	available_actions: Array,
	affordance: String,
	object_id: String,
	cited_ledger_event_id: String
) -> Dictionary:
	for available in available_actions:
		if not available is Dictionary:
			continue
		if str(available.get("objectId", "")) != object_id:
			continue
		if str(available.get("affordance", "")) != affordance:
			continue
		if bool(available.get("requiresLedgerEvent", false)):
			if cited_ledger_event_id.is_empty() or not available.get("citableLedgerEventIds", []).has(cited_ledger_event_id):
				continue
		return available.duplicate(true)
	return {}

func _action_preconditions(object_id: String, object_state: String, rule: Dictionary) -> Array[String]:
	var preconditions: Array[String] = [
		"object_state:%s" % object_state,
		"role_allowed:%s" % "|".join(PackedStringArray(rule.get("allowedRoles", [])))
	]
	if bool(rule.get("requiresLedgerEvent", false)):
		preconditions.append("known_ledger_event_required")
	if bool(rule.get("requiresStoreLedgerEvent", false)):
		preconditions.append("known_store_ledger_event_required")
	var required_event_kinds: Array = rule.get("requiresLedgerEventKinds", [])
	if not required_event_kinds.is_empty():
		preconditions.append("ledger_event_kind:%s" % "|".join(PackedStringArray(required_event_kinds)))
	if rule.has("minimumLocalTrust"):
		preconditions.append("localTrust>=%d" % int(rule.get("minimumLocalTrust", 0)))
	if rule.has("maximumLocalTrust"):
		preconditions.append("localTrust<=%d" % int(rule.get("maximumLocalTrust", 0)))
	if not _record_id_for_object(object_id).is_empty():
		preconditions.append("record_id:%s" % _record_id_for_object(object_id))
	return preconditions

func _action_failure_reasons(rule: Dictionary) -> Array[String]:
	var reasons: Array[String] = [
		"object_not_perceived",
		"affordance_unavailable",
		"role_authority_exceeded",
		"why_line_required"
	]
	if bool(rule.get("requiresLedgerEvent", false)):
		reasons.append("ledger_event_unknown")
		reasons.append("ledger_event_not_known")
	if bool(rule.get("requiresStoreLedgerEvent", false)):
		reasons.append("station_citation_requires_store_record")
	var required_event_kinds: Array = rule.get("requiresLedgerEventKinds", [])
	if not required_event_kinds.is_empty():
		reasons.append("ledger_event_kind_unaccepted")
	if rule.has("minimumLocalTrust"):
		reasons.append("economy_condition_unmet")
	if rule.has("maximumLocalTrust"):
		reasons.append("economy_condition_unmet")
	return reasons

func _civic_economy_effects(event_kind: String) -> Array[String]:
	var effects: Array[String] = []
	var delta := _civic_economy_delta(event_kind)
	for key in delta.keys():
		var value := int(delta.get(key, 0))
		var prefix := "+" if value >= 0 else ""
		effects.append("%s:%s%d" % [str(key), prefix, value])
	return effects

func _action_priority_hints(affordance: String, rule: Dictionary) -> Array[String]:
	var hints: Array[String] = []
	var delta := _civic_economy_delta(str(rule.get("eventKind", "")))
	for key in delta.keys():
		hints.append("economy:%s" % str(key))
	if bool(rule.get("requiresStoreLedgerEvent", false)):
		hints.append("requires:store_record_citation")
	if affordance == "complain_delay":
		hints.append("pressure:queue_delay")
	if affordance == "accept_routine":
		hints.append("pressure:routine_kept")
	if affordance == "note_wary":
		hints.append("pressure:wary_queue")
	if affordance == "accept_repair":
		hints.append("pressure:repair_accepted")
	if affordance == "pause_service":
		hints.append("pressure:service_paused")
	if affordance == "leave_queue":
		hints.append("pressure:queue_left")
	if affordance == "refuse_contact":
		hints.append("pressure:authority_seen")
	if affordance == "post_rumor":
		hints.append("pressure:public_talk")
	if affordance == "vouch_routine":
		hints.append("pressure:routine_vouched_publicly")
	if affordance == "post_warning":
		hints.append("pressure:public_warning")
	if affordance == "post_repair_notice":
		hints.append("pressure:repair_seen_publicly")
	if affordance == "invite_review":
		hints.append("pressure:public_trust_opens_review")
	if affordance == "offer_conditional_review":
		hints.append("pressure:public_repair_keeps_review_conditional")
	if affordance == "defer_review":
		hints.append("pressure:public_warning_blocks_review")
	if affordance == "block_review":
		hints.append("pressure:station_citation_blocks_review")
	if affordance == "share_local_tip":
		hints.append("pressure:local_trust_unlocks_help")
	if affordance == "keep_distance":
		hints.append("pressure:low_trust_creates_distance")
	return hints

func _action_perceived_as(object_id: String, affordance: String) -> String:
	match affordance:
		"create_receipt":
			return "normal sale record"
		"mark_receipt":
			return "marked receipt"
		"offer_correction", "attach_correction":
			return "local correction path"
		"accept_repair":
			return "public repair acceptance"
		"note_wary":
			return "local wary queue note"
		"pause_service":
			return "paused local service"
		"leave_queue":
			return "queue leaves paused service"
		"refuse_contact":
			return "queue refuses contact after citation"
		"share_local_tip":
			return "local trust opens a helpful tip"
		"keep_distance":
			return "public warning makes the queue keep distance"
		"place_note":
			return "Store report note"
		"forward_report":
			return "forwarded Store report"
		"cite_record":
			return "Station dossier citation"
		"complain_delay":
			return "public queue pressure"
		"accept_routine":
			return "routine queue acceptance"
		"post_rumor":
			return "public notice rumor"
		"vouch_routine":
			return "public routine vouch"
		"post_warning":
			return "public warning notice"
		"post_repair_notice":
			return "public repair notice"
		"invite_review":
			return "public trust opens another local review"
		"offer_conditional_review":
			return "public repair keeps another local review conditional"
		"defer_review":
			return "public warning defers another local review"
		"block_review":
			return "formal citation blocks another local review"
	return "%s %s" % [object_id, affordance]

func _action_player_label(affordance: String) -> String:
	var parts := affordance.split("_")
	for index in range(parts.size()):
		var part := str(parts[index])
		if part.is_empty():
			continue
		parts[index] = part.substr(0, 1).to_upper() + part.substr(1)
	return " ".join(PackedStringArray(parts))

func _citable_ledger_event_ids(known_ledger_event_ids: Array, rule: Dictionary) -> Array[String]:
	var ids: Array[String] = []
	for event in civic_ledger:
		if not event is Dictionary:
			continue
		var event_id := str(event.get("eventId", ""))
		if event_id.is_empty() or not known_ledger_event_ids.has(event_id):
			continue
		var event_kind := str(event.get("kind", ""))
		if bool(rule.get("requiresStoreLedgerEvent", false)) and not _is_store_ledger_event_kind(event_kind):
			continue
		if not _ledger_event_kind_allowed(event_kind, rule):
			continue
		ids.append(event_id)
	return ids

func _ledger_event_kind_allowed(event_kind: String, rule: Dictionary) -> bool:
	var required_event_kinds: Array = rule.get("requiresLedgerEventKinds", [])
	return required_event_kinds.is_empty() or required_event_kinds.has(event_kind)

func _economy_condition_met(rule: Dictionary) -> bool:
	if rule.has("minimumLocalTrust") and int(civic_economy.get("localTrust", 0)) < int(rule.get("minimumLocalTrust", 0)):
		return false
	if rule.has("maximumLocalTrust") and int(civic_economy.get("localTrust", 0)) > int(rule.get("maximumLocalTrust", 0)):
		return false
	return true

func _economy_condition_failure(affordance: String, rule: Dictionary) -> String:
	if rule.has("minimumLocalTrust"):
		return "%s requires localTrust >= %d" % [affordance, int(rule.get("minimumLocalTrust", 0))]
	if rule.has("maximumLocalTrust"):
		return "%s requires localTrust <= %d" % [affordance, int(rule.get("maximumLocalTrust", 0))]
	return "%s economy condition is unmet" % affordance

func _record_mutation_affordances() -> Array[String]:
	return [
		"create_receipt",
		"mark_receipt",
		"attach_correction",
		"accept_routine",
		"note_wary",
		"accept_repair",
		"complain_delay",
		"leave_queue",
		"refuse_contact",
		"share_local_tip",
		"keep_distance",
		"post_rumor",
		"vouch_routine",
		"post_warning",
		"post_repair_notice",
		"invite_review",
		"offer_conditional_review",
		"defer_review",
		"block_review",
		"place_note",
		"forward_report",
		"cite_record"
	]

func _record_id_for_object(object_id: String) -> String:
	match object_id:
		"store_queue_mark":
			return "store_same_order_queue_state"
		"receipt_tray":
			return "store_same_order_receipt"
		"correction_slip":
			return "store_same_order_correction"
		"report_tray":
			return "store_same_order_clerk_statement"
		"park_notice_board":
			return "park_public_rumor"
		"studio_review_queue":
			return "studio_public_review_invite"
		"station_dossier":
			return "station_same_order_dossier"
	return ""

func _civic_ledger_event_by_id(event_id: String) -> Dictionary:
	if event_id.is_empty():
		return {}
	for event in civic_ledger:
		if str(event.get("eventId", "")) == event_id:
			return event
	return {}

func _is_store_ledger_event_kind(event_kind: String) -> bool:
	return STORE_LEDGER_EVENT_KINDS.has(event_kind)

func _append_civic_ledger(
	event_kind: String,
	actor_id: String,
	actor_role: String,
	affordance: String,
	object_id: String,
	record_id: String,
	cited_ledger_event_id: String,
	why_line: String
) -> Dictionary:
	_civic_ledger_sequence += 1
	var economy_delta := _civic_economy_delta(event_kind)
	_apply_civic_economy_delta(economy_delta)
	var event := {
		"eventId": "civic-ledger-%d" % _civic_ledger_sequence,
		"kind": event_kind,
		"actorId": actor_id,
		"actorRole": actor_role,
		"affordance": affordance,
		"objectId": object_id,
		"recordId": record_id,
		"economyDelta": economy_delta,
		"validation": "accepted",
		"whyLine": why_line
	}
	if not cited_ledger_event_id.is_empty():
		event["citedLedgerEventId"] = cited_ledger_event_id
	civic_ledger.append(event)
	return event

func _civic_economy_delta(event_kind: String) -> Dictionary:
	match event_kind:
		"store_sale_normal":
			return {"accountCredit": -1, "localTrust": 5}
		"queue_routine_kept":
			return {"localTrust": 2}
		"queue_wary_noted":
			return {"localTrust": -2, "recordBurden": 5}
		"store_receipt_marked":
			return {"localTrust": -5, "recordBurden": 15}
		"correction_offered":
			return {"recordBurden": 5}
		"store_sale_corrected":
			return {"accountCredit": -1, "localTrust": -5, "recordBurden": 15, "stationAttention": 5}
		"queue_repair_accepted":
			return {"localTrust": 5, "recordBurden": -5}
		"queue_delay_noted":
			return {"recordBurden": 5}
		"queue_left":
			return {"localTrust": -3, "recordBurden": 5}
		"queue_contact_refused":
			return {"localTrust": -8, "recordBurden": 5}
		"local_tip_shared":
			return {"localTrust": 1, "recordBurden": -1}
		"queue_distance_kept":
			return {"localTrust": -1, "recordBurden": 2}
		"public_rumor_posted":
			return {"recordBurden": 5}
		"public_routine_vouched":
			return {"localTrust": 1}
		"public_warning_posted":
			return {"localTrust": -1, "recordBurden": 3}
		"public_repair_noted":
			return {"localTrust": 3, "recordBurden": -5}
		"studio_review_invited":
			return {"localTrust": 1, "recordBurden": -1}
		"studio_review_conditioned":
			return {"localTrust": 1, "recordBurden": -2}
		"studio_review_deferred":
			return {"localTrust": -1, "recordBurden": 1}
		"studio_review_blocked":
			return {"localTrust": -2, "recordBurden": 3}
		"store_exception_reported":
			return {"localTrust": -20, "recordBurden": 35, "stationAttention": 30}
		"store_report_escalated":
			return {"localTrust": -20, "recordBurden": 25, "stationAttention": 40}
		"service_paused":
			return {"recordBurden": 5}
	return {}

func _apply_civic_economy_delta(delta: Dictionary) -> void:
	civic_economy["accountCredit"] = clampi(int(civic_economy.get("accountCredit", 0)) + int(delta.get("accountCredit", 0)), 0, 999)
	civic_economy["localTrust"] = clampi(int(civic_economy.get("localTrust", 0)) + int(delta.get("localTrust", 0)), 0, 100)
	civic_economy["recordBurden"] = clampi(int(civic_economy.get("recordBurden", 0)) + int(delta.get("recordBurden", 0)), 0, 100)
	civic_economy["stationAttention"] = clampi(int(civic_economy.get("stationAttention", 0)) + int(delta.get("stationAttention", 0)), 0, 100)

func debug_record_prop_snapshot() -> Dictionary:
	_refresh_world_record_props()
	return _world_record_prop_snapshot()

func _inspect_world_record_prop(object_id: String) -> Dictionary:
	_refresh_world_record_props()
	var snapshot := _world_record_prop_snapshot()
	if not snapshot.has(object_id):
		return {"ok": false, "reason": "record_prop_unknown", "objectId": object_id}

	var prop: Dictionary = snapshot.get(object_id, {})
	var state := str(prop.get("state", _world_record_prop_state(object_id)))
	var title := _world_record_prop_title(object_id)
	var body := _world_record_prop_inspection_body(object_id, state)
	var reader_role_labels := _world_record_prop_reader_role_labels(object_id)
	var possible_affordance_labels := _world_record_prop_affordance_labels(object_id)
	var current_affordance_labels := _world_record_prop_current_affordance_labels(object_id)
	var recent_ledger_events := _world_record_prop_recent_ledger_events(object_id, 3)
	var social_observation_labels := _world_record_prop_social_observation_labels(object_id, 6)
	var social_lines := _world_record_prop_social_lines(
		reader_role_labels,
		possible_affordance_labels,
		current_affordance_labels,
		recent_ledger_events,
		social_observation_labels
	)
	if not social_lines.is_empty():
		body = "%s\n%s" % [body, "\n".join(social_lines)]
	inspected_world_record_prop = {
		"objectId": object_id,
		"title": title,
		"state": state,
		"stateLabel": _record_state_value(state),
		"label": str(prop.get("label", "")),
		"body": body,
		"readerRoleLabels": reader_role_labels,
		"possibleAffordanceLabels": possible_affordance_labels,
		"currentAffordanceLabels": current_affordance_labels,
		"recentLedgerEvents": recent_ledger_events,
		"socialObservationLabels": social_observation_labels
	}
	inspected_world_record_history.append(inspected_world_record_prop.duplicate(true))
	_set_notice(title, body)
	_record_event(
		"observation",
		"world_record_prop_inspected",
		"Inspected world record prop %s in state %s." % [object_id, state],
		{
			"objectId": object_id,
			"state": state,
			"stateLabel": _record_state_value(state),
			"uiSummaryKey": "event.world_record_prop_inspected",
			"uiSummaryArgs": {"object": title, "state": _record_state_value(state)}
		}
	)
	return {"ok": true, "inspectedWorldRecordProp": inspected_world_record_prop.duplicate(true)}

func _inspect_npc(npc_id: String) -> Dictionary:
	var states := _visible_npc_states()
	if not states.has(npc_id):
		return {"ok": false, "reason": "npc_unknown", "npcId": npc_id}

	var snapshot: Dictionary = states.get(npc_id, {})
	var display_name := str(snapshot.get("displayName", npc_id))
	var role := str(snapshot.get("role", ""))
	var reaction_text := str(snapshot.get("reactionText", "")).strip_edges()
	var pressure_text := str(snapshot.get("pressureText", "")).strip_edges()
	var spoken_line := str(snapshot.get("spokenLine", "")).strip_edges()
	var state := str(snapshot.get("state", "normal"))
	var title := "%s / %s" % [display_name, role]
	var body_lines := PackedStringArray()
	body_lines.append("현재 반응: %s" % (reaction_text if not reaction_text.is_empty() else _record_state_value(state)))
	if not spoken_line.is_empty():
		body_lines.append("들은 말: \"%s\"" % spoken_line)
	elif not pressure_text.is_empty():
		body_lines.append("말/태도: %s" % pressure_text)
	var basis_action := _latest_accepted_action_for_actor(npc_id)
	var basis_event_id := ""
	var basis_affordance := ""
	var basis_affordance_label := ""
	var cited_event_id := ""
	var basis_object_id := ""
	var basis_object_label := ""
	var basis_condition_labels := PackedStringArray()
	var basis_economy_effect_labels := PackedStringArray()
	if not basis_action.is_empty():
		basis_event_id = str(basis_action.get("ledgerEventId", ""))
		basis_affordance = str(basis_action.get("affordance", ""))
		basis_affordance_label = _affordance_label(basis_affordance)
		var basis_event_label := _civic_ledger_event_compact_label(basis_event_id)
		if not basis_event_label.is_empty():
			body_lines.append("근거 행동: %s" % basis_event_label)
		elif not basis_event_id.is_empty() or not basis_affordance_label.is_empty():
			body_lines.append("근거 행동: %s / %s" % [basis_event_id, basis_affordance_label])
		cited_event_id = str(basis_action.get("citedLedgerEventId", ""))
		if not cited_event_id.is_empty():
			var cited_event_label := _civic_ledger_event_compact_label(cited_event_id)
			body_lines.append("읽은 기록: %s" % (cited_event_label if not cited_event_label.is_empty() else cited_event_id))
		basis_object_id = str(basis_action.get("objectId", ""))
		if not basis_object_id.is_empty():
			basis_object_label = _world_record_prop_title(basis_object_id)
			body_lines.append("대상 기록물: %s" % basis_object_label)
		var selected_descriptor := _selected_action_descriptor_for_inspection(basis_action)
		if not selected_descriptor.is_empty():
			basis_condition_labels = _selected_action_condition_labels(selected_descriptor, cited_event_id)
			basis_economy_effect_labels = _selected_action_economy_effect_labels(selected_descriptor)
			if not basis_condition_labels.is_empty():
				body_lines.append("가능 조건: %s" % ", ".join(basis_condition_labels))
			if not basis_economy_effect_labels.is_empty():
				body_lines.append("값 변화: %s" % ", ".join(basis_economy_effect_labels))
	body_lines.append("이 반응은 NPC가 읽은 기록, 공개 단서, 또는 인용 결과가 사회적 행동으로 바뀐 상태입니다.")
	inspected_npc_state = snapshot.duplicate(true)
	inspected_npc_state["spokenLine"] = spoken_line
	if not basis_action.is_empty():
		inspected_npc_state["basisAction"] = basis_action.duplicate(true)
		inspected_npc_state["basisLedgerEventId"] = basis_event_id
		inspected_npc_state["basisLedgerEventLabel"] = _civic_ledger_event_compact_label(basis_event_id)
		inspected_npc_state["basisAffordance"] = basis_affordance
		inspected_npc_state["basisAffordanceLabel"] = basis_affordance_label
		inspected_npc_state["basisObjectId"] = basis_object_id
		inspected_npc_state["basisObjectLabel"] = basis_object_label
		inspected_npc_state["citedLedgerEventId"] = cited_event_id
		inspected_npc_state["citedLedgerEventLabel"] = _civic_ledger_event_compact_label(cited_event_id)
		inspected_npc_state["basisConditionLabels"] = basis_condition_labels
		inspected_npc_state["basisEconomyEffectLabels"] = basis_economy_effect_labels
	inspected_npc_state["body"] = "\n".join(body_lines)
	inspected_npc_history.append(inspected_npc_state.duplicate(true))
	_set_notice(title, str(inspected_npc_state.get("body", "")))
	_record_event(
		"observation",
		"npc_reaction_inspected",
		"Inspected NPC reaction %s in state %s." % [npc_id, state],
		{
			"npcId": npc_id,
			"state": state,
			"reactionText": reaction_text,
			"uiSummaryKey": "event.npc_reaction_inspected",
			"uiSummaryArgs": {"npc": display_name, "state": reaction_text if not reaction_text.is_empty() else state}
		}
	)
	return {"ok": true, "inspectedNpcState": inspected_npc_state.duplicate(true)}

func _latest_accepted_action_for_actor(actor_id: String) -> Dictionary:
	for index in range(agent_action_log.size()):
		var reverse_index := agent_action_log.size() - 1 - index
		var action: Dictionary = agent_action_log[reverse_index]
		if str(action.get("actorId", "")) == actor_id and bool(action.get("accepted", false)):
			return action.duplicate(true)
	return {}

func _civic_ledger_event_compact_label(event_id: String) -> String:
	var event := _civic_ledger_event_by_id(event_id)
	if event.is_empty():
		return ""
	var actor_label := _actor_role_label(str(event.get("actorRole", "")))
	var affordance_label := _affordance_label(str(event.get("affordance", "")))
	if actor_label.is_empty() and affordance_label.is_empty():
		return event_id
	if actor_label.is_empty():
		return "%s / %s" % [event_id, affordance_label]
	if affordance_label.is_empty():
		return "%s / %s" % [event_id, actor_label]
	return "%s / %s -> %s" % [event_id, actor_label, affordance_label]

func _selected_action_descriptor_for_inspection(action: Dictionary) -> Dictionary:
	var descriptor: Dictionary = action.get("selectedActionDescriptor", {})
	if not descriptor.is_empty():
		return descriptor.duplicate(true)
	var available_actions: Array = action.get("availableActions", [])
	for available in available_actions:
		if not available is Dictionary:
			continue
		var candidate: Dictionary = available
		if str(candidate.get("objectId", "")) == str(action.get("objectId", "")) \
				and str(candidate.get("affordance", "")) == str(action.get("affordance", "")):
			return candidate.duplicate(true)
	return {}

func _selected_action_condition_labels(descriptor: Dictionary, cited_event_id: String) -> PackedStringArray:
	var labels := PackedStringArray()
	var object_id := str(descriptor.get("objectId", ""))
	var object_state := str(descriptor.get("objectState", ""))
	if not object_id.is_empty() and not object_state.is_empty():
		labels.append("%s=%s" % [_world_record_prop_title(object_id), _record_state_value(object_state)])
	if bool(descriptor.get("requiresLedgerEvent", false)):
		if not cited_event_id.is_empty():
			labels.append("인용 장부 %s" % cited_event_id)
		else:
			labels.append("알려진 장부 필요")
	var preconditions: Array = descriptor.get("preconditions", [])
	for precondition_value in preconditions:
		var precondition := str(precondition_value)
		if precondition.begins_with("ledger_event_kind:"):
			labels.append("필요 기록 %s" % _ledger_event_kind_condition_label(precondition.substr("ledger_event_kind:".length())))
		elif precondition == "known_store_ledger_event_required":
			labels.append("상점 기록 필요")
		elif precondition.begins_with("localTrust>="):
			labels.append("신뢰 %s 이상" % precondition.substr("localTrust>=".length()))
		elif precondition.begins_with("localTrust<="):
			labels.append("신뢰 %s 이하" % precondition.substr("localTrust<=".length()))
	return labels

func _ledger_event_kind_condition_label(raw_kinds: String) -> String:
	var labels := PackedStringArray()
	for kind_value in raw_kinds.split("|", false):
		labels.append(_civic_ledger_kind_label(str(kind_value)))
	return "|".join(labels)

func _selected_action_economy_effect_labels(descriptor: Dictionary) -> PackedStringArray:
	var labels := PackedStringArray()
	var effects: Array = descriptor.get("civicEconomyEffects", [])
	for effect_value in effects:
		var parts := str(effect_value).split(":", false, 1)
		if parts.size() != 2:
			continue
		labels.append("%s%s" % [_economy_value_label(str(parts[0])), str(parts[1])])
	return labels

func _refresh_world_record_props() -> void:
	for prop_value in _local_group_nodes(&"operation_record_props"):
		var prop_node := prop_value as Node3D
		if prop_node == null:
			continue
		var object_id := str(prop_node.get_meta("record_object_id", ""))
		var state := _world_record_prop_state(object_id)
		var label_text := _world_record_prop_label(object_id, state)
		prop_node.set_meta("record_state", state)
		prop_node.set_meta("record_label", label_text)
		var body := prop_node.get_node_or_null("StateBody") as MeshInstance3D
		if body != null:
			body.material_override = _world_record_prop_material(object_id, state)
		var strip := prop_node.get_node_or_null("StateStrip") as MeshInstance3D
		if strip != null:
			strip.material_override = _world_record_prop_material(object_id, state)
		var label := prop_node.get_node_or_null("StateLabel") as Label3D
		if label != null:
			label.text = label_text

func _world_record_prop_snapshot() -> Dictionary:
	var snapshot := {}
	for prop_value in _local_group_nodes(&"operation_record_props"):
		var prop_node := prop_value as Node3D
		if prop_node == null:
			continue
		var object_id := str(prop_node.get_meta("record_object_id", ""))
		if object_id.is_empty():
			continue
		var label := prop_node.get_node_or_null("StateLabel") as Label3D
		var body := prop_node.get_node_or_null("StateBody") as MeshInstance3D
		snapshot[object_id] = {
			"state": str(prop_node.get_meta("record_state", _world_record_prop_state(object_id))),
			"label": label.text if label != null else str(prop_node.get_meta("record_label", "")),
			"visible": prop_node.visible,
			"hasBody": body != null
		}
	return snapshot

func _world_record_prop_state(object_id: String) -> String:
	if object_id == "civic_economy_panel":
		if int(civic_economy.get("stationAttention", 0)) >= 70:
			return "attention"
		if int(civic_economy.get("recordBurden", 0)) >= 50:
			return "burden"
		if int(civic_economy.get("localTrust", 50)) < 50:
			return "trust_low"
		return "stable"
	return str(record_objects.get(object_id, "unknown"))

func _world_record_prop_label(object_id: String, state: String) -> String:
	if object_id == "civic_economy_panel":
		if _current_locale() == "en":
			return "CIVIC ECONOMY\ncredit %d | trust %d | burden %d | attention %d" % [
				int(civic_economy.get("accountCredit", 3)),
				int(civic_economy.get("localTrust", 50)),
				int(civic_economy.get("recordBurden", 0)),
				int(civic_economy.get("stationAttention", 0))
			]
		return "시민 경제\n잔액 %d | 신뢰 %d | 부담 %d | 주목 %d" % [
			int(civic_economy.get("accountCredit", 3)),
			int(civic_economy.get("localTrust", 50)),
			int(civic_economy.get("recordBurden", 0)),
			int(civic_economy.get("stationAttention", 0))
		]
	if object_id == "civic_ledger":
		var ledger_count := civic_ledger.size()
		var latest_entry := _latest_civic_ledger_label()
		if _current_locale() == "en":
			return "CIVIC LEDGER %d\n%s" % [ledger_count, latest_entry]
		return "시민 장부 %d건\n%s" % [ledger_count, latest_entry]
	var compact_label := _compact_world_record_prop_label(object_id, state)
	if not compact_label.is_empty():
		return compact_label
	return "%s\n%s" % [_world_record_prop_title(object_id), _record_state_value(state)]

func _world_record_prop_inspection_body(object_id: String, state: String) -> String:
	if object_id == "usual_order_cue":
		match state:
			"read":
				return "카운터 옆 단골 주문 단서입니다. 평소에는 '표식 하나, 같은 봉투'가 정상 루틴이며, 점원과 대기 손님은 플레이어의 말이 이 기대와 맞는지 비교할 수 있습니다."
			"cited":
				return "평소 주문 단서가 인용되었습니다. 점원은 이 단서를 근거로 플레이어의 답이 지역 루틴 안에 머물렀다고 보고 정상 영수증을 닫았습니다."
		return "평소 주문 단서입니다. 이 기록은 플레이어가 대화 전에 읽을 수 있는 정상 절차이며, 어긋난 말은 다른 기록으로 바뀔 수 있습니다."
	if object_id == "park_notice_board":
		match state:
			"vouched":
				return "공개 확인이 붙어 있습니다. 대기 손님은 이 확인을 읽고 플레이어에게 로컬 팁을 공유했습니다."
			"warned":
				return "공개 경고가 붙어 있습니다. 대기 손님은 이 경고를 읽고 플레이어와 거리를 두었습니다."
			"repaired":
				return "공개 수습 게시가 붙어 있습니다. 공원 목격자는 정정표를 읽고 이 어긋남을 소문이 아니라 수습된 기록으로 남겼습니다."
			"rumored":
				return "소문이 붙어 있습니다. 이 공개 기록은 상점 안의 보고와 함께 더 큰 절차로 이어질 수 있습니다."
			"clear":
				return "아직 공개 기록이 없습니다. 누군가의 말이나 정정 기록이 여기로 옮겨오면 다른 NPC가 읽을 수 있습니다."
	if object_id == "studio_review_queue":
		match state:
			"invited":
				return "스튜디오 리뷰 줄이 초대 상태입니다. 스튜디오 PM은 공원 게시판의 공개 확인을 읽고 플레이어에게 작은 기회를 열어뒀습니다."
			"conditional":
				return "스튜디오 리뷰 줄이 조건부 상태입니다. 스튜디오 PM은 공원 게시판의 공개 수습 기록을 읽고 기회를 완전히 닫지 않되 다음 기록을 더 보겠다고 남겼습니다."
			"deferred":
				return "스튜디오 리뷰 줄이 보류 상태입니다. 스튜디오 PM은 공원 게시판의 공개 경고를 읽고 작은 기회를 닫아뒀습니다."
			"blocked":
				return "스튜디오 리뷰 줄이 차단 상태입니다. 스튜디오 PM은 스테이션 인용 기록을 보고 이 기회를 오늘 닫아뒀습니다."
			"open":
				return "스튜디오 리뷰 줄은 아직 열려만 있습니다. 공개 확인 같은 사회 기록이 들어오면 다른 장소의 역할도 움직일 수 있습니다."
	if object_id == "store_queue_mark":
		match state:
			"helped":
				return "대기 표식이 도움 상태입니다. 누군가가 공개 확인을 읽고 플레이어에게 작은 도움을 줬습니다."
			"distanced":
				return "대기 표식이 거리두기 상태입니다. 공개 경고와 낮은 신뢰가 NPC의 접촉 방식을 바꿨습니다."
			"refused":
				return "대기 표식이 접촉 거부 상태입니다. 스테이션 인용을 본 NPC가 플레이어와 말 섞기를 거부했습니다."
			"empty":
				return "대기줄이 비었습니다. 보고 부담 때문에 카운터가 멈추자 대기 손님이 빠져나갔습니다."
	if object_id == "civic_economy_panel":
		if _current_locale() == "en":
			return "Current tiny social values: credit %d, trust %d, burden %d, attention %d. These values only exist to change one visible NPC choice; the recent ledger below shows which role action moved them." % [
				int(civic_economy.get("accountCredit", 3)),
				int(civic_economy.get("localTrust", 50)),
				int(civic_economy.get("recordBurden", 0)),
				int(civic_economy.get("stationAttention", 0))
			]
		return "현재 작은 사회 값입니다. 잔액 %d, 신뢰 %d, 부담 %d, 주목 %d. 이 값은 한 NPC의 다음 선택을 바꿀 때만 쓰이며, 아래 최근 장부가 어떤 역할 행동이 값을 움직였는지 보여줍니다." % [
			int(civic_economy.get("accountCredit", 3)),
			int(civic_economy.get("localTrust", 50)),
			int(civic_economy.get("recordBurden", 0)),
			int(civic_economy.get("stationAttention", 0))
		]
	if object_id == "civic_ledger":
		return "시민 장부는 누가 어떤 기록을 만들었고 무엇을 인용했는지 보여줍니다. NPC 행동은 이 장부를 근거로 이어지며, 아래 사회 연쇄가 누가 누구의 기록을 읽고 다음 행동을 골랐는지 정리합니다."
	return "%s 상태입니다. 이 기록은 NPC가 볼 수 있는 환경 단서이며, 다음 역할 행동의 근거가 될 수 있습니다." % _record_state_value(state)

func _world_record_prop_social_lines(
	reader_role_labels: Array[String],
	possible_affordance_labels: Array[String],
	current_affordance_labels: Array[String],
	recent_ledger_events: Array[Dictionary],
	social_observation_labels: Array[String]
) -> PackedStringArray:
	var lines := PackedStringArray()
	if not reader_role_labels.is_empty():
		lines.append("읽는 역할: %s" % ", ".join(reader_role_labels))
	if not possible_affordance_labels.is_empty():
		lines.append("행동 가능성: %s" % ", ".join(possible_affordance_labels))
		if current_affordance_labels.is_empty():
			lines.append("현재 열린 행동: 없음")
		else:
			lines.append("현재 열린 행동: %s" % ", ".join(current_affordance_labels))
	if not recent_ledger_events.is_empty():
		var compact_events := PackedStringArray()
		for event in recent_ledger_events:
			var event_id := str(event.get("eventId", ""))
			var kind_label := str(event.get("kindLabel", ""))
			var actor_label := str(event.get("actorRoleLabel", ""))
			var affordance_label := str(event.get("affordanceLabel", ""))
			var cited_id := str(event.get("citedLedgerEventId", ""))
			var compact := "%s %s / %s -> %s" % [event_id, kind_label, actor_label, affordance_label]
			if not cited_id.is_empty():
				compact = "%s / 인용 %s" % [compact, cited_id]
			var economy_delta_label := str(event.get("economyDeltaLabel", ""))
			if not economy_delta_label.is_empty():
				compact = "%s / 변화 %s" % [compact, economy_delta_label]
			compact_events.append(compact)
		lines.append("최근 장부: %s" % " | ".join(compact_events))
	if not social_observation_labels.is_empty():
		lines.append("사회 연쇄: %s" % " | ".join(social_observation_labels))
	return lines

func _world_record_prop_reader_role_labels(object_id: String) -> Array[String]:
	var labels: Array[String] = []
	var roles: Array = OBJECT_VISIBILITY.get(object_id, [])
	for role in roles:
		labels.append(_actor_role_label(str(role)))
	return labels

func _world_record_prop_affordance_labels(object_id: String) -> Array[String]:
	var labels: Array[String] = []
	var rules: Dictionary = ENVIRONMENT_ACTION_RULES.get(object_id, {})
	for affordance in ENVIRONMENT_AFFORDANCE_ORDER:
		if not rules.has(affordance):
			continue
		var rule: Dictionary = rules.get(affordance, {})
		var role_labels := PackedStringArray()
		var roles: Array = rule.get("allowedRoles", [])
		for role in roles:
			role_labels.append(_actor_role_label(str(role)))
		if role_labels.is_empty():
			labels.append(_affordance_label(affordance))
		else:
			labels.append("%s(%s)" % [_affordance_label(affordance), ", ".join(role_labels)])
	return labels

func _world_record_prop_current_affordance_labels(object_id: String) -> Array[String]:
	var labels: Array[String] = []
	var seen := {}
	var roles: Array = OBJECT_VISIBILITY.get(object_id, [])
	var known_ledger_event_ids := _all_civic_ledger_event_ids()
	for role in roles:
		for action in _available_role_agent_actions(str(role), known_ledger_event_ids):
			if not action is Dictionary:
				continue
			var descriptor: Dictionary = action
			if str(descriptor.get("objectId", "")) != object_id:
				continue
			var affordance := str(descriptor.get("affordance", ""))
			var label := "%s(%s)" % [_affordance_label(affordance), _actor_role_label(str(role))]
			if seen.has(label):
				continue
			seen[label] = true
			labels.append(label)
	return labels

func _all_civic_ledger_event_ids() -> Array:
	var ids := []
	for event in civic_ledger:
		if not event is Dictionary:
			continue
		var event_id := str(event.get("eventId", ""))
		if not event_id.is_empty():
			ids.append(event_id)
	return ids

func _world_record_prop_social_observation_labels(object_id: String, limit: int) -> Array[String]:
	var labels: Array[String] = []
	if object_id != "civic_ledger" or limit <= 0:
		return labels
	var observations := _social_observation_trace()
	for index in range(observations.size() - 1, -1, -1):
		var observation: Dictionary = observations[index]
		var observer_label := _actor_role_label(str(observation.get("observerRole", "")))
		var observed_actor_label := _actor_role_label(str(observation.get("observedActorRole", "")))
		var observed_affordance_label := _affordance_label(str(observation.get("observedAffordance", "")))
		var resulting_affordance_label := _affordance_label(str(observation.get("resultingAffordance", "")))
		var observed_event_id := str(observation.get("observedLedgerEventId", ""))
		var compact := "%s: %s/%s" % [observer_label, observed_actor_label, observed_affordance_label]
		if not observed_event_id.is_empty():
			compact = "%s(%s)" % [compact, observed_event_id]
		compact = "%s -> %s" % [compact, resulting_affordance_label]
		labels.append(compact)
		if labels.size() >= limit:
			break
	return labels

func _world_record_prop_recent_ledger_events(object_id: String, limit: int) -> Array[Dictionary]:
	var events: Array[Dictionary] = []
	if limit <= 0:
		return events
	for index in range(civic_ledger.size() - 1, -1, -1):
		var event: Dictionary = civic_ledger[index]
		var event_object_id := str(event.get("objectId", ""))
		if object_id == "civic_economy_panel":
			var event_economy_delta: Dictionary = event.get("economyDelta", {})
			if event_economy_delta.is_empty():
				continue
		elif object_id != "civic_ledger" and event_object_id != object_id:
			continue
		var compact := {
			"eventId": str(event.get("eventId", "")),
			"kind": str(event.get("kind", "")),
			"kindLabel": _civic_ledger_kind_label(str(event.get("kind", ""))),
			"actorRole": str(event.get("actorRole", "")),
			"actorRoleLabel": _actor_role_label(str(event.get("actorRole", ""))),
			"affordance": str(event.get("affordance", "")),
			"affordanceLabel": _affordance_label(str(event.get("affordance", "")))
		}
		var cited_id := str(event.get("citedLedgerEventId", ""))
		if not cited_id.is_empty():
			compact["citedLedgerEventId"] = cited_id
		var economy_delta: Dictionary = event.get("economyDelta", {})
		if not economy_delta.is_empty():
			compact["economyDelta"] = economy_delta.duplicate(true)
			compact["economyDeltaLabel"] = _economy_delta_label(economy_delta)
		events.append(compact)
		if events.size() >= limit:
			break
	return events

func _economy_delta_label(economy_delta: Dictionary) -> String:
	var labels := PackedStringArray()
	for key in ["accountCredit", "localTrust", "recordBurden", "stationAttention"]:
		if not economy_delta.has(key):
			continue
		var value := int(economy_delta.get(key, 0))
		var sign := "+" if value >= 0 else ""
		labels.append("%s%s%d" % [_economy_value_label(key), sign, value])
	return ", ".join(labels)

func _economy_value_label(key: String) -> String:
	match key:
		"accountCredit":
			return "잔액"
		"localTrust":
			return "신뢰"
		"recordBurden":
			return "부담"
		"stationAttention":
			return "주목"
	return key

func _latest_civic_ledger_label() -> String:
	if civic_ledger.is_empty():
		return "-"
	var latest: Dictionary = civic_ledger[civic_ledger.size() - 1]
	var event_id := str(latest.get("eventId", ""))
	var affordance_label := _affordance_label(str(latest.get("affordance", "")))
	var cited_id := str(latest.get("citedLedgerEventId", ""))
	if not cited_id.is_empty():
		return "%s -> %s\n%s" % [event_id, cited_id, affordance_label]
	return "%s\n%s" % [event_id, affordance_label]

func _compact_world_record_prop_label(object_id: String, state: String) -> String:
	if _current_locale() == "en":
		match object_id:
			"store_counter":
				return "COUNTER\n%s" % _record_state_value(state)
			"receipt_tray":
				return "RECEIPT\n%s" % _record_state_value(state)
			"correction_slip":
				return "FIX\n%s" % _record_state_value(state)
			"report_tray":
				return "REPORT\n%s" % _record_state_value(state)
			"park_notice_board":
				return "PUBLIC\n%s" % _record_state_value(state)
			"studio_review_queue":
				return "REVIEW\n%s" % _record_state_value(state)
		return ""
	match object_id:
		"store_counter":
			return "카운터\n%s" % _record_state_value(state)
		"receipt_tray":
			return "영수증\n%s" % _record_state_value(state)
		"correction_slip":
			return "정정\n%s" % _record_state_value(state)
		"report_tray":
			return "보고\n%s" % _record_state_value(state)
		"park_notice_board":
			return "공개판\n%s" % _record_state_value(state)
		"studio_review_queue":
			return "리뷰\n%s" % _record_state_value(state)
	return ""

func _civic_ledger_kind_label(kind: String) -> String:
	var ko := {
		"store_sale_normal": "정상 영수증",
		"queue_routine_kept": "일상 유지",
		"queue_wary_noted": "대기줄 경계",
		"store_receipt_marked": "영수증 표시",
		"correction_offered": "정정 제안",
		"store_sale_corrected": "정정 처리",
		"queue_repair_accepted": "줄 수습",
		"queue_left": "대기 이탈",
		"queue_contact_refused": "접촉 거부",
		"local_tip_shared": "로컬 팁",
		"queue_distance_kept": "거리두기",
		"public_routine_vouched": "공개 확인",
		"public_repair_noted": "공개 수습",
		"public_warning_posted": "공개 경고",
		"studio_review_invited": "리뷰 초대",
		"studio_review_conditioned": "조건부 리뷰",
		"studio_review_deferred": "리뷰 보류",
		"studio_review_blocked": "리뷰 차단",
		"queue_delay_noted": "대기줄 불평",
		"public_rumor_posted": "공개 소문",
		"store_exception_reported": "상점 보고",
		"store_report_escalated": "보고 전달",
		"service_paused": "응대 중단",
		"station_record_cited": "스테이션 인용",
		"usual_order_cited": "평소 주문 인용"
	}
	var en := {
		"store_sale_normal": "normal receipt",
		"queue_routine_kept": "routine kept",
		"queue_wary_noted": "queue wary note",
		"store_receipt_marked": "marked receipt",
		"correction_offered": "correction offered",
		"store_sale_corrected": "correction accepted",
		"queue_repair_accepted": "queue repair accepted",
		"queue_left": "queue left",
		"queue_contact_refused": "contact refused",
		"local_tip_shared": "local tip shared",
		"queue_distance_kept": "distance kept",
		"public_routine_vouched": "public routine vouched",
		"public_repair_noted": "public repair noted",
		"public_warning_posted": "public warning posted",
		"studio_review_invited": "review invited",
		"studio_review_conditioned": "conditional review",
		"studio_review_deferred": "review deferred",
		"studio_review_blocked": "review blocked",
		"queue_delay_noted": "queue delay noted",
		"public_rumor_posted": "public rumor posted",
		"store_exception_reported": "Store report",
		"store_report_escalated": "report forwarded",
		"service_paused": "service paused",
		"station_record_cited": "Station cited",
		"usual_order_cited": "usual order cited"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(kind, kind))

func _actor_role_label(actor_role: String) -> String:
	var ko := {
		"store_clerk": "상점 점원",
		"store_manager": "상점 매니저",
		"waiting_customer": "대기 손님",
		"park_witness": "공원 목격자",
		"studio_pm": "스튜디오 PM",
		"station_officer": "스테이션 직원"
	}
	var en := {
		"store_clerk": "Store Clerk",
		"store_manager": "Store Manager",
		"waiting_customer": "Waiting Customer",
		"park_witness": "Park Witness",
		"studio_pm": "Studio PM",
		"station_officer": "Station Officer"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(actor_role, actor_role))

func _affordance_label(affordance: String) -> String:
	var ko := {
		"create_receipt": "영수증 작성",
		"accept_routine": "일상 수락",
		"note_wary": "경계 메모",
		"mark_receipt": "영수증 표시",
		"attach_correction": "정정 첨부",
		"accept_repair": "수습 수락",
		"leave_queue": "줄 이탈",
		"refuse_contact": "접촉 거부",
		"share_local_tip": "로컬 팁",
		"keep_distance": "거리두기",
		"pause_service": "응대 중단",
		"complain_delay": "대기 불평",
		"post_rumor": "공개 게시",
		"vouch_routine": "일상 확인",
		"post_warning": "공개 경고",
		"post_repair_notice": "수습 게시",
		"invite_review": "리뷰 초대",
		"offer_conditional_review": "조건부 리뷰",
		"defer_review": "리뷰 보류",
		"block_review": "리뷰 차단",
		"place_note": "메모 배치",
		"forward_report": "보고 전달",
		"cite_record": "기록 인용",
		"cite_expected_order": "평소 주문 인용"
	}
	var en := {
		"create_receipt": "create receipt",
		"accept_routine": "accept routine",
		"note_wary": "note wary",
		"mark_receipt": "mark receipt",
		"attach_correction": "attach correction",
		"accept_repair": "accept repair",
		"leave_queue": "leave queue",
		"refuse_contact": "refuse contact",
		"share_local_tip": "share local tip",
		"keep_distance": "keep distance",
		"pause_service": "pause service",
		"complain_delay": "complain delay",
		"post_rumor": "post public rumor",
		"vouch_routine": "vouch routine",
		"post_warning": "post public warning",
		"post_repair_notice": "post repair notice",
		"invite_review": "invite review",
		"offer_conditional_review": "conditional review",
		"defer_review": "defer review",
		"block_review": "block review",
		"place_note": "place note",
		"forward_report": "forward report",
		"cite_record": "cite record",
		"cite_expected_order": "cite expected order"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(affordance, affordance))

func _world_record_prop_title(object_id: String) -> String:
	var ko := {
		"store_queue_mark": "대기 표식",
		"store_counter": "상점 카운터",
		"usual_order_cue": "늘 같은 주문",
		"receipt_tray": "영수증 트레이",
		"correction_slip": "정정 문서",
		"report_tray": "보고 트레이",
		"park_notice_board": "공원 게시판",
		"studio_review_queue": "스튜디오 리뷰 줄",
		"station_dossier": "스테이션 문서",
		"civic_ledger": "시민 장부",
		"civic_economy_panel": "시민 경제"
	}
	var en := {
		"store_queue_mark": "Queue mark",
		"store_counter": "Store counter",
		"usual_order_cue": "Usual order",
		"receipt_tray": "Receipt tray",
		"correction_slip": "Correction slip",
		"report_tray": "Report tray",
		"park_notice_board": "Park notice board",
		"studio_review_queue": "Studio review queue",
		"station_dossier": "Station dossier",
		"civic_ledger": "Civic ledger",
		"civic_economy_panel": "Civic economy"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(object_id, object_id))

func _record_state_value(state: String) -> String:
	var ko := {
		"blank": "빈칸",
		"normal": "정상",
		"marked": "표시됨",
		"corrected": "정정됨",
		"absent": "없음",
		"offered": "제안됨",
		"attached": "첨부됨",
		"empty": "비어 있음",
		"pending": "대기",
		"forwarded": "전달",
		"cited": "인용됨",
		"read": "읽힘",
		"serving": "응대 중",
		"paused": "응대 중단",
		"player_waiting": "플레이어 대기",
		"delayed": "조금 지연",
		"disrupted": "줄 흐트러짐",
		"settled": "줄 안정",
		"helped": "도움 공유",
		"distanced": "거리 둠",
		"refused": "접촉 거부",
		"append_only": "추가됨",
		"stable": "안정",
		"burden": "부담 증가",
		"attention": "주목 상승",
		"trust_low": "신뢰 하락",
		"clear": "비어 있음",
		"vouched": "일상 확인",
		"warned": "경고 게시",
		"repaired": "수습 게시",
		"rumored": "소문 게시",
		"open": "열림",
		"invited": "초대",
		"conditional": "조건부",
		"deferred": "보류",
		"blocked": "차단",
		"unknown": "미확인"
	}
	var en := {
		"blank": "blank",
		"normal": "normal",
		"marked": "marked",
		"corrected": "corrected",
		"absent": "absent",
		"offered": "offered",
		"attached": "attached",
		"empty": "empty",
		"pending": "pending",
		"forwarded": "forwarded",
		"cited": "cited",
		"read": "read",
		"serving": "serving",
		"paused": "paused",
		"player_waiting": "player waiting",
		"delayed": "slowed",
		"disrupted": "queue disrupted",
		"settled": "settled",
		"helped": "help shared",
		"distanced": "distance kept",
		"refused": "contact refused",
		"append_only": "append only",
		"stable": "stable",
		"burden": "burden rising",
		"attention": "attention rising",
		"trust_low": "trust low",
		"clear": "clear",
		"vouched": "routine vouched",
		"warned": "warning posted",
		"repaired": "repair posted",
		"rumored": "rumor posted",
		"open": "open",
		"invited": "invited",
		"conditional": "conditional",
		"deferred": "deferred",
		"blocked": "blocked",
		"unknown": "unknown"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(state, state))

func _world_record_prop_material(object_id: String, state: String) -> StandardMaterial3D:
	var color := _world_record_prop_color(object_id, state)
	var material := StandardMaterial3D.new()
	material.resource_name = "RecordProp_%s_%s" % [object_id, state]
	material.albedo_color = color
	material.roughness = 0.82
	if color.a < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if ["pending", "forwarded", "cited", "attention", "rumored", "vouched", "warned", "repaired", "invited", "conditional", "deferred", "blocked", "settled", "helped", "distanced", "paused"].has(state):
		material.emission_enabled = true
		material.emission = Color(color.r, color.g, color.b, 1.0)
		material.emission_energy_multiplier = 0.35
	return material

func _world_record_prop_color(object_id: String, state: String) -> Color:
	match state:
		"normal", "read", "serving", "player_waiting", "stable", "open":
			return Color(0.34, 0.76, 0.82, 0.94)
		"marked", "offered", "delayed", "distanced", "warned", "deferred", "blocked", "burden", "trust_low":
			return Color(1.0, 0.68, 0.28, 0.94)
		"attached", "corrected", "settled", "helped", "vouched", "repaired", "invited", "conditional":
			return Color(0.42, 0.86, 0.58, 0.96)
		"pending", "rumored", "paused":
			return Color(1.0, 0.52, 0.24, 0.96)
		"forwarded", "cited", "attention":
			return Color(1.0, 0.34, 0.26, 0.98)
		"append_only":
			return Color(0.82, 0.76, 0.42, 0.94)
		"absent", "empty", "blank":
			return Color(0.42, 0.46, 0.48, 0.62)
		_:
			return Color(0.58, 0.60, 0.62, 0.7)

func _latest_civic_ledger_id(event_kind: String) -> String:
	for index in range(civic_ledger.size() - 1, -1, -1):
		var event := civic_ledger[index]
		if str(event.get("kind", "")) == event_kind:
			return str(event.get("eventId", ""))
	return ""

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

func _conversation_event_extra(evaluation: Dictionary) -> Dictionary:
	var extra := {
		"actorId": "NPC_Store_Clerk",
		"conversationId": CONVERSATION_ID,
		"turnId": str(evaluation["turnId"]),
		"promptId": str(evaluation["promptId"]),
		"choiceSetId": str(evaluation["choiceSetId"]),
		"speakerId": "player",
		"displayedPlayerLine": str(evaluation["displayedPlayerLine"]),
		"inputMode": str(evaluation["inputMode"]),
		"priorTurnIds": evaluation["priorTurnIds"],
		"suspicionSignals": evaluation["suspicionSignals"],
		"suspicionBefore": int(evaluation["suspicionBefore"]),
		"suspicionAfter": int(evaluation["suspicionAfter"]),
		"suspicionDelta": int(evaluation["suspicionDelta"]),
		"reportWeightBefore": int(evaluation["reportWeightBefore"]),
		"reportWeightAfter": int(evaluation["reportWeightAfter"]),
		"reportDelta": int(evaluation["reportDelta"]),
		"whyLine": str(evaluation["whyLine"]),
		"conversationStage": stage,
		"outcome": _session_outcome(),
		"routeOutcome": route_outcome,
		"socialLoopStage": stage
	}
	var why_line_key := str(evaluation["whyLineKey"])
	if not why_line_key.is_empty():
		extra["whyLineKey"] = why_line_key
	var selected_choice_id := str(evaluation["selectedChoiceId"])
	if not selected_choice_id.is_empty():
		extra["selectedChoiceId"] = selected_choice_id
	var free_input_hash := str(evaluation["freeInputHash"])
	if not free_input_hash.is_empty():
		extra["freeInputHash"] = free_input_hash
	var recorded_statement_scope := str(evaluation["recordedStatementScope"])
	if not recorded_statement_scope.is_empty():
		extra["recordedStatementScope"] = recorded_statement_scope
	return extra

func _set_notice(title: String, body: String) -> void:
	notice_title = title
	notice_body = body

func _local_group_nodes(group_name: StringName) -> Array:
	var local_nodes := []
	for node in get_tree().get_nodes_in_group(group_name):
		if node is Node and _node_belongs_to_session_root(node as Node):
			local_nodes.append(node)
	return local_nodes

func _node_belongs_to_session_root(node: Node) -> bool:
	var current := node
	while current != null:
		if current == _root:
			return true
		current = current.get_parent()
	return false

func _set_actor_line(actor_id: String, line: String) -> void:
	if actor_id.is_empty():
		return
	for node in _local_group_nodes(&"npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == actor_id and node.has_method("say"):
			node.say(line)
			return

func _set_actor_reaction_state(actor_id: String, reaction_stage: String, reaction_exposure: int) -> void:
	if actor_id.is_empty():
		return
	for node in _local_group_nodes(&"npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == actor_id and node.has_method("set_reaction_state"):
			node.set_reaction_state(reaction_stage, reaction_exposure)
			return

func _visible_npc_states() -> Dictionary:
	var states := {}
	for node in _local_group_nodes(&"npc_placeholders"):
		var npc_id := str(node.get_meta("npc_id", ""))
		if npc_id.is_empty():
			continue
		if node.has_method("debug_reaction_snapshot"):
			var snapshot: Variant = node.call("debug_reaction_snapshot")
			if snapshot is Dictionary:
				var npc_snapshot: Dictionary = snapshot
				npc_snapshot["spokenLine"] = _npc_spoken_reaction_line(npc_id, npc_snapshot)
				states[npc_id] = npc_snapshot
				continue
		states[npc_id] = {
			"npcId": npc_id,
			"role": str(node.get_meta("role", "")),
			"homeLandmark": str(node.get_meta("home_landmark", ""))
		}
	return states

func _npc_spoken_reaction_line(npc_id: String, snapshot: Dictionary) -> String:
	var line := str(snapshot.get("pressureText", "")).strip_edges()
	if not line.is_empty():
		return line
	var state := str(snapshot.get("state", "normal"))
	if state == "normal":
		return ""
	match npc_id:
		"NPC_Waiting_Customer":
			match state:
				"helped":
					return "다음엔 여기서 같은 말만 먼저 하면 돼요."
				"repair_accepted":
					return "정정됐으면 줄은 계속 가도 되겠네요."
				"distanced":
					return "가까이 서지는 않겠습니다."
				"left":
					return "카운터까지 멈추면 저는 빠질게요."
				"refused":
					return "스테이션이 인용했으면 저는 말 섞지 않겠습니다."
		"NPC_Studio_PM":
			match state:
				"invited":
					return "공개 확인이 붙었네요. 리뷰 줄은 열어둘게요."
				"conditional":
					return "공개 수습 기록은 봤습니다. 리뷰 줄은 조건부로 남겨둘게요."
				"deferred":
					return "공개 경고가 붙었네요. 리뷰 줄은 오늘 보류하겠습니다."
				"blocked":
					return "스테이션 인용이 붙었네요. 리뷰 줄은 오늘 차단하겠습니다."
		"NPC_Store_Manager":
			match state:
				"paused":
					return "보고가 붙은 동안 카운터를 잠시 멈춥니다."
				"forwarded":
					return "이 상점 기록은 스테이션이 대조해야 합니다."
		"NPC_Park_Witness":
			match state:
				"vouched":
					return "줄도 그대로 갔으니 평소 흐름으로 남겨둘게요."
				"repaired":
					return "정정 기록이 붙었으니 소문으로 돌릴 일은 아니겠네요."
				"warned":
					return "줄이 늦춰진 건 남겨둘게요."
				"rumored":
					return "공원 게시판에 적어둘게요. 같은 말이 동네를 돕니다."
		"NPC_Station_Officer":
			if state == "reported":
				return "상점 기록을 접수했습니다. 이전 발화와 대조합니다."
			if state == "inquest":
				return "같은 대화에 두 출처가 있습니다. 지금부터 접수 형식으로만 남깁니다."
	return ""

func _current_choices() -> Array:
	var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
	return beat.get("choices", [])

func _current_npc_line(beat: Dictionary) -> String:
	if current_prompt_id == "store.same_order.probe":
		match last_choice_intent:
			"safe/local":
				return "네. 어제 기록처럼 같은 주문 맞으시죠?"
			"uncertain/repair":
				return "보통은 표식 하나라고 하셨죠. 오늘은 왜 확인하시나요?"
			"risky/weird":
				return "처음이라고요? 어제도 같은 자리에서 같은 말을 하셨는데요."
	return str(beat.get("npcLine", ""))

func _current_choice_set_id() -> String:
	var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
	return str(beat.get("choiceSetId", "store.same_order.choices"))

func _current_choice_lines() -> Array[String]:
	var lines: Array[String] = []
	for choice in _current_choices():
		lines.append(str(choice.get("line", "")))
	return lines

func _current_environment_tool_catalog() -> Array[Dictionary]:
	var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
	return _environment_tool_catalog_for_actor(str(beat.get("actorId", "")))

func _environment_tool_catalog_for_actor(actor_id: String) -> Array[Dictionary]:
	var actor_role := str(ACTOR_AGENT_ROLES.get(actor_id, ""))
	if actor_role.is_empty():
		return []
	return _available_role_agent_actions(actor_role)

func _current_environment_tool_summary_lines() -> Array[String]:
	var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
	return _environment_tool_summary_lines_for_actor(str(beat.get("actorId", "")))

func _environment_tool_summary_lines_for_actor(actor_id: String) -> Array[String]:
	var lines: Array[String] = []
	for action in _environment_tool_catalog_for_actor(actor_id):
		var label := _affordance_label(str(action.get("affordance", "")))
		var object_label := _world_record_prop_title(str(action.get("objectId", "")))
		var event_kind := str(action.get("ledgerEventKind", ""))
		var to_state := str(action.get("toState", ""))
		if event_kind.is_empty():
			lines.append("%s: %s -> %s" % [object_label, label, to_state])
		else:
			lines.append("%s: %s -> %s" % [object_label, label, _civic_ledger_kind_label(event_kind)])
	return lines

func _current_environment_tool_summary_text() -> String:
	var labels := PackedStringArray()
	for line in _current_environment_tool_summary_lines():
		labels.append(line)
	if labels.is_empty():
		return ""
	return "환경 도구: %s" % "; ".join(labels)

func _conversation_history_lines() -> Array[String]:
	var lines: Array[String] = []
	for item in conversation_history:
		lines.append("%s: %s" % [str(item.get("turnId", "")), str(item.get("playerLine", ""))])
	return lines

func _prior_turn_ids() -> Array[String]:
	var ids: Array[String] = []
	for item in conversation_history:
		ids.append(str(item.get("turnId", "")))
	return ids

func _unique_signals(values: Array[String]) -> Array[String]:
	var result: Array[String] = []
	for value in values:
		result = _append_signal(result, value)
	return result

func _append_signal(values: Array[String], value: String) -> Array[String]:
	if value.is_empty() or values.has(value):
		return values
	values.append(value)
	return values

func _string_array(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if value is Array:
		for item in value:
			result.append(str(item))
	return result

func _why_line_for_signals(signals: Array[String]) -> String:
	if signals.is_empty():
		return "이 발화는 점원이 전제한 지역 루틴 안에 머물렀습니다."
	return str(SIGNAL_WHY_LINES.get(signals[0], "이 발화는 대화 기록에 이상 신호로 남았습니다."))

func _free_input_hash(line: String) -> String:
	return "free-%d-%d" % [line.length(), abs(hash(line))]

func _update_focus() -> void:
	var best_node: Node3D = null
	var best_kind := ""
	var best_distance := FOCUS_RADIUS
	for node in _local_group_nodes(&"interaction_zones"):
		if node is Node3D:
			var distance := _player.global_position.distance_to((node as Node3D).global_position)
			if distance < best_distance:
				best_node = node as Node3D
				best_kind = "zone"
				best_distance = distance
	if best_node == null:
		for node in _local_group_nodes(&"operation_record_props"):
			if node is Node3D:
				var distance := _player.global_position.distance_to((node as Node3D).global_position)
				if distance < best_distance:
					best_node = node as Node3D
					best_kind = "record_prop"
					best_distance = distance
	if best_node == null:
		for node in _local_group_nodes(&"npc_placeholders"):
			if node is Node3D:
				var distance := _player.global_position.distance_to((node as Node3D).global_position)
				if distance < best_distance:
					best_node = node as Node3D
					best_kind = "npc"
					best_distance = distance
	if best_node == null:
		for node in _local_group_nodes(&"text_surfaces"):
			if node is Node3D:
				var distance := _player.global_position.distance_to((node as Node3D).global_position)
				if distance < best_distance:
					best_node = node as Node3D
					best_kind = "text_surface"
					best_distance = distance
	current_focus = best_node
	current_focus_kind = best_kind

func _force_focus_record_prop(object_id: String) -> bool:
	_refresh_world_record_props()
	for node in _local_group_nodes(&"operation_record_props"):
		if node is Node3D:
			if str(node.get_meta("record_object_id", "")) == object_id:
				current_focus = node as Node3D
				current_focus_kind = "record_prop"
				if _player != null:
					var focus_position := (node as Node3D).global_position + Vector3(0, 0, 1.15)
					focus_position.y = _player.global_position.y
					_player.global_position = focus_position
				_refresh_hud()
				return true
	return false

func _force_focus_npc(npc_id: String) -> bool:
	for node in _local_group_nodes(&"npc_placeholders"):
		if node is Node3D and str(node.get_meta("npc_id", "")) == npc_id:
			current_focus = node as Node3D
			current_focus_kind = "npc"
			if _player != null:
				var focus_position := (node as Node3D).global_position + Vector3(0, 0, 1.25)
				focus_position.y = _player.global_position.y
				_player.global_position = focus_position
			_refresh_hud()
			return true
	return false

func _force_focus_zone(zone_id: String) -> void:
	for node in _local_group_nodes(&"interaction_zones"):
		if str(node.get_meta("zone_id", "")) == zone_id and node is Node3D:
			current_focus = node as Node3D
			current_focus_kind = "zone"
			return

func _force_focus_text_surface(surface_id: String) -> bool:
	for node in _local_group_nodes(&"text_surfaces"):
		if str(node.get_meta("surface_id", "")) == surface_id and node is Node3D:
			current_focus = node as Node3D
			current_focus_kind = "text_surface"
			return true
	return false

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

func _text_surface_context_body(surface: Node, surface_id: String) -> String:
	var body := _text("text_surface.%s.body" % surface_id, {}, str(surface.get_meta("body", surface_id)))
	var landmark := str(surface.get_meta("landmark", ""))
	var law_id := str(surface.get_meta("law_id", ""))
	var cover_test_id := str(surface.get_meta("cover_test_id", ""))
	var outputs := PackedStringArray()
	for output in Array(surface.get_meta("evidence_outputs", [])):
		outputs.append(str(output))
	var context_lines := PackedStringArray()
	if not landmark.is_empty():
		context_lines.append("장소: %s" % landmark)
	if not law_id.is_empty():
		context_lines.append("절차 규칙: %s" % law_id)
	if not cover_test_id.is_empty():
		context_lines.append("대화 압력: %s" % cover_test_id)
	if not outputs.is_empty():
		context_lines.append("남는 기록: %s" % ", ".join(outputs))
	var surface_hint := _text_surface_social_hint(surface_id)
	if not surface_hint.is_empty():
		context_lines.append(surface_hint)
	context_lines.append("이 안내문은 플레이어가 조사하는 단서가 아니라, NPC와 기관이 플레이어의 말을 비교할 사회 규칙입니다.")
	return "%s\n%s" % [body, "\n".join(context_lines)]

func _text_surface_social_hint(surface_id: String) -> String:
	match surface_id:
		"TS_Studio_ApprovalCriteria":
			return "스튜디오 PM은 공개 확인, 수습, 경고, 스테이션 인용을 읽고 리뷰 기회를 열거나 닫습니다."
		"TS_Park_NoticeBoard":
			return "공원 게시판은 상점 안의 기록을 공개 확인, 수습, 경고, 소문으로 바꿔 다른 NPC가 읽게 합니다."
		"TS_Station_IntakeRules":
			return "스테이션은 새 사실을 발명하지 않고 전달된 상점 장부와 플레이어 발화를 대조합니다."
		"TS_Store_QueueRules":
			return "상점 줄은 평소 주문, 정정표, 지연, 보고 부담을 가장 먼저 사회 행동으로 바꿉니다."
	return ""

func _localization() -> Node:
	var nodes := _local_group_nodes(&"localization_services")
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
	var signatures := {"player": "%s:player:%s" % [_world_id(), stage]}
	for node in _local_group_nodes(&"npc_placeholders"):
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
	return "Same Order conversation -> suspicion %d -> report %d -> intake:%s inquest:%s termination:%s outcome:%s route:%s" % [
		int(summary.get("suspicion", 0)),
		int(summary.get("reportWeight", 0)),
		str(station.get("intakeOpen", false)),
		str(station.get("inquestOpen", false)),
		str(station.get("sessionTerminationAllowed", false)),
		_session_outcome(),
		route_outcome
	]

func _session_outcome() -> String:
	if not session_outcome.is_empty() and session_outcome != "running":
		return session_outcome
	if bool(station.get("inquestOpen", false)):
		return "inquest_opened"
	if bool(station.get("intakeOpen", false)):
		return "soft_report"
	return "running"

func _end_controls() -> Dictionary:
	if not _session_locked():
		return {}
	return {
		"restart": "restart_session",
		"quit": "quit_session"
	}

func _session_locked() -> bool:
	return bool(station.get("sessionTerminationAllowed", false))

func is_session_locked() -> bool:
	return _session_locked()

func _authority_mode() -> String:
	return "godot_local_conversation_runtime"

func _provider_state() -> Dictionary:
	return PROVIDER_STATE.duplicate(true)

func _release_authority_requirement() -> String:
	return "Same Order M1 is fallback-only until budgeted API preflight and Godot provider dispatch pass; public demo authority must keep suspicion, report, inquest, verdict, and session end deterministic."

func _resolve_terminal_outcome() -> void:
	if bool(station["inquestOpen"]):
		session_outcome = "inquest_opened"
		route_outcome = "inquest_opened"
		return
	if bool(station["intakeOpen"]):
		session_outcome = "soft_report"
		route_outcome = "soft_report"
		if repair_attempt_count > 0:
			repair_state = "used_failed"
		stage = "reported"
		return
	session_outcome = "cover_held"
	if repair_attempt_count > 0:
		route_outcome = "repair_recovered"
		repair_state = "used_success"
		_attach_correction_if_needed("The repair answer returns to the local premise, so the correction slip closes the Store record.")
	elif suspicion > 0:
		route_outcome = "cover_held_under_suspicion"
		_note_wary_after_marked_receipt(_latest_civic_ledger_id("store_receipt_marked"))
	else:
		route_outcome = "clean_cover"
		_apply_role_agent_action(
			"clean.clerk.cite_usual_order",
			"NPC_Store_Clerk",
			"store_clerk",
			"cite_expected_order",
			"usual_order_cue",
			"",
			"The clerk cites the usual order as the accepted local routine."
		)
		var receipt_result := _apply_role_agent_action(
			"clean.clerk.create_receipt",
			"NPC_Store_Clerk",
			"store_clerk",
			"create_receipt",
			"receipt_tray",
			"store_same_order_receipt",
			"The accepted line matches the Store routine and creates a normal receipt."
		)
		var receipt_event: Dictionary = receipt_result.get("event", {})
		_accept_routine_after_receipt(str(receipt_event.get("eventId", "")))

func _accept_routine_after_receipt(receipt_event_id: String) -> void:
	if receipt_event_id.is_empty():
		return
	if str(record_objects.get("store_queue_mark", "")) == "settled":
		return
	var result := _apply_role_agent_action(
		"clean.waiting_customer.accept_routine",
		"NPC_Waiting_Customer",
		"waiting_customer",
		"accept_routine",
		"store_queue_mark",
		"store_same_order_queue_routine",
		"A waiting customer sees the normal receipt and keeps the line moving instead of creating pressure.",
		receipt_event_id,
		[receipt_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Waiting_Customer", "정상 영수증이면 줄은 그대로 가면 되겠네요.")
		var event: Dictionary = result.get("event", {})
		_vouch_routine_after_acceptance(str(event.get("eventId", "")))

func _vouch_routine_after_acceptance(routine_event_id: String) -> void:
	if routine_event_id.is_empty():
		return
	if str(record_objects.get("park_notice_board", "")) != "clear":
		return
	var result := _apply_role_agent_action(
		"clean.park_witness.vouch_routine",
		"NPC_Park_Witness",
		"park_witness",
		"vouch_routine",
		"park_notice_board",
		"park_public_routine_vouch",
		"The Park witness sees the routine queue record and publicly vouches that the player stayed in the local flow.",
		routine_event_id,
		[routine_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Park_Witness", "줄도 그대로 갔으니 평소 흐름으로 남겨둘게요.")
		_set_actor_reaction_state("NPC_Park_Witness", "vouched", 20)
		var event: Dictionary = result.get("event", {})
		_share_local_tip_after_vouch(str(event.get("eventId", "")))

func _share_local_tip_after_vouch(vouch_event_id: String) -> void:
	if vouch_event_id.is_empty():
		return
	if str(record_objects.get("store_queue_mark", "")) != "settled":
		return
	var result := _apply_role_agent_action(
		"clean.waiting_customer.share_local_tip",
		"NPC_Waiting_Customer",
		"waiting_customer",
		"share_local_tip",
		"store_queue_mark",
		"store_same_order_local_tip",
		"Local trust is high after the public vouch, so the waiting customer shares a small local tip instead of only standing aside.",
		vouch_event_id,
		[vouch_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Waiting_Customer", "공원 게시판에 확인이 붙었으니 알려드릴게요. 다음엔 여기서 같은 말만 먼저 하면 돼요.")
		_invite_studio_review_after_vouch(vouch_event_id)

func _invite_studio_review_after_vouch(vouch_event_id: String) -> void:
	if vouch_event_id.is_empty():
		return
	if str(record_objects.get("studio_review_queue", "")) != "open":
		return
	var result := _apply_role_agent_action(
		"clean.studio_pm.invite_review",
		"NPC_Studio_PM",
		"studio_pm",
		"invite_review",
		"studio_review_queue",
		"studio_public_review_invite",
		"The Studio PM reads the public routine vouch and opens a tiny review invitation instead of relying on a private Store branch.",
		vouch_event_id,
		[vouch_event_id]
	)
	if bool(result.get("ok", false)):
		_set_actor_line("NPC_Studio_PM", "공개 확인이 붙었네요. 리뷰 줄은 열어둘게요.")
		_set_actor_reaction_state("NPC_Studio_PM", "invited", 20)

func _terminal_outcome_title() -> String:
	if session_outcome == "soft_report":
		return "스테이션 경고 접수"
	if route_outcome == "repair_recovered":
		return "대화 수습"
	return "대화 종료"

func _terminal_outcome_body() -> String:
	if session_outcome == "soft_report":
		return "결과: soft_report\n사슬: 플레이어 발화 -> 상점 보고 기록 -> 대기줄 반응 -> 공원 소문 게시 -> 카운터 중단 -> 대기 이탈 -> 스테이션 경고 접수\n사회 반응: 대기 손님이 점원 기록을 보고 줄이 멈췄다고 말했고, 공원 목격자는 같은 기록을 보고 게시판에 소문을 남겼습니다. 상점 관리자는 기록 부담을 보고 후속 메모를 붙인 뒤 카운터 응대를 잠시 멈췄고, 그 중단을 본 대기 손님은 줄에서 빠졌습니다.\n역할 행동: 공원 목격자가 상점 기록을 공개 소문으로 바꿨고, 상점 관리자가 보고 트레이에 후속 기록을 남기고 카운터를 중단 상태로 바꿨으며, 대기 손님이 중단 기록을 보고 대기 표식을 비웠습니다.\n스테이션 경고: 상점 보고는 접수되었지만 심문 기준에는 닿지 않았습니다.\n이 마이크로 시나리오는 경고로 닫힙니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line
	if route_outcome == "repair_recovered":
		return "결과: cover_held\n사슬: 기억 공백 발화 -> 영수증 표시/정정표 -> 대기줄 수습 -> 공개 수습 게시 -> 조건부 리뷰\n사회 반응: 대기 손님이 정정표를 보고 줄을 계속 진행해도 된다고 받아들였고, 공원 목격자는 정정 기록을 보고 소문으로 돌릴 일이 아니라고 남겼습니다. 스튜디오 PM은 그 공개 수습 기록을 읽고 기회를 완전히 닫지 않되 다음 기록을 더 보겠다고 리뷰 줄을 조건부로 남겼습니다.\n역할 행동: 상점 점원이 정정표를 붙이고, 대기 손님이 수습 기록을 받아들여 줄 표식을 안정시켰으며, 공원 목격자가 같은 정정 기록을 공개 수습 게시로 바꿨습니다. 이후 스튜디오 PM이 공개 수습 기록을 근거로 리뷰 대기열을 조건부 상태로 바꿨습니다.\n수습: 기억 공백은 남았지만 다음 발화가 점원의 전제 안으로 돌아왔고, 다른 장소의 기회는 차단 대신 조건부 관찰로 남았습니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line
	if route_outcome == "cover_held_under_suspicion":
		return "결과: cover_held\n사슬: 이상 발화 -> 영수증 표시 -> 대기줄 경계 -> 공원 게시판 공개 경고 -> 거리두기 -> 스튜디오 리뷰 보류 -> 스테이션 인용 없음\n사회 반응: 대기 손님이 표시된 영수증을 보고 줄을 조금 늦췄고, 공원 목격자는 그 경계 기록을 보고 정식 보고 대신 공원 게시판에 공개 경고를 남겼습니다. 게시판 경고 뒤 지역 신뢰가 낮아지자 대기 손님은 플레이어와 거리를 두고, 스튜디오 PM은 같은 공개 경고를 읽고 리뷰 줄을 보류합니다.\n역할 행동: 대기 손님이 상점 기록을 읽고 경계 메모를 남겨 대기 표식을 지연 상태로 바꿨고, 공원 목격자가 그 경계 기록을 공개 경고로 바꿨습니다. 이후 대기 손님이 공원 게시판의 공개 경고 기록을 보고 대기 표식을 거리두기 상태로 바꿨고, 스튜디오 PM은 같은 공개 기록을 근거로 리뷰 대기열을 보류 상태로 바꿨습니다.\n수습: 답변은 상점 안에서 닫혔지만 낮아진 지역 신뢰가 NPC의 거리두기와 다른 장소의 기회 보류를 열었습니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line
	return "결과: cover_held\n사슬: 일상 답변 -> 정상 영수증 -> 대기줄 유지 -> 공원 게시판 공개 확인 -> 로컬 팁 -> 스튜디오 리뷰 초대 -> 스테이션 인용 없음\n사회 반응: 대기 손님이 정상 영수증을 보고 줄이 그대로 가도 된다고 받아들였고, 공원 목격자는 그 일상 기록을 보고 플레이어가 지역 흐름 안에 있었다고 공원 게시판에 공개 확인을 남겼습니다. 게시판 확인으로 지역 신뢰가 충분해지자 대기 손님은 작은 로컬 팁을 공유했고, 스튜디오 PM은 같은 공개 확인을 읽고 리뷰 줄을 열어둡니다.\n역할 행동: 상점 점원이 정상 영수증을 만들고, 대기 손님이 일상 기록을 받아들여 줄 표식을 안정시켰으며, 공원 목격자가 그 기록을 공개 확인으로 바꿨습니다. 이후 대기 손님이 공원 게시판의 공개 확인 기록을 보고 대기 표식을 도움 상태로 바꿨고, 스튜디오 PM이 공개 확인을 근거로 리뷰 대기열을 초대 상태로 바꿨습니다.\n상점 대화가 지역 루틴 안에서 닫혔고 지역 신뢰가 다른 장소의 작은 초대 행동까지 열었습니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line

func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
