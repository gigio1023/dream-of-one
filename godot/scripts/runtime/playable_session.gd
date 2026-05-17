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
	"park_notice_board": ["park_witness"],
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
			"toState": "clear",
			"eventKind": "public_repair_noted",
			"allowedRoles": ["park_witness"],
			"requiresLedgerEvent": true,
			"requiresStoreLedgerEvent": true
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
var conversation_active := false
var current_prompt_id := "store.same_order.routine"
var current_turn_number := 0
var current_turn_id := "turn-0"
var conversation_history: Array[Dictionary] = []
var choice_catalog: Array = []
var notice_title := "시작 절차"
var notice_body := "상점 카운터에서 점원의 평범한 질문에 답하세요. 말이 기록이 될 수 있습니다."
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
		}
	]

func debug_codex_gameplay_snapshot() -> Dictionary:
	var summary := build_summary()
	return {
		"schemaVersion": "codex-gameplay-snapshot-v1",
		"actionCatalog": debug_codex_gameplay_action_catalog(),
		"summary": summary,
		"worldRecordProps": _world_record_prop_snapshot(),
		"hud": _codex_hud_snapshot()
	}

func debug_codex_gameplay_action(action_id: String, payload: Dictionary = {}) -> Dictionary:
	var before := _codex_small_summary(build_summary())
	var accepted := true
	var reason := "accepted"

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
		_:
			accepted = false
			reason = "unsupported_action"

	return {
		"actionId": action_id,
		"payload": payload.duplicate(true),
		"accepted": accepted,
		"reason": reason,
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
			"worldRecordProps": _world_record_prop_snapshot(),
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
			"worldRecordProps": _world_record_prop_snapshot(),
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
		_set_notice(
			surface_label,
			"%s\n이 안내문은 대화 중 무엇이 이상하게 들리는지 판단하는 맥락입니다." % _text("text_surface.%s.body" % surface_id, {}, surface_id)
		)
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
	outcome_body = "상점 대화 기록이 접수되었습니다.\n사슬: 플레이어 발화/응답 지연 -> 상점 기록 -> 대기줄 반응 -> 공원 게시 -> 보고 전달 -> 스테이션 인용 -> 접촉 거부 -> 심문\n사회 반응: 대기 손님이 점원 기록을 보고 줄이 멈췄다고 말했고, 공원 목격자가 게시판에 소문을 남겼으며, 상점 관리자가 그 기록을 전달했고, 스테이션 직원이 전달 기록을 인용했습니다. 그 인용을 본 대기 손님은 플레이어와 말 섞기를 거부했습니다.\n스테이션 인용: 보고 트레이에서 전달된 장부 %s\n역할 행동: 스테이션 직원이 전달된 Store 장부를 인용했고, 대기 손님이 그 인용 기록을 보고 대기 표식을 접촉 거부 상태로 바꿨습니다.\n대조 대상: 이전 발화와 방금 입력한 말\n기록된 why-line: %s\nR 다시 시작 / Q 종료" % [cited_store_record, str(evaluation["whyLine"])]
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
	var prompt := "WASD로 이동. 상점 카운터에 접근해 E로 대화를 시작하세요."
	var choices_enabled := false
	if conversation_active and not _session_locked():
		var beat: Dictionary = CONVERSATION_BEATS.get(current_prompt_id, {})
		prompt = _current_npc_line(beat)
		choices_enabled = true
	elif current_focus != null and current_focus_kind == "text_surface":
		var surface_id := str(current_focus.get_meta("surface_id", ""))
		prompt = "E: %s 읽기" % _localized_text_surface_label(current_focus, surface_id)
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
		_hud.set_record_state(record_objects, civic_economy, civic_ledger, _social_observation_trace())
	if _hud.has_method("set_provider_state"):
		_hud.set_provider_state(_provider_state())
	if _hud.has_method("set_evidence"):
		_hud.set_evidence(_recent_events())
	_refresh_world_record_props()
	_set_actor_reaction_state("NPC_Store_Clerk", stage, exposure)
	_set_actor_reaction_state("NPC_Store_Manager", "reported" if int(civic_economy.get("recordBurden", 0)) >= 50 else "normal", exposure)
	_set_actor_reaction_state("NPC_Park_Witness", "reported" if ["reported", "inquest"].has(stage) else "normal", exposure)
	_set_actor_reaction_state("NPC_Station_Officer", "inquest" if bool(station["inquestOpen"]) else ("reported" if bool(station["intakeOpen"]) else "normal"), exposure)

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
		_set_actor_line("NPC_Waiting_Customer", "경고가 붙었으니 조금 떨어져 있을게요. 보고까지는 아니지만 가까이 서지는 않겠습니다.")

func debug_agent_action_log() -> Array:
	return agent_action_log.duplicate(true)

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

func _refresh_world_record_props() -> void:
	for prop_value in get_tree().get_nodes_in_group("operation_record_props"):
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
	for prop_value in get_tree().get_nodes_in_group("operation_record_props"):
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
		"queue_delay_noted": "대기줄 불평",
		"public_rumor_posted": "공개 소문",
		"store_exception_reported": "상점 보고",
		"store_report_escalated": "보고 전달",
		"service_paused": "응대 중단",
		"station_record_cited": "스테이션 인용"
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
		"queue_delay_noted": "queue delay noted",
		"public_rumor_posted": "public rumor posted",
		"store_exception_reported": "Store report",
		"store_report_escalated": "report forwarded",
		"service_paused": "service paused",
		"station_record_cited": "Station cited"
	}
	var table: Dictionary = en if _current_locale() == "en" else ko
	return str(table.get(kind, kind))

func _actor_role_label(actor_role: String) -> String:
	var ko := {
		"store_clerk": "상점 점원",
		"store_manager": "상점 매니저",
		"waiting_customer": "대기 손님",
		"park_witness": "공원 목격자",
		"station_officer": "스테이션 직원"
	}
	var en := {
		"store_clerk": "Store Clerk",
		"store_manager": "Store Manager",
		"waiting_customer": "Waiting Customer",
		"park_witness": "Park Witness",
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
		"place_note": "메모 배치",
		"forward_report": "보고 전달",
		"cite_record": "기록 인용"
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
		"place_note": "place note",
		"forward_report": "forward report",
		"cite_record": "cite record"
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
		"station_dossier": "스테이션 문서",
		"civic_ledger": "시민 장부"
	}
	var en := {
		"store_queue_mark": "Queue mark",
		"store_counter": "Store counter",
		"usual_order_cue": "Usual order",
		"receipt_tray": "Receipt tray",
		"correction_slip": "Correction slip",
		"report_tray": "Report tray",
		"park_notice_board": "Park notice board",
		"station_dossier": "Station dossier",
		"civic_ledger": "Civic ledger"
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
		"settled": "줄 안정",
		"helped": "도움 공유",
		"distanced": "거리 둠",
		"append_only": "추가됨",
		"stable": "안정",
		"burden": "부담 증가",
		"attention": "주목 상승",
		"trust_low": "신뢰 하락",
		"clear": "비어 있음",
		"vouched": "일상 확인",
		"warned": "경고 게시",
		"rumored": "소문 게시",
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
		"settled": "settled",
		"helped": "help shared",
		"distanced": "distance kept",
		"append_only": "append only",
		"stable": "stable",
		"burden": "burden rising",
		"attention": "attention rising",
		"trust_low": "trust low",
		"clear": "clear",
		"vouched": "routine vouched",
		"warned": "warning posted",
		"rumored": "rumor posted",
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
	if ["pending", "forwarded", "cited", "attention", "rumored", "vouched", "warned", "settled", "helped", "distanced", "paused"].has(state):
		material.emission_enabled = true
		material.emission = Color(color.r, color.g, color.b, 1.0)
		material.emission_energy_multiplier = 0.35
	return material

func _world_record_prop_color(object_id: String, state: String) -> Color:
	match state:
		"normal", "read", "serving", "player_waiting", "stable":
			return Color(0.34, 0.76, 0.82, 0.94)
		"marked", "offered", "delayed", "distanced", "warned", "burden", "trust_low":
			return Color(1.0, 0.68, 0.28, 0.94)
		"attached", "corrected", "settled", "helped", "vouched":
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

func _set_actor_line(actor_id: String, line: String) -> void:
	if actor_id.is_empty():
		return
	for node in get_tree().get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == actor_id and node.has_method("say"):
			node.say(line)
			return

func _set_actor_reaction_state(actor_id: String, reaction_stage: String, reaction_exposure: int) -> void:
	if actor_id.is_empty():
		return
	for node in get_tree().get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) == actor_id and node.has_method("set_reaction_state"):
			node.set_reaction_state(reaction_stage, reaction_exposure)
			return

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

func _force_focus_zone(zone_id: String) -> void:
	for node in get_tree().get_nodes_in_group("interaction_zones"):
		if str(node.get_meta("zone_id", "")) == zone_id and node is Node3D:
			current_focus = node as Node3D
			current_focus_kind = "zone"
			return

func _force_focus_text_surface(surface_id: String) -> void:
	for node in get_tree().get_nodes_in_group("text_surfaces"):
		if str(node.get_meta("surface_id", "")) == surface_id and node is Node3D:
			current_focus = node as Node3D
			current_focus_kind = "text_surface"
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
	var signatures := {"player": "%s:player:%s" % [_world_id(), stage]}
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
		_set_actor_line("NPC_Waiting_Customer", "다음엔 여기서 같은 말만 먼저 하면 돼요. 오늘은 제가 알려드릴게요.")

func _terminal_outcome_title() -> String:
	if session_outcome == "soft_report":
		return "스테이션 경고 접수"
	if route_outcome == "repair_recovered":
		return "대화 수습"
	return "대화 종료"

func _terminal_outcome_body() -> String:
	if session_outcome == "soft_report":
		return "결과: soft_report\n사슬: 플레이어 발화 -> 상점 보고 기록 -> 대기줄 반응 -> 카운터 중단 -> 대기 이탈 -> 스테이션 경고 접수\n사회 반응: 대기 손님이 점원 기록을 보고 줄이 멈췄다고 말했고, 상점 관리자가 기록 부담을 보고 후속 메모를 붙인 뒤 카운터 응대를 잠시 멈췄습니다. 그 중단을 본 대기 손님은 줄에서 빠졌습니다.\n역할 행동: 상점 관리자가 보고 트레이에 후속 기록을 남기고 카운터를 중단 상태로 바꿨고, 대기 손님이 중단 기록을 보고 대기 표식을 비웠습니다.\n스테이션 경고: 상점 보고는 접수되었지만 심문 기준에는 닿지 않았습니다.\n이 마이크로 시나리오는 경고로 닫힙니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line
	if route_outcome == "repair_recovered":
		return "결과: cover_held\n사슬: 기억 공백 발화 -> 영수증 표시/정정표 -> 대기줄 수습 -> 공개 수습 게시 -> 상점 안에서 수습\n사회 반응: 대기 손님이 정정표를 보고 줄을 계속 진행해도 된다고 받아들였고, 공원 목격자는 정정 기록을 보고 소문으로 돌릴 일이 아니라고 남겼습니다.\n역할 행동: 상점 점원이 정정표를 붙이고, 대기 손님이 수습 기록을 받아들여 줄 표식을 안정시켰으며, 공원 목격자가 같은 정정 기록을 공개 수습 게시로 바꿨습니다.\n수습: 기억 공백은 남았지만 다음 발화가 점원의 전제 안으로 돌아왔습니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line
	if route_outcome == "cover_held_under_suspicion":
		return "결과: cover_held\n사슬: 이상 발화 -> 영수증 표시 -> 대기줄 경계 -> 공개 경고 -> 거리두기 -> 스테이션 인용 없음\n사회 반응: 대기 손님이 표시된 영수증을 보고 줄을 조금 늦췄고, 공원 목격자는 그 경계 기록을 보고 정식 보고 대신 공개 경고를 남겼습니다. 경고 뒤 지역 신뢰가 낮아지자 대기 손님은 플레이어와 거리를 둡니다.\n역할 행동: 대기 손님이 상점 기록을 읽고 경계 메모를 남겨 대기 표식을 지연 상태로 바꿨고, 공원 목격자가 그 경계 기록을 공개 경고로 바꿨습니다. 이후 대기 손님이 공개 경고 기록을 보고 대기 표식을 거리두기 상태로 바꿨습니다.\n수습: 답변은 상점 안에서 닫혔지만 낮아진 지역 신뢰가 NPC의 거리두기 행동을 열었습니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line
	return "결과: cover_held\n사슬: 일상 답변 -> 정상 영수증 -> 대기줄 유지 -> 공개 확인 -> 로컬 팁 -> 스테이션 인용 없음\n사회 반응: 대기 손님이 정상 영수증을 보고 줄이 그대로 가도 된다고 받아들였고, 공원 목격자는 그 일상 기록을 보고 플레이어가 지역 흐름 안에 있었다고 공개 확인을 남겼습니다. 그 공개 확인으로 지역 신뢰가 충분해지자 대기 손님은 작은 로컬 팁을 공유했습니다.\n역할 행동: 상점 점원이 정상 영수증을 만들고, 대기 손님이 일상 기록을 받아들여 줄 표식을 안정시켰으며, 공원 목격자가 그 기록을 공개 확인으로 바꿨습니다. 이후 대기 손님이 공개 확인 기록을 보고 대기 표식을 도움 상태로 바꿨습니다.\n상점 대화가 지역 루틴 안에서 닫혔고 지역 신뢰가 NPC의 도움 행동을 열었습니다.\n마지막 why-line: %s\nR 다시 시작 / Q 종료" % last_why_line

func _now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
