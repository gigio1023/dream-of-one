extends Node

const SETTINGS_PATH := "user://m3r_settings.cfg"
const DEFAULT_UI_SCALE := 1.0
const DEFAULT_MASTER_VOLUME := 0.8
const DEFAULT_SFX_VOLUME := 0.8
const CONVERSATION_ERROR_HOLD_SECONDS := 1.5
const CONVERSATION_END_HOLD_SECONDS := 2.0
const CONVERSATION_START_RETRY_ATTEMPTS := 3
const CONVERSATION_PRELOAD_MAX_IN_FLIGHT := 1
const CONVERSATION_PRELOAD_MAX_RETRIES := 3
const CONVERSATION_PRELOAD_RETRY_SECONDS := 1.0
const CONVERSATION_PRELOAD_DISTANCE_M := 16.0
const CONVERSATION_PRELOAD_SWITCH_MARGIN_M := 3.0
const ADVANCE_BATCH_SECONDS := 1.0
const FIXTURE_ADVANCE_BATCH_SECONDS := 10.0
const ARRIVAL_BATCH_SECONDS := 2.0
const RUN_START_RETRY_MIN_SECONDS := 1.0
const RUN_START_RETRY_MAX_SECONDS := 8.0
const MOVEMENT_RETRY_DELAY_SECONDS := 1.0
const MOVEMENT_MAX_RETRIES := 2
const ADVANCE_RETRY_SECONDS := 1.0
const ADVANCE_MAX_SECONDS := 10
const ADVANCE_MAX_ARRIVALS := 6
const ADVANCE_MAX_PROP_EVENTS := 8
const AMBIENT_DECISION_RETRY_SECONDS := 1.0
const CONTACT_SPATIAL_REFRESH_SECONDS := 0.25
const PLAYER_SPATIAL_DIRTY_DISTANCE_M := 0.5
const HEARING_OPEN_RETRY_MIN_SECONDS := 1.0
const HEARING_OPEN_RETRY_MAX_SECONDS := 8.0

@onready var _town: Town3D = $Town
@onready var _player: CharacterBody3D = $Town/Actors/Player3D
@onready var _hud: HUD3D = $HUD3D
@onready var _audio_feedback: AudioFeedback = $AudioFeedback
@onready var _onboarding: OnboardingOverlay = $OnboardingOverlay
@onready var _run_session: RunSession3D = $RunSession
@onready var _localization: Node = get_node("/root/Localization")

var _ui_scale := DEFAULT_UI_SCALE
var _master_volume := DEFAULT_MASTER_VOLUME
var _sfx_volume := DEFAULT_SFX_VOLUME
var _locale_name := ""
var _run_id := ""
var _run_start_id := ""
var _run_start_locale := ""
var _active_session_id := ""
var _run_snapshot: Dictionary = {}
var _accepted_provider_evidence_run_id := ""
var _accepted_provider_audit: Dictionary = {}
var _accepted_provider_runtime_trace: Dictionary = {}
var _accepted_provider_evidence_source := "none"
var _accepted_provider_evidence_response_revision := -1
var _social_view: Dictionary = {}
var _active_turn: Dictionary = {}
var _last_proposal_meta: Dictionary = {}
var _conversation_target: NPC3D
var _run_start_in_flight := false
var _run_start_attempts := 0
var _run_start_last_error: Dictionary = {}
var _run_start_halted_reason := ""
var _resolving_answer := false
var _ending_conversation := false
var _required_retry_answer: Dictionary = {}
var _conversation_start_retry_required := false
var _conversation_start_in_flight := false
var _conversation_preload_queue: Array[String] = []
var _conversation_preload_queued: Dictionary = {}
var _conversation_preload_queued_cycle_kinds: Dictionary = {}
var _conversation_preload_in_flight: Dictionary = {}
var _conversation_preload_requeue_requested: Dictionary = {}
var _conversation_preload_requeue_cycle_kinds: Dictionary = {}
var _conversation_preload_retries: Dictionary = {}
var _conversation_preload_retry_queued: Dictionary = {}
var _conversation_preload_attempted: Dictionary = {}
var _conversation_preload_refresh_required := false
var _conversation_preload_invalidated: Dictionary = {}
var _conversation_preload_recovery_required: Dictionary = {}
var _conversation_preload_demand_signatures: Dictionary = {}
var _conversation_preload_demand_epochs: Dictionary = {}
var _conversation_preload_invalidation_demand_epochs: Dictionary = {}
var _conversation_preload_recovery_demand_epochs: Dictionary = {}
var _conversation_preload_priority_actor_id := ""
var _advance_elapsed_buffer := 0.0
var _advance_in_flight := false
var _advance_rebase_in_flight := false
var _advance_needs_rebase := false
var _advance_retry_remaining := 0.0
var _arrival_batch_remaining := -1.0
var _advance_sequence := 0
var _pending_advance_request: Dictionary = {}
var _queued_arrivals: Array[Dictionary] = []
var _queued_prop_events: Array[Dictionary] = []
var _prop_event_sequence := 0
var _last_accepted_prop_event_ids: Array = []
var _last_prop_observation_memories: Array = []
var _last_prop_event_rejection := ""
var _arrival_batch_movement_ids: Dictionary = {}
var _queued_movement_deltas: Array[Dictionary] = []
var _active_movements: Dictionary = {}
var _blocked_movements: Dictionary = {}
var _recent_schedule_wakes: Array = []
var _last_arrivals_applied: Array = []
var _last_arrivals_rejected: Array = []
var _advance_lane_halted_reason := ""
var _fixture_replay_complete := false
var _spatial_facts_dirty := true
var _last_spatial_facts_packet: Dictionary = {}
var _ambient_speech_cursor := 0
var _ambient_speech_events: Array[Dictionary] = []
var _ambient_seen_seqs: Dictionary = {}
var _ambient_active_conversation: Variant = null
var _ambient_wake_queue: Array[Dictionary] = []
var _ambient_claimed_wake_ids: Dictionary = {}
var _ambient_pending_request: Dictionary = {}
var _ambient_pending_wake_kind := ""
var _ambient_pending_request_dispatched := false
var _ambient_decision_in_flight := false
var _ambient_decision_retry_remaining := 0.0
var _ambient_decision_waiting_for_resume := false
var _ambient_decision_halted_reason := ""
var _ambient_last_decision_status := ""
var _ambient_last_decision_kind := ""
var _ambient_last_wake_kind := ""
var _ambient_last_actor_ids: Array = []
var _ambient_provider_metas: Array = []
var _deferred_ambient_speech_events: Array[Dictionary] = []
var _applied_conversation_end_batches: Dictionary = {}
var _record_encounter_in_flight := false
var _encounter_sequence := 0
var _acknowledged_speech_encounters: Dictionary = {}
var _active_contact: Dictionary = {}
var _pending_contact_ready_id := ""
var _conversation_contact_id := ""
var _conversation_contact_zone_id := ""
var _contact_spatial_refresh_remaining := 0.0
var _last_spatial_player_position := Vector3(INF, INF, INF)
var _run_status := "active"
var _hearing_procedure: Dictionary = {}
var _terminal_result: Dictionary = {}
var _hearing_id := ""
var _hearing_open_in_flight := false
var _hearing_open_retry_remaining := 0.0
var _hearing_open_attempts := 0
var _hearing_open_halted_reason := ""
var _hearing_staging: Dictionary = {}
var _run_end_id := ""
var _run_end_in_flight := false
var _lifecycle_generation := 0
var _hesitation_retry_scheduled := false
var _player_focus_attention_target: Node = null
var _player_preload_attention_target: Node = null
var _conversation_return_look := Vector2.ZERO
var _conversation_return_look_valid := false
var _provider_failure: Dictionary = {}
var _provider_failure_retry_kind := ""
var _provider_failure_retry_context: Dictionary = {}
var _provider_failure_retry_in_flight := false
var _run_abandon_id := ""
var _run_abandon_in_flight := false
var _terminal_contract_cleanup_required := false


func _ready() -> void:
	_ensure_sfx_bus()
	_load_preferences()
	if not bool(_localization.call("set_locale", _locale_name)):
		_locale_name = str(_localization.call("default_locale"))
		_localization.call("set_locale", _locale_name)
	else:
		_locale_name = str(_localization.call("locale"))
	_player.focus_changed.connect(_on_player_focus_changed)
	_player.preload_intent_changed.connect(_on_player_preload_intent_changed)
	_player.unfocused_interaction_requested.connect(_on_unfocused_interaction_requested)
	_player.settings_requested.connect(_hud.open_settings)
	_hud.modal_mode_changed.connect(_on_modal_mode_changed)
	_hud.debug_visibility_changed.connect(_on_debug_visibility_changed)
	_hud.look_settings_changed.connect(_on_look_settings_changed)
	_hud.ui_scale_requested.connect(_on_ui_scale_requested)
	_hud.audio_settings_requested.connect(_on_audio_settings_requested)
	_hud.language_requested.connect(_on_language_requested)
	_hud.choice_submitted.connect(_on_choice_submitted)
	_hud.free_input_submitted.connect(_on_free_input_submitted)
	_hud.hesitation_expired.connect(_on_hesitation_expired)
	_hud.conversation_end_retry_requested.connect(_on_conversation_end_retry_requested)
	_hud.provider_failure_retry_requested.connect(_on_provider_failure_retry_requested)
	_hud.provider_failure_restart_requested.connect(
		_on_provider_failure_restart_requested
	)
	_hud.legacy_provider_failure_detected.connect(_on_legacy_provider_failure_detected)
	_hud.restart_requested.connect(_on_restart_requested)
	_hud.ambient_subtitle_started.connect(_on_ambient_subtitle_started)
	for surface_value in get_tree().get_nodes_in_group(&"record_surfaces"):
		if surface_value is Node and (surface_value as Node).has_signal(
			&"record_surface_requested"
		):
			(surface_value as Node).connect(
				&"record_surface_requested",
				_on_record_surface_requested
			)
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D:
			var actor := actor_value as NPC3D
			actor.movement_arrived.connect(_on_npc_movement_arrived)
			actor.movement_blocked.connect(_on_npc_movement_blocked)
			actor.player_contact_ready.connect(_on_player_contact_ready)
			actor.conversation_requested.connect(_on_conversation_requested.bind(actor))
	for prop_value in get_tree().get_nodes_in_group(&"physical_props"):
		if prop_value is Node and (prop_value as Node).has_signal(&"handling_event"):
			var prop := prop_value as Node
			if not prop.is_connected(&"handling_event", _on_prop_handling_event):
				prop.connect(&"handling_event", _on_prop_handling_event)
	_hud.configure_look_settings(
		float(_player.get("mouse_sensitivity")),
		bool(_player.get("invert_y")),
		float(_player.get("field_of_view"))
	)
	_hud.configure_preferences(_ui_scale, _master_volume, _sfx_volume, _locale_name)
	_hud.set_language_applies_next_run(false)
	_hud.set_ui_scale(_ui_scale)
	_hud.refresh_localized_text()
	_apply_audio_settings()
	call_deferred("_initialize_run_background")


func _process(delta: float) -> void:
	if _hud.debug_visible():
		_hud.set_debug_snapshot(_debug_snapshot())
	if _run_abandon_in_flight:
		return
	if get_tree().paused or _conversation_target != null:
		return
	if _run_id.is_empty() or _run_start_in_flight:
		return
	if _run_status == "hearing_due":
		_hearing_open_retry_remaining = maxf(
			0.0,
			_hearing_open_retry_remaining - delta
		)
		if (
			not _hearing_open_in_flight
			and _hearing_open_halted_reason.is_empty()
			and is_zero_approx(_hearing_open_retry_remaining)
		):
			_dispatch_hearing_open()
		return
	if _run_status != "active":
		return
	_update_player_spatial_dirty(delta)
	_try_open_pending_contact()
	_ambient_decision_retry_remaining = maxf(
		0.0,
		_ambient_decision_retry_remaining - delta
	)
	if (
		not _ambient_decision_in_flight
		and _ambient_decision_halted_reason.is_empty()
		and is_zero_approx(_ambient_decision_retry_remaining)
	):
		if _ambient_pending_request.is_empty():
			_prepare_next_ambient_decision()
		if not _ambient_pending_request.is_empty():
			_dispatch_ambient_decision()
	if _fixture_replay_complete:
		return
	if not _advance_lane_halted_reason.is_empty():
		return
	if bool(_dictionary_or_empty(_run_snapshot.get("worldClock")).get("hearingDue", false)):
		_enter_hearing_due()
		return
	_advance_elapsed_buffer += delta
	_advance_retry_remaining = maxf(0.0, _advance_retry_remaining - delta)
	_tick_blocked_movements(delta)
	var fixture_batch_state := _fixture_movement_batch_state()
	match fixture_batch_state:
		&"waiting":
			return
		&"blocked", &"lost":
			_advance_lane_halted_reason = "fixture_movement_batch_%s" % fixture_batch_state
			push_error("Fixture movement batch halted: %s." % fixture_batch_state)
			return
		&"ready":
			_arrival_batch_remaining = 0.0
	if not _queued_arrivals.is_empty() and _arrival_batch_remaining >= 0.0:
		_arrival_batch_remaining = maxf(0.0, _arrival_batch_remaining - delta)
	if _advance_in_flight or _advance_rebase_in_flight:
		return
	if _advance_needs_rebase:
		if is_zero_approx(_advance_retry_remaining):
			_rebase_run_after_advance_conflict()
		return
	if not _pending_advance_request.is_empty():
		if is_zero_approx(_advance_retry_remaining):
			_dispatch_advance()
		return
	var should_advance := (
		not _queued_prop_events.is_empty()
		or (
			is_zero_approx(_arrival_batch_remaining)
			if not _queued_arrivals.is_empty()
			else _advance_elapsed_buffer >= _advance_batch_seconds()
		)
	)
	if should_advance:
		_prepare_advance_request()
		_dispatch_advance()


func presentation_snapshot() -> Dictionary:
	var town_snapshot := _town.presentation_snapshot()
	var hud_snapshot := _hud.presentation_snapshot()
	return {
		"locationId": town_snapshot.get("locationId", ""),
		"worldRevision": town_snapshot.get("worldRevision", ""),
		"runWorldRevision": _run_snapshot.get("worldRevision", 0),
		"runId": _run_id,
		"runStatus": _run_status,
		"hearingProcedure": _hearing_procedure.duplicate(true),
		"terminalResult": _terminal_result.duplicate(true),
		"hearingId": _hearing_id,
		"runEndId": _run_end_id,
		"sessionMode": _run_session.mode(),
		"runLocale": _run_snapshot.get("locale", _run_start_locale),
		"presentationLocale": hud_snapshot.get("locale", ""),
		"nextRunLocale": str(_localization.call("api_locale", _locale_name)),
		"languageAppliesNextRun": hud_snapshot.get("languageAppliesNextRun", false),
		"transitioning": false,
		"resolvingAnswer": _resolving_answer or _ending_conversation,
		"currentTurn": _active_turn.duplicate(true),
		"encounteredStances": hud_snapshot.get("encounteredStances", []),
		"socialView": hud_snapshot.get("socialView", {}),
		"hearing": hud_snapshot.get("hearing", {}),
		"institutionalPressure": hud_snapshot.get("institutionalPressure", {}),
		"provider": _last_proposal_meta.duplicate(true),
		"providerFailure": hud_snapshot.get("providerFailure", {}),
		"providerBudget": _dictionary_or_empty(_run_snapshot.get("providerBudget")),
		"providerAudit": _dictionary_or_empty(_run_snapshot.get("providerAudit")),
		"providerRuntimeTrace": _dictionary_or_empty(
			_run_snapshot.get("providerRuntimeTrace")
		),
		"providerEvidenceFreshness": _provider_evidence_freshness_snapshot(),
		"actors": _actor_readiness_summaries(),
		"worldClock": _dictionary_or_empty(_run_snapshot.get("worldClock")),
		"scheduler": _dictionary_or_empty(_run_snapshot.get("scheduler")),
		"scheduleWakes": _recent_schedule_wakes.duplicate(true),
		"arrivals": {
			"applied": _last_arrivals_applied.duplicate(true),
			"rejected": _last_arrivals_rejected.duplicate(true),
			"queuedCount": _queued_arrivals.size(),
		},
		"physicalProps": {
			"queuedEventCount": _queued_prop_events.size(),
			"lastAcceptedEventIds": _last_accepted_prop_event_ids.duplicate(true),
			"lastObservationMemoryCount": _last_prop_observation_memories.size(),
			"lastRejection": _last_prop_event_rejection,
		},
		"advance": {
			"inFlight": _advance_in_flight,
			"pending": not _pending_advance_request.is_empty(),
			"pendingRequest": _advance_request_summary(_pending_advance_request),
			"needsRebase": _advance_needs_rebase,
			"haltedReason": _advance_lane_halted_reason,
			"fixtureReplayComplete": _fixture_replay_complete,
			"bufferedSeconds": _advance_elapsed_buffer,
			"runStartAttempts": _run_start_attempts,
			"runStartError": _run_start_last_error.duplicate(true),
			"runStartHaltedReason": _run_start_halted_reason,
			"spatialFactsDirty": _spatial_facts_dirty,
			"lastSpatialFacts": _spatial_facts_summary(_last_spatial_facts_packet),
			"adapter": _run_session.diagnostics_snapshot(),
		},
		"activeMovements": _active_movement_summaries(),
		"blockedMovements": _blocked_movement_summaries(),
		"ambientSpeech": {
			"cursor": _ambient_speech_cursor,
			"events": _ambient_speech_events.duplicate(true),
			"activeConversation": _ambient_active_conversation,
			"deferredCount": _deferred_ambient_speech_events.size(),
			"decisionLane": {
				"inFlight": _ambient_decision_in_flight,
				"pendingRequest": _ambient_decision_request_summary(
					_ambient_pending_request
				),
				"queuedWakeCount": _ambient_wake_queue.size(),
				"waitingForResume": _ambient_decision_waiting_for_resume,
				"lastStatus": _ambient_last_decision_status,
				"lastDecisionKind": _ambient_last_decision_kind,
				"lastWakeKind": _ambient_last_wake_kind,
				"lastActorIds": _ambient_last_actor_ids.duplicate(true),
				"haltedReason": _ambient_decision_halted_reason,
				"providerMetas": _ambient_provider_metas.duplicate(true),
			},
		},
		"ambientSubtitle": hud_snapshot.get("ambientSubtitle", {}),
		"contact": _contact_presentation_snapshot(),
		"hearingFlow": {
			"hearingId": _hearing_id,
			"openInFlight": _hearing_open_in_flight,
			"openAttempts": _hearing_open_attempts,
			"retryRemaining": _hearing_open_retry_remaining,
			"haltedReason": _hearing_open_halted_reason,
			"staging": _hearing_staging.duplicate(true),
			"endId": _run_end_id,
			"endInFlight": _run_end_in_flight,
		},
		"outcome": hud_snapshot.get("outcome", {}),
	}


func _on_modal_mode_changed(_previous: int, current: int) -> void:
	if current != HUD3D.ModalMode.NONE:
		_player.set_control_enabled(false)
		_player.release_mouse()
	else:
		_try_open_pending_contact()
		_restore_player_control_if_unlocked()


func _on_debug_visibility_changed(visible: bool) -> void:
	if visible:
		_hud.set_debug_snapshot(_debug_snapshot())


func _restore_player_control_if_unlocked() -> void:
	if (
		_run_status in ["hearing_active", "terminal", "closed"]
		or _conversation_target != null
		or _hud.modal_mode() != HUD3D.ModalMode.NONE
	):
		return
	_player.set_control_enabled(true)
	_player.capture_mouse()


func _on_record_surface_requested(surface_id: String) -> void:
	if _run_abandon_in_flight:
		return
	if (
		_run_status != "active"
		or _record_encounter_in_flight
		or _conversation_target != null
		or _hud.modal_mode() != HUD3D.ModalMode.NONE
	):
		return
	_record_encounter_in_flight = true
	_hud.open_log_busy()
	if not await _ensure_run():
		_record_encounter_in_flight = false
		_hud.finish_log_busy(&"hud.m3r.error.record_inspect")
		return
	_encounter_sequence += 1
	var encounter_id := "enc:record:%06d" % _encounter_sequence
	var result: Dictionary = await _send_encounter_with_retry(
		encounter_id,
		{
			"kind": "record_surface",
			"textSurfaceId": surface_id,
			"playerPosition": _vector3_to_array(_player.global_position),
		}
	)
	_record_encounter_in_flight = false
	if _run_status != "active":
		return
	if _is_error(result):
		_hud.finish_log_busy(&"hud.m3r.error.record_inspect")
		return
	_apply_social_view_from_response(result)
	_hud.finish_log_busy()


func _send_encounter_with_retry(encounter_id: String, encounter: Dictionary) -> Dictionary:
	var result: Dictionary = {}
	for attempt in 3:
		result = await _run_session.encounter(_run_id, encounter_id, encounter)
		if not _is_error(result) or str(result.get("error", "")) != "run_encounter_failed":
			return result
		if attempt < 2:
			await get_tree().create_timer(pow(2.0, attempt), false).timeout
	return result


func _on_look_settings_changed(sensitivity: float, inverted: bool, fov: float) -> void:
	_player.set_look_settings(sensitivity, inverted, fov)
	_save_preferences()


func _on_ui_scale_requested(value: float) -> void:
	_ui_scale = clampf(value, 0.8, 1.5)
	_hud.set_ui_scale(_ui_scale)
	_save_preferences()


func _on_audio_settings_requested(master_volume: float, sfx_volume: float) -> void:
	_master_volume = clampf(master_volume, 0.0, 1.0)
	_sfx_volume = clampf(sfx_volume, 0.0, 1.0)
	_apply_audio_settings()
	_save_preferences()


func _on_language_requested(locale_name: String) -> void:
	var requested_locale := str(_localization.call("presentation_locale", locale_name))
	if requested_locale.is_empty():
		return
	_locale_name = requested_locale
	if _run_start_locale.is_empty():
		if not bool(_localization.call("set_locale", _locale_name)):
			return
		_locale_name = str(_localization.call("locale"))
		_hud.refresh_localized_text()
	_hud.configure_preferences(_ui_scale, _master_volume, _sfx_volume, _locale_name)
	_save_preferences()


func _update_player_spatial_dirty(delta: float) -> void:
	if (
		_last_spatial_player_position.x == INF
		or _player.global_position.distance_to(_last_spatial_player_position)
		>= PLAYER_SPATIAL_DIRTY_DISTANCE_M
	):
		_spatial_facts_dirty = true
	if _active_contact.is_empty():
		_contact_spatial_refresh_remaining = 0.0
		return
	_contact_spatial_refresh_remaining = maxf(
		0.0,
		_contact_spatial_refresh_remaining - delta
	)
	if is_zero_approx(_contact_spatial_refresh_remaining):
		# This only dirties the next batched advance; it never sends per frame.
		_spatial_facts_dirty = true
		_contact_spatial_refresh_remaining = CONTACT_SPATIAL_REFRESH_SECONDS


func _on_prop_handling_event(event: Dictionary) -> void:
	if _run_status != "active":
		return
	var prop_id := str(event.get("propId", ""))
	var action := str(event.get("action", ""))
	var player_position := _array_or_empty(event.get("playerPosition"))
	var object_position := _array_or_empty(event.get("objectPosition"))
	var observers := _array_or_empty(event.get("observers"))
	if (
		not _physical_prop_known(prop_id)
		or action not in ["pick_up", "carry", "place", "throw"]
		or player_position.size() != 3
		or object_position.size() != 3
		or not _prop_observers_are_exact(observers)
	):
		push_warning("Ignoring malformed physical prop observation: %s:%s" % [prop_id, action])
		return
	_prop_event_sequence += 1
	var packet := {
		"eventId": "prop-client-%d-%06d" % [OS.get_process_id(), _prop_event_sequence],
		"propId": prop_id,
		"action": action,
		"playerPosition": player_position.duplicate(true),
		"objectPosition": object_position.duplicate(true),
		"observedWorldRevision": int(_run_snapshot.get("worldRevision", 0)),
		"observers": observers.duplicate(true),
	}
	_queued_prop_events.append(packet)


func _physical_prop_known(prop_id: String) -> bool:
	if prop_id.is_empty():
		return false
	for prop_value in _town.layout_snapshot().get("physical_props", []):
		if prop_value is Dictionary and str((prop_value as Dictionary).get("id", "")) == prop_id:
			return true
	return false


func _prop_observers_are_exact(observers: Array) -> bool:
	if observers.size() != 6:
		return false
	var expected_ids: PackedStringArray = []
	for actor_value in _town.layout_snapshot().get("actors", []):
		if actor_value is Dictionary:
			expected_ids.append(str((actor_value as Dictionary).get("id", "")))
	expected_ids.sort()
	var received_ids: PackedStringArray = []
	for observer_value in observers:
		if not observer_value is Dictionary:
			return false
		var observer := observer_value as Dictionary
		var actor_id := str(observer.get("actorId", ""))
		if actor_id.is_empty() or received_ids.has(actor_id):
			return false
		if typeof(observer.get("visible", null)) != TYPE_BOOL:
			return false
		received_ids.append(actor_id)
	received_ids.sort()
	return received_ids == expected_ids


func _on_player_contact_ready(contact_id: String, actor_id: StringName) -> void:
	if _run_status != "active":
		return
	if not _contact_is_current(contact_id, str(actor_id)) or _contact_expired():
		return
	_pending_contact_ready_id = contact_id
	call_deferred("_try_open_pending_contact")


func _on_unfocused_interaction_requested() -> void:
	# Ordinary NPC contact owns a global response cue, so accepting it cannot
	# depend on keeping a moving resident inside the camera focus cone. Main owns
	# the authoritative contact id; reusing its readiness checks avoids a second
	# player-side target scan or any broader unfocused interaction behavior.
	if (
		_run_status != "active"
		or _active_contact.is_empty()
		or str(_active_contact.get("procedure", "ordinary")) != "ordinary"
		or _contact_expired()
	):
		return
	var actor_id := str(_active_contact.get("actorId", ""))
	var contact_id := str(_active_contact.get("contactId", ""))
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	if (
		actor == null
		or not actor.player_contact_is_ready(contact_id)
		or not bool(_actor_view(actor_id).get("playerConversationReady", false))
	):
		return
	_begin_conversation(StringName(actor_id), actor, contact_id)


func _try_open_pending_contact() -> void:
	if _run_status != "active":
		_pending_contact_ready_id = ""
		return
	if _hud.modal_mode() != HUD3D.ModalMode.NONE:
		return
	if _pending_contact_ready_id.is_empty():
		return
	var contact_id := _pending_contact_ready_id
	var actor_id := str(_active_contact.get("actorId", ""))
	if not _contact_is_current(contact_id, actor_id) or _contact_expired():
		_pending_contact_ready_id = ""
		_hud.clear_contact_approach(contact_id)
		return
	if (
		_conversation_target != null
		or _resolving_answer
		or _ending_conversation
		or _record_encounter_in_flight
	):
		return
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	if actor == null:
		return
	if not actor.player_contact_is_ready(contact_id):
		_hud.show_contact_approach(contact_id, actor_id)
		return
	# Reaching the player and preparing a provider-backed opening are separate
	# asynchronous events. Keep the contact lease pending until RunService says
	# the opening is ready; otherwise `_begin_conversation` would surface a
	# transient error modal and make the resident repeat the approach.
	if not bool(_actor_view(actor_id).get("playerConversationReady", false)):
		_hud.show_contact_approach(contact_id, actor_id)
		call_deferred("_queue_nearby_conversation_preloads")
		return
	if str(_active_contact.get("procedure", "ordinary")) == "ordinary":
		_hud.show_contact_ready(contact_id, actor_id)
		return
	_begin_conversation(StringName(actor_id), actor, contact_id)


func _contact_is_current(contact_id: String, actor_id := "") -> bool:
	return (
		not contact_id.is_empty()
		and contact_id == str(_active_contact.get("contactId", ""))
		and (actor_id.is_empty() or actor_id == str(_active_contact.get("actorId", "")))
	)


func _contact_expired() -> bool:
	if _active_contact.is_empty():
		return true
	var expires_at := float(_active_contact.get("expiresAtSeconds", INF))
	var elapsed := float(
		_dictionary_or_empty(_run_snapshot.get("worldClock")).get("elapsedSeconds", 0.0)
	)
	return elapsed >= expires_at


func _sync_active_contact_from_response(
	response: Dictionary,
	authoritative_snapshot := false
) -> void:
	if not response.has("activeContact"):
		return
	if _run_status != "active":
		if not _active_contact.is_empty():
			_clear_active_contact(false)
		return
	# Every authoritative contact mutation advances the run revision. A response
	# that started before the current contact may arrive later with
	# `activeContact: null`; lower- or equal-revision absence cannot revoke the
	# newer contact. Synthetic smoke packets omit worldRevision deliberately and
	# retain the direct helper semantics used below.
	var has_response_revision := response.has("worldRevision")
	var current_revision := int(_run_snapshot.get("worldRevision", -1))
	var response_revision := int(response.get("worldRevision", current_revision))
	if has_response_revision and response_revision < current_revision:
		return
	var incoming_value: Variant = response.get("activeContact")
	if incoming_value == null:
		if (
			has_response_revision
			and not _active_contact.is_empty()
			and response_revision <= current_revision
			and not (
				authoritative_snapshot
				and response_revision == current_revision
			)
		):
			return
		_clear_active_contact(_conversation_target == null)
		return
	if not incoming_value is Dictionary:
		push_warning("Ignoring malformed activeContact from RunService.")
		return
	var incoming := (incoming_value as Dictionary).duplicate(true)
	var contact_id := str(incoming.get("contactId", ""))
	var actor_id := str(incoming.get("actorId", ""))
	var interaction_zone_id := str(incoming.get("interactionZoneId", ""))
	var procedure := str(incoming.get("procedure", ""))
	if (
		contact_id.is_empty()
		or actor_id.is_empty()
		or interaction_zone_id.is_empty()
		or procedure not in ["ordinary", "interrogation"]
	):
		push_warning("Ignoring incomplete activeContact from RunService.")
		return
	var previous_id := str(_active_contact.get("contactId", ""))
	var previous_actor_id := str(_active_contact.get("actorId", ""))
	var contact_changed := previous_id != contact_id or previous_actor_id != actor_id
	if not previous_id.is_empty() and previous_id != contact_id:
		_clear_active_contact(_conversation_target == null)
	_active_contact = incoming
	if not _run_snapshot.is_empty():
		_run_snapshot["activeContact"] = incoming.duplicate(true)
	_resume_active_contact_follow()
	if contact_changed or not bool(
		_actor_view(actor_id).get("playerConversationReady", false)
	):
		# Active contact outranks raw aim and passive proximity in the existing
		# bounded preload scheduler. Refresh that priority immediately instead of
		# waiting for an unrelated advance or aim change.
		call_deferred("_queue_nearby_conversation_preloads")


func _resume_active_contact_follow() -> void:
	if (
		_run_status != "active"
		or _active_contact.is_empty()
		or _conversation_target != null
		or get_tree().paused
	):
		return
	var actor_id := str(_active_contact.get("actorId", ""))
	var contact_id := str(_active_contact.get("contactId", ""))
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	if actor == null or contact_id.is_empty():
		return
	var started_follow := false
	if not actor.has_player_contact(contact_id):
		_drop_client_movement_for_actor(actor_id)
		if not actor.begin_player_contact(
			contact_id,
			_player,
			float(_active_contact.get("safeDistanceM", 1.6))
		):
			push_warning("NPC %s rejected player contact %s." % [actor_id, contact_id])
			return
		started_follow = true
	if started_follow or not actor.player_contact_is_ready(contact_id):
		_hud.show_contact_approach(contact_id, actor_id)
	_spatial_facts_dirty = true


func _clear_active_contact(return_to_origin: bool) -> void:
	if _active_contact.is_empty():
		return
	var ended := _active_contact.duplicate(true)
	var contact_id := str(ended.get("contactId", ""))
	var actor_id := str(ended.get("actorId", ""))
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	if actor != null and actor.has_player_contact(contact_id):
		var return_position: Variant = null
		if return_to_origin:
			return_position = _town.navigation_position(str(ended.get("originAnchorRef", "")))
		actor.cancel_player_contact(return_position)
	if _pending_contact_ready_id == contact_id:
		_pending_contact_ready_id = ""
	_hud.clear_contact_approach(contact_id)
	# Movements received while this contact was active were contradictory or
	# stale by definition. A later authoritative scheduler snapshot may issue
	# the still-current movement again after activeContact becomes null.
	_discard_queued_movement_for_actor(actor_id)
	_active_contact = {}
	if not _run_snapshot.is_empty():
		_run_snapshot["activeContact"] = null
	_spatial_facts_dirty = true


func _drop_client_movement_for_actor(actor_id: String) -> void:
	_active_movements.erase(actor_id)
	_blocked_movements.erase(actor_id)
	_discard_queued_movement_for_actor(actor_id)
	for index in range(_queued_arrivals.size() - 1, -1, -1):
		if str(_queued_arrivals[index].get("actorId", "")) == actor_id:
			_arrival_batch_movement_ids.erase(
				str(_queued_arrivals[index].get("movementId", ""))
			)
			_queued_arrivals.remove_at(index)


func _contact_presentation_snapshot() -> Dictionary:
	if _active_contact.is_empty():
		return {"active": false, "status": "none"}
	var actor_id := str(_active_contact.get("actorId", ""))
	var contact_id := str(_active_contact.get("contactId", ""))
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	var status := "approaching"
	var actor_status: Dictionary = {}
	if actor != null:
		actor_status = actor.contact_status()
		if bool(actor_status.get("ready", false)):
			if str(_active_contact.get("procedure", "ordinary")) == "ordinary":
				status = (
					"ready_waiting_player"
						if bool(_actor_view(actor_id).get("playerConversationReady", false))
						else "ready_waiting_opening"
				)
			elif _pending_contact_ready_id == contact_id:
				status = "ready_deferred"
			else:
				status = "ready"
	return {
		"active": true,
		"contactId": contact_id,
		"actorId": actor_id,
		"interactionZoneId": str(_active_contact.get("interactionZoneId", "")),
		"procedure": str(_active_contact.get("procedure", "ordinary")),
		"reason": str(_active_contact.get("reason", "")),
		"status": status,
		"expiresAtSeconds": float(_active_contact.get("expiresAtSeconds", 0.0)),
		"follow": actor_status,
	}


func _hydrate_run_lifecycle(response: Dictionary) -> void:
	if response.has("runStatus"):
		var status := str(response.get("runStatus", ""))
		if status in ["active", "hearing_due", "hearing_active", "terminal", "closed"]:
			_run_status = status
			_run_snapshot["runStatus"] = status
	if response.has("hearingProcedure"):
		var procedure_value: Variant = response.get("hearingProcedure")
		_hearing_procedure = (
			(procedure_value as Dictionary).duplicate(true)
			if procedure_value is Dictionary
			else {}
		)
		if _hearing_procedure.is_empty():
			_run_snapshot["hearingProcedure"] = null
		else:
			_run_snapshot["hearingProcedure"] = _hearing_procedure.duplicate(true)
	if response.has("terminalResult"):
		var terminal_value: Variant = response.get("terminalResult")
		_terminal_result = (
			(terminal_value as Dictionary).duplicate(true)
			if terminal_value is Dictionary
			else {}
		)
		if _terminal_result.is_empty():
			_run_snapshot["terminalResult"] = null
		else:
			_run_snapshot["terminalResult"] = _terminal_result.duplicate(true)


func _enter_hearing_due() -> void:
	if _run_status in ["hearing_active", "terminal", "closed"]:
		return
	var first_entry := _hearing_id.is_empty()
	_discard_conversation_look()
	_run_status = "hearing_due"
	_run_snapshot["runStatus"] = _run_status
	_run_snapshot["hearingProcedure"] = null
	_run_snapshot["terminalResult"] = null
	_set_run_clock_paused(true)
	if not first_entry:
		return
	_lifecycle_generation += 1
	_hearing_id = _new_hearing_id()
	_hearing_open_attempts = 0
	_hearing_open_retry_remaining = 0.0
	_hearing_open_halted_reason = ""
	_pending_contact_ready_id = ""
	if not _active_contact.is_empty():
		_clear_active_contact(false)
	_queued_movement_deltas.clear()
	_queued_arrivals.clear()
	_queued_prop_events.clear()
	_arrival_batch_movement_ids.clear()
	_active_movements.clear()
	_blocked_movements.clear()
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D:
			var actor := actor_value as NPC3D
			actor.set_conversation_state(false, false)
			actor.stop()
	for surface_value in get_tree().get_nodes_in_group(&"record_surfaces"):
		if surface_value is Node and (surface_value as Node).has_method(
			"set_interaction_enabled"
		):
			(surface_value as Node).call("set_interaction_enabled", false)
	_recent_schedule_wakes.clear()
	_ambient_wake_queue.clear()
	_clear_ambient_pending_request()
	_ambient_decision_waiting_for_resume = false
	_deferred_ambient_speech_events.clear()
	_conversation_preload_queue.clear()
	_conversation_preload_queued.clear()
	_conversation_preload_queued_cycle_kinds.clear()
	_conversation_preload_requeue_requested.clear()
	_conversation_preload_requeue_cycle_kinds.clear()
	_conversation_preload_retries.clear()
	_conversation_preload_retry_queued.clear()
	_conversation_preload_attempted.clear()
	_conversation_preload_invalidated.clear()
	_conversation_preload_recovery_required.clear()
	_conversation_preload_demand_signatures.clear()
	_conversation_preload_demand_epochs.clear()
	_conversation_preload_invalidation_demand_epochs.clear()
	_conversation_preload_recovery_demand_epochs.clear()
	_conversation_preload_priority_actor_id = ""
	_pending_advance_request = {}
	_advance_needs_rebase = false
	_advance_retry_remaining = 0.0
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_hesitation_retry_scheduled = false
	_conversation_start_retry_required = false
	_conversation_contact_id = ""
	_conversation_contact_zone_id = ""
	_record_encounter_in_flight = false
	_resolving_answer = false
	_ending_conversation = false
	_conversation_target = null
	_hud.close_conversation()
	_hud.clear_ambient_subtitles()
	_hud.clear_contact_approach()
	_hud.set_focus(null)
	_player.call("_set_focused_target", null)
	_hud.finish_log_busy()
	_hud.close_log()
	_hud.close_settings()
	_hud.show_hearing_opening(false)
	_player.set_control_enabled(true)
	_player.capture_mouse()
	get_tree().paused = false


func _new_hearing_id() -> String:
	if _run_session.mode() == "fixture":
		return "hearing-fixture-1"
	return "godot-hearing-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]


func _dispatch_hearing_open() -> void:
	if (
		_hearing_open_in_flight
		or _run_status != "hearing_due"
		or _hearing_id.is_empty()
	):
		return
	_hearing_open_in_flight = true
	_hearing_open_attempts += 1
	var hearing_id := _hearing_id
	var lifecycle_generation := _lifecycle_generation
	var result: Dictionary = await _run_session.open_hearing(_run_id, hearing_id)
	_hearing_open_in_flight = false
	if (
		lifecycle_generation != _lifecycle_generation
		or _run_status != "hearing_due"
		or hearing_id != _hearing_id
	):
		return
	if _present_provider_failure(result, "hearing_open"):
		_hud.show_hearing_opening(true)
		_hearing_open_halted_reason = "provider_failed"
		return
	if _is_error(result):
		_hud.show_hearing_opening(true)
		_hearing_open_retry_remaining = minf(
			HEARING_OPEN_RETRY_MAX_SECONDS,
			HEARING_OPEN_RETRY_MIN_SECONDS * pow(2.0, mini(_hearing_open_attempts - 1, 3))
		)
		return
	if (
		str(result.get("action", "")) != "open"
		or str(result.get("hearingId", "")) != hearing_id
		or str(result.get("runStatus", "")) != "hearing_active"
		or not result.get("staging", null) is Dictionary
		or not result.get("nextTurn", null) is Dictionary
	):
		_hearing_open_halted_reason = "invalid_hearing_open_response"
		_hud.show_hearing_opening(true)
		push_error("RunService returned an invalid hearing-open response.")
		return
	_resolve_provider_failure("hearing_open")
	_apply_social_view_from_response(result)
	_hydrate_run_lifecycle(result)
	_cache_provider_evidence(result)
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	var opening_meta_value: Variant = result.get("proposalMeta")
	if opening_meta_value is Dictionary:
		_last_proposal_meta = (opening_meta_value as Dictionary).duplicate(true)
		_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	_hearing_staging = _dictionary_or_empty(result.get("staging"))
	await _stage_hearing(_dictionary_or_empty(result.get("nextTurn")))


func _stage_hearing(next_turn: Dictionary) -> void:
	var player_anchor_ref := str(_hearing_staging.get("playerAnchorRef", ""))
	var focus_anchor_ref := str(_hearing_staging.get("focusAnchorRef", ""))
	var player_position_value: Variant = _town.navigation_position(player_anchor_ref)
	var focus_position_value: Variant = _town.anchor_position(focus_anchor_ref)
	if not player_position_value is Vector3 or not focus_position_value is Vector3:
		_hearing_open_halted_reason = "hearing_staging_anchor_missing"
		_hud.show_hearing_opening(true)
		push_error("Hearing staging could not resolve its authored Station anchors.")
		return
	_hud.clear_hearing_opening()
	await _hud.fade_to_hearing()
	if _run_status != "hearing_active":
		return
	_player.global_position = player_position_value as Vector3
	_player.velocity = Vector3.ZERO
	_player.call("face_position", focus_position_value as Vector3)
	_player.set_control_enabled(false)
	_player.release_mouse()
	var speaker_id := str(next_turn.get("speakerId", "NPC_Station_Officer"))
	_conversation_target = _town.get_node_or_null("Actors/%s" % speaker_id) as NPC3D
	_active_session_id = ""
	_active_turn = next_turn.duplicate(true)
	_required_retry_answer = {}
	_hud.begin_conversation(_actor_view(speaker_id))
	get_tree().paused = true
	_set_run_clock_paused(true)
	if not _hud.show_turn(_active_turn):
		_hearing_open_halted_reason = "invalid_hearing_turn"
		_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		return
	await _hud.fade_from_hearing()


func _enter_terminal_outcome() -> void:
	if _terminal_result.is_empty():
		push_error("Terminal run state has no terminalResult.")
		return
	_run_status = "terminal"
	_run_snapshot["runStatus"] = _run_status
	_run_snapshot["terminalResult"] = _terminal_result.duplicate(true)
	if _terminal_result_requires_cleanup(_terminal_result):
		# Hydrated terminal state has no immutable request packet to retry. Keep
		# the authoritative snapshot for diagnostics, but offer only the normal
		# terminal end lifecycle as clean-run recovery.
		_active_session_id = ""
		_active_turn = {}
		_required_retry_answer = {}
		_resolving_answer = false
		_ending_conversation = false
		_conversation_target = null
		_player.set_control_enabled(false)
		_player.release_mouse()
		_set_run_clock_paused(true)
		get_tree().paused = true
		return
	_discard_conversation_look()
	_lifecycle_generation += 1
	_terminal_contract_cleanup_required = false
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_resolving_answer = false
	_ending_conversation = false
	_conversation_target = null
	_pending_contact_ready_id = ""
	_hud.clear_hearing_opening()
	_hud.clear_contact_approach()
	_hud.clear_ambient_subtitles()
	_hud.show_outcome(_terminal_result, _run_snapshot)
	_player.set_control_enabled(false)
	_player.release_mouse()
	_set_run_clock_paused(true)
	get_tree().paused = true


func _terminal_result_requires_cleanup(result: Dictionary) -> bool:
	var failure := _provider_failure_payload(result)
	if failure.is_empty() and not _provider_failure.is_empty():
		failure = _provider_failure.duplicate(true)
	if failure.is_empty() and _valid_terminal_result(result, _run_snapshot, _hearing_id):
		return false
	if failure.is_empty():
		failure = {
			"profileId": str(_last_proposal_meta.get("profileId", "client-contract")),
			"reason": "invalid_envelope",
			"purpose": "hearing_verdict",
			"operationKey": "client:terminal_hydration:%s" % str(
				result.get("hearingId", "unknown")
			),
		}
	_terminal_contract_cleanup_required = true
	_provider_failure_retry_kind = ""
	_provider_failure_retry_context = {}
	_present_provider_failure({"providerFailure": failure})
	return true


func _on_restart_requested() -> void:
	if _run_end_in_flight or _terminal_result.is_empty():
		_hud.set_outcome_busy(false, &"hud.m3r.error.run_end")
		return
	if _run_status == "closed":
		_reload_current_run_scene()
		return
	if _run_status != "terminal":
		_hud.set_outcome_busy(false, &"hud.m3r.error.run_end")
		return
	if _run_end_id.is_empty():
		_run_end_id = _new_run_end_id()
	_run_end_in_flight = true
	var result: Dictionary = await _run_session.end_run(_run_id, _run_end_id)
	_run_end_in_flight = false
	if _is_error(result):
		_hud.set_outcome_busy(false, &"hud.m3r.error.run_end")
		return
	if (
		str(result.get("runId", "")) != _run_id
		or str(result.get("endId", "")) != _run_end_id
		or str(result.get("runStatus", "")) != "closed"
	):
		_hud.set_outcome_busy(false, &"hud.m3r.error.run_end")
		return
	_hydrate_run_lifecycle(result)
	_run_snapshot["providerBudget"] = _dictionary_or_empty(result.get("providerBudget"))
	_cache_provider_evidence(result)
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	_reload_current_run_scene()


func _new_run_end_id() -> String:
	if _run_session.mode() == "fixture":
		return "end-fixture-1"
	return "godot-end-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]


func _reload_current_run_scene(provider_failure_restart := false) -> void:
	_discard_conversation_look()
	get_tree().paused = false
	var error := get_tree().reload_current_scene()
	if error != OK:
		get_tree().paused = true
		if provider_failure_restart:
			_hud.show_provider_failure_restart_error()
		else:
			_hud.set_outcome_busy(false, &"hud.m3r.error.run_end")
		push_error("Could not reload the current 3D run scene: %s" % error_string(error))


func _on_conversation_requested(actor_id: StringName, target: NPC3D) -> void:
	if _run_abandon_in_flight:
		return
	var contact_id := ""
	if (
		str(_active_contact.get("actorId", "")) == str(actor_id)
		and not str(_active_contact.get("contactId", "")).is_empty()
		and not _contact_expired()
	):
		contact_id = str(_active_contact.get("contactId", ""))
		if not target.player_contact_is_ready(contact_id):
			return
		if not bool(_actor_view(str(actor_id)).get("playerConversationReady", false)):
			_pending_contact_ready_id = contact_id
			_hud.show_contact_approach(contact_id, str(actor_id))
			call_deferred("_queue_nearby_conversation_preloads")
			return
	if not bool(_actor_view(str(actor_id)).get("playerConversationReady", false)):
		# Defensive stale-input handling: reassert the explicit raw-aim demand
		# without opening a modal the runtime would reject as not ready.
		call_deferred("_queue_nearby_conversation_preloads")
		return
	_begin_conversation(actor_id, target, contact_id)


func _begin_conversation(
	actor_id: StringName,
	target: NPC3D,
	contact_id := ""
) -> void:
	if _run_status != "active":
		return
	if _hud.provider_failure_visible():
		return
	if _conversation_target != null or _resolving_answer or _ending_conversation:
		return
	if _hud.modal_mode() != HUD3D.ModalMode.NONE or _record_encounter_in_flight:
		if not contact_id.is_empty():
			_pending_contact_ready_id = contact_id
		return
	if (
		not contact_id.is_empty()
		and (not _contact_is_current(contact_id, str(actor_id)) or _contact_expired())
	):
		return
	var lifecycle_generation := _lifecycle_generation
	_conversation_target = target
	_conversation_contact_id = contact_id
	_conversation_contact_zone_id = (
		str(_active_contact.get("interactionZoneId", ""))
		if not contact_id.is_empty()
		else ""
	)
	_pending_contact_ready_id = ""
	if not contact_id.is_empty():
		target.cancel_player_contact()
		_hud.clear_contact_approach(contact_id)
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_conversation_start_retry_required = false
	if not _conversation_return_look_valid:
		_conversation_return_look = _player.look_orientation()
		_conversation_return_look_valid = true
	_player.face_position(target.global_position + Vector3.UP * 1.35)
	_player.set_control_enabled(false)
	_player.release_mouse()
	_hud.begin_conversation(_actor_view(str(actor_id)))
	get_tree().paused = true
	_spatial_facts_dirty = true
	# Preload resolution advances the runtime revision. Rebase identical current
	# engine facts before every HTTP start so ordinary and initiated conversations
	# consume the cached opening from the same spatial authority boundary.
	# Fixture replay deliberately skips the extra packet inside the settle helper.
	var advance_settled := await _settle_advance_lane_for_conversation(true)
	if lifecycle_generation != _lifecycle_generation or _run_status != "active":
		return
	if not advance_settled:
		_hud.show_conversation_error(&"hud.m3r.error.run_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	if not await _ensure_run():
		_hud.show_conversation_error(&"hud.m3r.error.run_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return
	if lifecycle_generation != _lifecycle_generation or _run_status != "active":
		return
	if not bool(_actor_view(str(actor_id)).get("playerConversationReady", false)):
		_advance_needs_rebase = true
		_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	_hud.begin_conversation(_actor_view(str(actor_id)))
	_conversation_start_in_flight = true
	var result: Dictionary = await _start_conversation_with_retry(
		str(actor_id),
		contact_id
	)
	_conversation_start_in_flight = false
	await _handle_conversation_start_result(result, lifecycle_generation)


func _handle_conversation_start_result(
	result: Dictionary,
	lifecycle_generation: int
) -> void:
	if lifecycle_generation != _lifecycle_generation or _run_status != "active":
		return
	if _present_provider_failure(result, "conversation_start"):
		_conversation_start_retry_required = true
		_hud.show_conversation_start_retry()
		return
	if _is_error(result):
		if str(result.get("error", "")) == "conversation_not_ready":
			var actor_id := (
				str(_conversation_target.actor_id) if _conversation_target != null else ""
			)
			var actor := _actor_view(actor_id)
			if not actor.is_empty():
				actor["playerConversationReady"] = false
				_update_run_actor(actor)
			_handle_recoverable_conversation_preload_error(
				actor_id,
				"conversation_not_ready"
			)
			if (
				not _conversation_contact_id.is_empty()
				and _contact_is_current(_conversation_contact_id, actor_id)
				and not _contact_expired()
			):
				# The resident already completed the physical approach before this
				# final opening race. Keep that lease pending while the authoritative
				# rebase and one bounded explicit-demand preload repair the opening.
				_pending_contact_ready_id = _conversation_contact_id
			# The world changed after a ready prompt but before the serialized
			# start. Return directly to exploration with the localized preparation
			# cue; an empty error modal would hide the useful retry state.
			_finish_conversation_modal()
			return
		if str(result.get("error", "")) == "conversation_start_retry_required":
			_conversation_start_retry_required = true
			_hud.show_conversation_start_retry()
			return
		_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	_resolve_provider_failure("conversation_start")
	_active_session_id = str(result.get("sessionId", ""))
	_active_turn = _dictionary_or_empty(result.get("nextTurn"))
	_apply_social_view_from_response(result)
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	_spatial_facts_dirty = true
	_run_snapshot["activeConversationId"] = _active_session_id
	_set_run_clock_paused(true)
	_update_run_actor(_dictionary_or_empty(result.get("actor")))
	_last_proposal_meta = _dictionary_or_empty(_active_turn.get("proposalMeta"))
	_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	if not _conversation_contact_id.is_empty():
		_clear_active_contact(false)
	if _active_session_id.is_empty() or _active_turn.is_empty() or not _hud.show_turn(_active_turn):
		_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()


func _start_conversation_with_retry(actor_id: String, contact_id := "") -> Dictionary:
	var interaction_zone_id := (
		_conversation_contact_zone_id
		if not contact_id.is_empty()
		else _conversation_zone_for_actor(actor_id)
	)
	if interaction_zone_id.is_empty():
		return {
			"error": "invalid_interaction",
			"message": "The resident has no conversation zone at their current location.",
		}
	var retry_seconds := 1.0
	for attempt in CONVERSATION_START_RETRY_ATTEMPTS:
		var result: Dictionary = await _run_session.start_conversation(
			_run_id,
			actor_id,
			interaction_zone_id,
			str(_run_snapshot.get("locale", _api_locale())),
			contact_id
		)
		if not _is_error(result):
			return result
		var error_code := str(result.get("error", ""))
		if _conversation_start_requires_fresh_spatial(result):
			# A preload/background commit can land between the accepted spatial
			# advance and this separate HTTP start. Keep the modal and cached
			# opening, refresh only engine facts, and retry without waiting on
			# provider work.
			if attempt >= CONVERSATION_START_RETRY_ATTEMPTS - 1:
				return result
			if not await _settle_advance_lane_for_conversation(true):
				return result
			continue
		if error_code != "conversation_start_failed":
			return result
		# The server may already have committed this start. RunService returns
		# the existing active turn for the same run/actor, so remain modal and
		# retry instead of orphaning a paused runtime conversation.
		if attempt < CONVERSATION_START_RETRY_ATTEMPTS - 1:
			_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
			await _pause_safe_timer(retry_seconds)
			retry_seconds = minf(8.0, retry_seconds * 2.0)
	return {"error": "conversation_start_retry_required"}


func _conversation_start_requires_fresh_spatial(result: Dictionary) -> bool:
	return str(result.get("error", "")) == "conversation_not_ready"


func _on_choice_submitted(choice_id: String) -> void:
	await _submit_answer({"type": "choice", "choiceId": choice_id})


func _on_free_input_submitted(text: String) -> void:
	await _submit_answer({"type": "free_input", "text": text.strip_edges()})


func _on_hesitation_expired() -> void:
	await _submit_answer({"type": "hesitation"})


func _submit_answer(answer_payload: Dictionary) -> void:
	if (
		_run_abandon_in_flight
		or _resolving_answer
		or _ending_conversation
		or _active_turn.is_empty()
	):
		return
	if str(_active_turn.get("procedure", "ordinary")) == "hearing":
		await _submit_hearing_answer(answer_payload)
		return
	if _active_session_id.is_empty() or _run_status != "active":
		return
	if not _required_retry_answer.is_empty() and answer_payload != _required_retry_answer:
		_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
		return

	_resolving_answer = true
	_hud.set_conversation_busy(true)
	var lifecycle_generation := _lifecycle_generation
	var result: Dictionary = await _run_session.answer(
		_run_id,
		_active_session_id,
		str(_active_turn.get("turnId", "")),
		answer_payload
	)
	_resolving_answer = false
	if lifecycle_generation != _lifecycle_generation or _run_status != "active":
		return
	if _present_provider_failure(
		result,
		"conversation_answer",
		{"answer": answer_payload.duplicate(true)}
	):
		_required_retry_answer = answer_payload.duplicate(true)
		_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
		return
	if _is_error(result):
		if _run_session.mode() == "fixture" and str(result.get("error", "")) == "fixture_replay_miss":
			_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
			await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
			_finish_conversation_modal()
			return
		_required_retry_answer = answer_payload.duplicate(true)
		_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
		if (
			str(answer_payload.get("type", "")) == "hesitation"
			and str(result.get("error", "")) == "conversation_answer_failed"
		):
			_schedule_hesitation_retry()
		return

	_resolve_provider_failure("conversation_answer")
	_required_retry_answer = {}
	_hesitation_retry_scheduled = false
	_apply_social_view_from_response(result)
	_cache_provider_evidence(result)
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	_spatial_facts_dirty = true
	_update_run_actor(_dictionary_or_empty(result.get("actor")))
	_last_proposal_meta = _dictionary_or_empty(result.get("proposalMeta"))
	_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	_run_snapshot["activeConversationId"] = _active_session_id
	_set_run_clock_paused(true)
	_hud.show_provider(_last_proposal_meta)
	_hud.show_judgment(_dictionary_or_empty(result.get("judgment")))
	_active_turn = _dictionary_or_empty(result.get("nextTurn"))
	if not _active_turn.is_empty():
		if not _hud.show_turn(_active_turn):
			_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		return
	_hud.clear_turn_controls()
	await _end_active_conversation()


func _schedule_hesitation_retry() -> void:
	if _hesitation_retry_scheduled:
		return
	_hesitation_retry_scheduled = true
	await _pause_safe_timer(1.0)
	_hesitation_retry_scheduled = false
	if (
		_run_status != "active"
		or _active_session_id.is_empty()
		or _active_turn.is_empty()
		or str(_required_retry_answer.get("type", "")) != "hesitation"
	):
		return
	await _submit_answer(_required_retry_answer.duplicate(true))


func _submit_hearing_answer(answer_payload: Dictionary) -> void:
	if (
		_run_abandon_in_flight
		or _resolving_answer
		or _run_status != "hearing_active"
		or _hearing_id.is_empty()
		or _active_turn.is_empty()
	):
		return
	if not _required_retry_answer.is_empty() and answer_payload != _required_retry_answer:
		_hud.show_conversation_error(&"hud.m3r.error.hearing_answer")
		return
	_resolving_answer = true
	_hud.set_conversation_busy(true)
	var result: Dictionary = await _run_session.answer_hearing(
		_run_id,
		_hearing_id,
		str(_active_turn.get("turnId", "")),
		answer_payload
	)
	_resolving_answer = false
	if _run_status != "hearing_active":
		return
	if _present_provider_failure(
		result,
		"hearing_answer",
		{"answer": answer_payload.duplicate(true)}
	):
		_required_retry_answer = answer_payload.duplicate(true)
		_hud.show_conversation_error(&"hud.m3r.error.hearing_answer")
		return
	if _is_error(result):
		_required_retry_answer = answer_payload.duplicate(true)
		_hud.show_conversation_error(&"hud.m3r.error.hearing_answer")
		return
	if (
		str(result.get("action", "")) != "answer"
		or str(result.get("hearingId", "")) != _hearing_id
		or str(result.get("runStatus", "")) != "terminal"
	):
		_required_retry_answer = answer_payload.duplicate(true)
		_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		return
	var terminal_candidate := _dictionary_or_empty(result.get("terminalResult"))
	if not _valid_terminal_result(terminal_candidate, _run_snapshot, _hearing_id):
		_required_retry_answer = answer_payload.duplicate(true)
		_present_client_contract_interruption(
			"hearing_answer",
			{"answer": answer_payload.duplicate(true)}
		)
		_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		return
	_resolve_provider_failure("hearing_answer")
	_required_retry_answer = {}
	_apply_social_view_from_response(result)
	_hydrate_run_lifecycle(result)
	_cache_provider_evidence(result)
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	_last_proposal_meta = _dictionary_or_empty(result.get("proposalMeta"))
	_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	_enter_terminal_outcome()


func _present_client_contract_interruption(
	retry_kind: String,
	retry_context: Dictionary
) -> void:
	_present_provider_failure({
		"providerFailure": {
			"profileId": str(_last_proposal_meta.get("profileId", "client-contract")),
			"reason": "invalid_envelope",
			"purpose": "hearing_verdict",
			"operationKey": "client:%s:%s:%s" % [
				retry_kind,
				_hearing_id,
				str(_active_turn.get("turnId", "")),
			],
		},
	}, retry_kind, retry_context)


func _valid_terminal_result(
	result: Dictionary,
	run_snapshot: Dictionary,
	expected_hearing_id := ""
) -> bool:
	if (
		result.is_empty()
		or str(result.get("hearingId", "")).is_empty()
		or (
			not expected_hearing_id.is_empty()
			and str(result.get("hearingId", "")) != expected_hearing_id
		)
		or str(result.get("verdict", "")) not in ["ordinary", "abnormal"]
		or str(result.get("verdictWhyLine", "")).strip_edges().is_empty()
		or str(result.get("officerLine", "")).strip_edges().is_empty()
		or str(result.get("finalDefense", "")).strip_edges().is_empty()
		or int(result.get("evidencedVouchCount", -1)) not in range(7)
		or not result.get("residentAssessments") is Array
		or (result.get("residentAssessments") as Array).size() != 6
		or not result.get("citedRecordIds") is Array
		or not result.get("citedLedgerEventIds") is Array
		or not result.get("recap") is Array
		or (result.get("recap") as Array).size() < 2
		or not result.get("proposalMeta") is Dictionary
	):
		return false
	var actor_memories: Dictionary = {}
	for actor_value in _array_or_empty(run_snapshot.get("actors")):
		if not actor_value is Dictionary:
			return false
		var actor := actor_value as Dictionary
		var actor_id := str(actor.get("actorId", ""))
		var memory_ids: Dictionary = {}
		for memory_value in _array_or_empty(actor.get("memories")):
			if not memory_value is Dictionary:
				return false
			var memory_id := str((memory_value as Dictionary).get("memoryId", ""))
			if memory_id.is_empty():
				return false
			memory_ids[memory_id] = true
		actor_memories[actor_id] = memory_ids
	var seen_actors: Dictionary = {}
	for assessment_value in result.get("residentAssessments") as Array:
		if not assessment_value is Dictionary:
			return false
		var assessment := assessment_value as Dictionary
		var actor_id := str(assessment.get("actorId", ""))
		if (
			actor_id not in HUD3D.OUTCOME_ACTOR_IDS
			or seen_actors.has(actor_id)
			or str(assessment.get("contactBasis", "")) not in [
				"meaningful_firsthand",
				"limited_firsthand",
				"never_conversed",
			]
			or str(assessment.get("proposedStance", "")) not in [
				"oppose", "uncertain", "vouch"
			]
			or str(assessment.get("appliedStance", "")) not in [
				"oppose", "uncertain", "vouch"
			]
			or str(assessment.get("testimonyLine", "")).strip_edges().is_empty()
			or not assessment.get("citedMemoryIds") is Array
			or not actor_memories.has(actor_id)
		):
			return false
		seen_actors[actor_id] = true
		for cited_id in assessment.get("citedMemoryIds") as Array:
			if (
				not cited_id is String
				or not (actor_memories[actor_id] as Dictionary).has(str(cited_id))
			):
				return false
	return seen_actors.size() == 6


func _on_conversation_end_retry_requested() -> void:
	if _run_abandon_in_flight:
		return
	if _conversation_start_retry_required and _active_session_id.is_empty():
		_conversation_start_retry_required = false
		_hud.set_conversation_busy(true)
		var actor_id := str(_conversation_target.actor_id) if _conversation_target != null else ""
		if actor_id.is_empty():
			_finish_conversation_modal()
			return
		_conversation_start_in_flight = true
		var result: Dictionary = await _start_conversation_with_retry(
			actor_id,
			_conversation_contact_id
		)
		_conversation_start_in_flight = false
		await _handle_conversation_start_result(result, _lifecycle_generation)
		return
	await _end_active_conversation()


func _end_active_conversation() -> void:
	if _ending_conversation or _active_session_id.is_empty():
		return
	_ending_conversation = true
	_hud.set_conversation_busy(true)
	var result: Dictionary = await _run_session.end_conversation(_run_id, _active_session_id)
	_ending_conversation = false
	if _is_error(result):
		_hud.show_conversation_error(&"hud.m3r.error.conversation_end", true)
		return
	_apply_social_view_from_response(result)
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	_spatial_facts_dirty = true
	_run_snapshot["activeConversationId"] = null
	_set_run_clock_paused(false)
	_update_run_actor(_dictionary_or_empty(result.get("actor")))
	_apply_conversation_end_deltas_once(
		_active_session_id,
		int(result.get("worldRevision", 0)),
		_array_or_empty(result.get("queuedRunDeltas"))
	)
	_advance_needs_rebase = true
	await _rebase_run_after_advance_conflict()
	_hud.set_conversation_busy(false)
	_hud.show_conversation_ended()
	await _pause_safe_timer(CONVERSATION_END_HOLD_SECONDS)
	_finish_conversation_modal()


func _ensure_run() -> bool:
	if not _run_id.is_empty():
		return true
	while _run_start_in_flight:
		await get_tree().process_frame
		if not _run_id.is_empty():
			return true
	_run_start_in_flight = true
	if _run_start_locale.is_empty():
		_run_start_locale = str(_localization.call("api_locale", _locale_name))
		if _run_start_locale.is_empty():
			_run_start_in_flight = false
			_run_start_last_error = {
				"error": "run_start_invalid_locale",
				"message": "The selected presentation locale has no API locale mapping.",
			}
			return false
		_hud.set_language_applies_next_run(true)
	if _run_start_id.is_empty():
		_run_start_id = (
			"run-fixture-start-1"
			if _run_session.mode() == "fixture"
			else "godot-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]
		)
	var result: Dictionary = await _run_session.start_run(_run_start_locale, _run_start_id)
	_run_start_in_flight = false
	if (
		str(result.get("error", "")) == "provider_failed"
		and _present_provider_failure(result, "run_start")
	):
		_run_start_last_error = result.duplicate(true)
		_run_start_halted_reason = "provider_failed"
		return false
	if _is_error(result):
		_run_start_last_error = result.duplicate(true)
		return false
	if str(result.get("locale", "")) != _run_start_locale:
		_run_start_last_error = {
			"error": "run_start_locale_mismatch",
			"message": "RunService returned a different locale than the locked start locale.",
		}
		_run_start_halted_reason = "locale_mismatch"
		return false
	var town_snapshot := _town.presentation_snapshot()
	if (
		str(result.get("worldId", "")) != str(town_snapshot.get("layoutId", ""))
		or str(result.get("layoutRevision", "")) != str(town_snapshot.get("worldRevision", ""))
	):
		push_error("RunService topology does not match the loaded 3D town.")
		_run_start_halted_reason = "topology_mismatch"
		return false
	_run_id = str(result.get("runId", ""))
	if _run_id.is_empty():
		_run_start_last_error = {
			"error": "run_start_missing_id",
			"message": "RunService returned no runId.",
		}
		return false
	_resolve_provider_failure("run_start")
	_sync_provider_failure_marker(result)
	_run_start_last_error = {}
	_run_start_attempts = 0
	_fixture_replay_complete = false
	_replace_run_snapshot(result, false)
	_apply_player_brief_from_snapshot(result)
	_cache_provider_evidence(result)
	_hydrate_run_lifecycle(result)
	_social_view = {}
	_apply_social_view_from_response(result)
	_spatial_facts_dirty = true
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	_ingest_ambient_snapshot(result)
	_apply_all_conversation_readiness()
	var scheduler := _dictionary_or_empty(result.get("scheduler"))
	_reconcile_ambient_goal_wakes(scheduler)
	_reconcile_scheduler_movements(scheduler)
	_queue_nearby_conversation_preloads()
	if _run_status == "hearing_due":
		_enter_hearing_due()
	elif _run_status == "terminal" and not _terminal_result.is_empty():
		_enter_terminal_outcome()
	return true


func _actor_view(actor_id: String) -> Dictionary:
	for actor_value in _run_snapshot.get("actors", []):
		if actor_value is Dictionary and str((actor_value as Dictionary).get("actorId", "")) == actor_id:
			return (actor_value as Dictionary).duplicate(true)
	return {"actorId": actor_id}


func _conversation_readiness(snapshot: Dictionary) -> Dictionary:
	var readiness: Dictionary = {}
	for actor_value in snapshot.get("actors", []):
		if not actor_value is Dictionary:
			continue
		var actor := actor_value as Dictionary
		readiness[str(actor.get("actorId", ""))] = bool(
			actor.get("playerConversationReady", false)
		)
	return readiness


func _update_run_actor(actor: Dictionary) -> void:
	if actor.is_empty():
		return
	_apply_actor_conversation_readiness(actor)
	var actors_value: Variant = _run_snapshot.get("actors", [])
	if not actors_value is Array:
		return
	var actors := actors_value as Array
	for index in actors.size():
		var current: Variant = actors[index]
		if current is Dictionary and str((current as Dictionary).get("actorId", "")) == str(actor.get("actorId", "")):
			actors[index] = actor.duplicate(true)
			return


func _conversation_zone_for_actor(actor_id: String) -> String:
	var actor := _actor_view(actor_id)
	if actor.is_empty():
		return ""
	return _town.conversation_zone_id(actor_id, str(actor.get("locationId", "")))


func _queue_nearby_conversation_preloads() -> void:
	if _run_status != "active":
		return
	if _run_session.mode() == "fixture":
		var fixture_contact_actor_id := str(_active_contact.get("actorId", ""))
		var fixture_contact_id := str(_active_contact.get("contactId", ""))
		var fixture_aimed_actor_id := _preload_intent_npc_actor_id()
		_sync_conversation_preload_demands(
			fixture_contact_actor_id,
			fixture_contact_id,
			fixture_aimed_actor_id
		)
		for actor_value in _run_snapshot.get("actors", []):
			if not actor_value is Dictionary:
				continue
			var fixture_actor := actor_value as Dictionary
			if bool(fixture_actor.get("playerConversationReady", false)):
				continue
			var fixture_actor_id := str(fixture_actor.get("actorId", ""))
			var fixture_explicit_demand := (
				fixture_actor_id == fixture_contact_actor_id
				or fixture_actor_id == fixture_aimed_actor_id
			)
			var fixture_cycle_kind := ""
			if (
				fixture_explicit_demand
				and _conversation_preload_invalidation_demand_available(fixture_actor_id)
			):
				fixture_cycle_kind = "invalidated"
			elif (
				fixture_explicit_demand
				and _conversation_preload_recovery_demand_available(fixture_actor_id)
			):
				fixture_cycle_kind = "recovery"
			if (
				not _conversation_preload_attempted.has(fixture_actor_id)
				or not fixture_cycle_kind.is_empty()
			):
				_queue_conversation_preload(fixture_actor_id, 0, fixture_cycle_kind)
		_pump_conversation_preloads()
		return
	var candidates: Array[Dictionary] = []
	var nearby_now: Dictionary = {}
	for actor_value in _run_snapshot.get("actors", []):
		if not actor_value is Dictionary:
			continue
		var actor := actor_value as Dictionary
		var actor_id := str(actor.get("actorId", ""))
		if not _conversation_preload_is_nearby(actor_id):
			continue
		nearby_now[actor_id] = true
		var actor_node := _town.get_node_or_null("Actors/%s" % actor_id) as Node3D
		if actor_node == null:
			continue
		candidates.append({
			"actorId": actor_id,
			"distance": _horizontal_distance(actor_node.global_position, _player.global_position),
		})
	candidates.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var distance_a := float(a.get("distance", INF))
		var distance_b := float(b.get("distance", INF))
		if is_equal_approx(distance_a, distance_b):
			return str(a.get("actorId", "")) < str(b.get("actorId", ""))
		return distance_a < distance_b
	)
	var previous_priority := _conversation_preload_priority_actor_id
	var selected_priority := ""
	var contact_actor_id := str(_active_contact.get("actorId", ""))
	var contact_id := str(_active_contact.get("contactId", ""))
	var aimed_actor_id := _preload_intent_npc_actor_id()
	_sync_conversation_preload_demands(contact_actor_id, contact_id, aimed_actor_id)
	if not contact_actor_id.is_empty() and nearby_now.has(contact_actor_id):
		selected_priority = contact_actor_id
	elif not aimed_actor_id.is_empty() and nearby_now.has(aimed_actor_id):
		selected_priority = aimed_actor_id
	elif not candidates.is_empty():
		var closest := candidates[0]
		selected_priority = str(closest.get("actorId", ""))
		if nearby_now.has(previous_priority):
			var previous_distance := INF
			for candidate in candidates:
				if str(candidate.get("actorId", "")) == previous_priority:
					previous_distance = float(candidate.get("distance", INF))
					break
			if (
				str(closest.get("actorId", "")) == previous_priority
				or (
					float(closest.get("distance", INF))
					+ CONVERSATION_PRELOAD_SWITCH_MARGIN_M
				) >= previous_distance
			):
				selected_priority = previous_priority
	_conversation_preload_priority_actor_id = selected_priority
	if not selected_priority.is_empty():
		var selected_actor := _actor_view(selected_priority)
		if bool(selected_actor.get("playerConversationReady", false)):
			_clear_conversation_preload_failure_state(selected_priority)
			_conversation_preload_invalidated.erase(selected_priority)
		else:
			var explicit_demand := (
				selected_priority == contact_actor_id
				or selected_priority == aimed_actor_id
			)
			var invalidated_cycle := (
				explicit_demand
				and _conversation_preload_invalidation_demand_available(
					selected_priority
				)
			)
			var recovery_cycle := (
				explicit_demand
				and _conversation_preload_recovery_demand_available(selected_priority)
			)
			var should_queue := not _conversation_preload_attempted.has(selected_priority)
			should_queue = should_queue or invalidated_cycle or recovery_cycle
			if should_queue:
				var cycle_kind := ""
				if invalidated_cycle:
					cycle_kind = "invalidated"
				elif recovery_cycle:
					cycle_kind = "recovery"
				# Eligibility is consumed only when this entry really dispatches.
				# Losing aim/contact, priority, or proximity while queued therefore
				# leaves the actor recoverable instead of stranding it.
				_queue_conversation_preload(selected_priority, 0, cycle_kind)
	_pump_conversation_preloads()


func _queue_conversation_preload(
	actor_id: String,
	transport_retry_count := 0,
	cycle_kind := ""
) -> bool:
	if (
		_run_abandon_in_flight
		or _run_status != "active"
		or actor_id.is_empty()
		or _run_id.is_empty()
	):
		return false
	var actor := _actor_view(actor_id)
	if (
		actor.is_empty()
		or bool(actor.get("playerConversationReady", false))
		or not _conversation_preload_is_nearby(actor_id)
		or not _conversation_preload_is_priority(actor_id)
	):
		return false
	if _conversation_preload_in_flight.has(actor_id):
		_conversation_preload_requeue_requested[actor_id] = true
		if not cycle_kind.is_empty():
			_conversation_preload_requeue_cycle_kinds[actor_id] = cycle_kind
		return true
	if _conversation_preload_queued.has(actor_id):
		if not cycle_kind.is_empty():
			_conversation_preload_queued_cycle_kinds[actor_id] = cycle_kind
			_conversation_preload_retry_queued.erase(actor_id)
		return true
	_conversation_preload_queued[actor_id] = true
	if transport_retry_count > 0:
		_conversation_preload_retry_queued[actor_id] = transport_retry_count
	if not cycle_kind.is_empty():
		_conversation_preload_queued_cycle_kinds[actor_id] = cycle_kind
	_conversation_preload_queue.append(actor_id)
	_pump_conversation_preloads()
	return true


func _pump_conversation_preloads() -> void:
	if (
		_run_abandon_in_flight
		or _run_status != "active"
		or get_tree().paused
		or _conversation_target != null
	):
		return
	if (
		_run_session.mode() != "fixture"
		and _conversation_preload_in_flight.is_empty()
		and _conversation_preload_refresh_required
	):
		_conversation_preload_refresh_required = false
		_advance_needs_rebase = true
		if not _advance_rebase_in_flight:
			call_deferred("_rebase_run_after_advance_conflict")
		return
	if _conversation_preload_rebase_blocked():
		return
	while (
		_conversation_preload_in_flight.size() < CONVERSATION_PRELOAD_MAX_IN_FLIGHT
	):
		var actor_id := _take_next_conversation_preload_dispatch()
		if actor_id.is_empty():
			break
		_dispatch_conversation_preload(actor_id)
	if (
		_run_session.mode() == "fixture"
		and _conversation_preload_in_flight.is_empty()
		and _conversation_preload_queue.is_empty()
		and _conversation_preload_refresh_required
	):
		_conversation_preload_refresh_required = false
		_advance_needs_rebase = true
		call_deferred("_rebase_run_after_advance_conflict")


func _conversation_preload_rebase_blocked() -> bool:
	return _advance_needs_rebase or _advance_rebase_in_flight


func _take_next_conversation_preload_dispatch() -> String:
	# Queue admission is intentionally separate from dispatch. A queued actor
	# survives an authoritative rebase barrier, and all cycle eligibility is
	# consumed only when this helper returns that actor to the real transport.
	if (
		_conversation_preload_rebase_blocked()
		or _conversation_preload_in_flight.size()
		>= CONVERSATION_PRELOAD_MAX_IN_FLIGHT
	):
		return ""
	while not _conversation_preload_queue.is_empty():
		var actor_id: String = _conversation_preload_queue.pop_front()
		_conversation_preload_queued.erase(actor_id)
		var transport_retry_count := int(
			_conversation_preload_retry_queued.get(actor_id, 0)
		)
		_conversation_preload_retry_queued.erase(actor_id)
		var cycle_kind := str(_conversation_preload_queued_cycle_kinds.get(actor_id, ""))
		_conversation_preload_queued_cycle_kinds.erase(actor_id)
		if (
			bool(_actor_view(actor_id).get("playerConversationReady", false))
			or not _conversation_preload_is_nearby(actor_id)
			or not _conversation_preload_is_priority(actor_id)
			or (
				not cycle_kind.is_empty()
				and not _conversation_preload_has_explicit_demand(actor_id)
			)
		):
			if (
				transport_retry_count > 0
				and int(_conversation_preload_retries.get(actor_id, 0))
				== transport_retry_count
			):
				_mark_conversation_preload_recovery_required(
					actor_id,
					"transport_retry_dropped"
				)
			continue
		if cycle_kind == "invalidated":
			if not _consume_conversation_preload_invalidation_demand(actor_id):
				continue
		elif cycle_kind == "recovery":
			if not _consume_conversation_preload_recovery_demand(actor_id):
				continue
		_conversation_preload_attempted[actor_id] = true
		_conversation_preload_in_flight[actor_id] = true
		return actor_id
	return ""


func _dispatch_conversation_preload(actor_id: String) -> void:
	var interaction_zone_id := _conversation_zone_for_actor(actor_id)
	if interaction_zone_id.is_empty():
		_conversation_preload_in_flight.erase(actor_id)
		_mark_conversation_preload_recovery_required(
			actor_id,
			"interaction_zone_unavailable"
		)
		call_deferred("_pump_conversation_preloads")
		return
	var result: Dictionary = await _run_session.preload_conversation(
		_run_id,
		actor_id,
		interaction_zone_id,
		str(_run_snapshot.get("locale", _api_locale()))
	)
	_conversation_preload_in_flight.erase(actor_id)
	if _run_status != "active":
		return
	var transport_retry_scheduled := false
	if _present_provider_failure(
		result,
		"conversation_preload",
		{"actorId": actor_id}
	):
		_mark_conversation_preload_recovery_required(actor_id, "provider_failed")
	elif not _is_error(result):
		_resolve_provider_failure("conversation_preload", {"actorId": actor_id})
		_cache_provider_evidence(result, "preload")
		_clear_conversation_preload_failure_state(actor_id)
		_conversation_preload_refresh_required = true
		var current_revision := int(_run_snapshot.get("worldRevision", 0))
		var response_revision := int(result.get("worldRevision", 0))
		if response_revision < current_revision:
			# A newer movement/evidence delta may already have invalidated this
			# actor. Rebase instead of letting the late opening re-enable it, and
			# retain an explicit-demand retry path if the authoritative snapshot
			# confirms that the actor is still unready.
			_conversation_preload_invalidated[actor_id] = true
			_advance_needs_rebase = true
		else:
			_run_snapshot["worldRevision"] = response_revision
			_spatial_facts_dirty = true
			_update_run_actor(_dictionary_or_empty(result.get("actor")))
			_last_proposal_meta = _dictionary_or_empty(result.get("proposalMeta"))
			_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
			if (
				actor_id == str(_active_contact.get("actorId", ""))
				and bool(_actor_view(actor_id).get("playerConversationReady", false))
			):
				# A physically ready contact may have been waiting on this opening.
				# Reuse the same pending contact id as soon as both halves are ready.
				call_deferred("_try_open_pending_contact")
	elif _handle_recoverable_conversation_preload_error(
		actor_id,
		str(result.get("error", ""))
	):
		pass
	elif str(result.get("error", "")) == "conversation_preload_failed":
		var retry_count := int(_conversation_preload_retries.get(actor_id, 0)) + 1
		_conversation_preload_retries[actor_id] = retry_count
		if retry_count <= CONVERSATION_PRELOAD_MAX_RETRIES:
			transport_retry_scheduled = true
			_retry_conversation_preload(
				actor_id,
				CONVERSATION_PRELOAD_RETRY_SECONDS * pow(2.0, retry_count - 1),
				retry_count
			)
		else:
			_mark_conversation_preload_recovery_required(
				actor_id,
				"transport_retry_exhausted"
			)
	if _conversation_preload_requeue_requested.has(actor_id):
		_conversation_preload_requeue_requested.erase(actor_id)
		var requeue_cycle_kind := str(
			_conversation_preload_requeue_cycle_kinds.get(actor_id, "")
		)
		_conversation_preload_requeue_cycle_kinds.erase(actor_id)
		if (
			not transport_retry_scheduled
			and not bool(_actor_view(actor_id).get("playerConversationReady", false))
		):
			call_deferred(
				"_queue_conversation_preload",
				actor_id,
				0,
				requeue_cycle_kind
			)
	call_deferred("_pump_conversation_preloads")


func _retry_conversation_preload(
	actor_id: String,
	delay_seconds: float,
	retry_count: int
) -> void:
	await _pause_safe_timer(delay_seconds)
	# A semantic invalidation or an explicit recovery may have started a newer
	# cycle while this timer was waiting. Never let its old retry leak across.
	if int(_conversation_preload_retries.get(actor_id, 0)) != retry_count:
		return
	if not _queue_conversation_preload(actor_id, retry_count):
		_mark_conversation_preload_recovery_required(
			actor_id,
			"transport_retry_dropped"
		)


func _mark_conversation_preload_recovery_required(
	actor_id: String,
	reason: String
) -> void:
	if actor_id.is_empty():
		return
	_conversation_preload_retries.erase(actor_id)
	_conversation_preload_retry_queued.erase(actor_id)
	_conversation_preload_requeue_requested.erase(actor_id)
	_conversation_preload_requeue_cycle_kinds.erase(actor_id)
	_conversation_preload_recovery_required[actor_id] = reason
	_apply_actor_conversation_readiness(_actor_view(actor_id))
	# Passive proximity remains spent after the first dispatch. A currently
	# aimed actor or active contact may consume one recovery for its current
	# demand epoch; another cycle needs a new aim/contact episode.
	call_deferred("_queue_nearby_conversation_preloads")


func _clear_conversation_preload_failure_state(actor_id: String) -> void:
	_conversation_preload_retries.erase(actor_id)
	_conversation_preload_retry_queued.erase(actor_id)
	_conversation_preload_recovery_required.erase(actor_id)


func _handle_recoverable_conversation_preload_error(
	actor_id: String,
	error_code: String
) -> bool:
	if error_code != "conversation_not_ready" or actor_id.is_empty():
		return false
	# The runtime rejected an opening whose actor, zone, or evidence changed
	# before commit. Rebase before considering a fresh explicit-demand cycle;
	# the consumed invalidation epoch prevents held aim/contact from looping.
	_conversation_preload_retries.erase(actor_id)
	_conversation_preload_retry_queued.erase(actor_id)
	_conversation_preload_recovery_required.erase(actor_id)
	_conversation_preload_invalidated[actor_id] = true
	_apply_actor_conversation_readiness(_actor_view(actor_id))
	_advance_needs_rebase = true
	return true


func _sync_conversation_preload_demands(
	contact_actor_id: String,
	contact_id: String,
	aimed_actor_id: String
) -> void:
	var next_signatures: Dictionary = {}
	if not contact_actor_id.is_empty():
		next_signatures[contact_actor_id] = "contact:%s" % contact_id
	if not aimed_actor_id.is_empty():
		var signature := str(next_signatures.get(aimed_actor_id, ""))
		next_signatures[aimed_actor_id] = (
			"aim" if signature.is_empty() else "%s|aim" % signature
		)
	for actor_id_value in next_signatures:
		var actor_id := str(actor_id_value)
		var next_signature := str(next_signatures.get(actor_id, ""))
		if str(_conversation_preload_demand_signatures.get(actor_id, "")) == next_signature:
			continue
		_conversation_preload_demand_epochs[actor_id] = int(
			_conversation_preload_demand_epochs.get(actor_id, 0)
		) + 1
	_conversation_preload_demand_signatures = next_signatures


func _conversation_preload_has_explicit_demand(actor_id: String) -> bool:
	return not str(
		_conversation_preload_demand_signatures.get(actor_id, "")
	).is_empty()


func _conversation_preload_recovery_demand_available(actor_id: String) -> bool:
	if (
		not _conversation_preload_recovery_required.has(actor_id)
		or not _conversation_preload_has_explicit_demand(actor_id)
	):
		return false
	var demand_epoch := int(_conversation_preload_demand_epochs.get(actor_id, 0))
	return demand_epoch > int(
		_conversation_preload_recovery_demand_epochs.get(actor_id, 0)
	)


func _conversation_preload_invalidation_demand_available(actor_id: String) -> bool:
	if (
		not _conversation_preload_invalidated.has(actor_id)
		or not _conversation_preload_has_explicit_demand(actor_id)
	):
		return false
	var demand_epoch := int(_conversation_preload_demand_epochs.get(actor_id, 0))
	return demand_epoch > int(
		_conversation_preload_invalidation_demand_epochs.get(actor_id, 0)
	)


func _consume_conversation_preload_invalidation_demand(actor_id: String) -> bool:
	if not _conversation_preload_invalidation_demand_available(actor_id):
		return false
	var demand_epoch := int(_conversation_preload_demand_epochs.get(actor_id, 0))
	_conversation_preload_invalidation_demand_epochs[actor_id] = demand_epoch
	_conversation_preload_invalidated.erase(actor_id)
	_conversation_preload_retries.erase(actor_id)
	_conversation_preload_retry_queued.erase(actor_id)
	_conversation_preload_recovery_required.erase(actor_id)
	_conversation_preload_recovery_demand_epochs.erase(actor_id)
	return true


func _consume_conversation_preload_recovery_demand(actor_id: String) -> bool:
	if not _conversation_preload_recovery_demand_available(actor_id):
		return false
	var demand_epoch := int(_conversation_preload_demand_epochs.get(actor_id, 0))
	_conversation_preload_recovery_demand_epochs[actor_id] = demand_epoch
	_conversation_preload_recovery_required.erase(actor_id)
	_conversation_preload_retries.erase(actor_id)
	_conversation_preload_retry_queued.erase(actor_id)
	return true


func _conversation_preload_is_nearby(actor_id: String) -> bool:
	if _run_session.mode() == "fixture":
		return true
	if (
		actor_id.is_empty()
		or _active_movements.has(actor_id)
		or _blocked_movements.has(actor_id)
	):
		return false
	var actor_node := _town.get_node_or_null("Actors/%s" % actor_id) as Node3D
	if actor_node == null:
		return false
	if str(_active_contact.get("actorId", "")) == actor_id:
		return true
	return _horizontal_distance(
		actor_node.global_position,
		_player.global_position
	) <= CONVERSATION_PRELOAD_DISTANCE_M


func _conversation_preload_is_priority(actor_id: String) -> bool:
	if _run_session.mode() == "fixture":
		return true
	return (
		actor_id == _conversation_preload_priority_actor_id
		or actor_id == str(_active_contact.get("actorId", ""))
	)


func _preload_intent_npc_actor_id() -> String:
	var target: Node = _player.preload_intent_target()
	if not target is NPC3D:
		return ""
	return str((target as NPC3D).actor_id)


func _on_player_focus_changed(target: Node) -> void:
	_hud.set_focus(target)
	_player_focus_attention_target = target
	_sync_player_attention_holds()
	if target is NPC3D:
		(target as NPC3D).face_position(_player.global_position)
	if _run_session.mode() == "fixture" or _run_id.is_empty():
		return
	# Focus acquisition/removal can be the material change that makes an already
	# prepared resident talkable. Refresh the next batched engine observation so
	# RunService never decides a due route from pre-focus spatial facts.
	_spatial_facts_dirty = true


func _sync_player_attention_holds() -> void:
	var focused: Node = (
		_player_focus_attention_target
		if is_instance_valid(_player_focus_attention_target)
		else null
	)
	var preload_intent: Node = (
		_player_preload_attention_target
		if is_instance_valid(_player_preload_attention_target)
		else null
	)
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if not actor_value is NPC3D or not _town.is_ancestor_of(actor_value as NPC3D):
			continue
		var actor := actor_value as NPC3D
		actor.set_player_attention_hold(actor == focused or actor == preload_intent)


func _on_player_preload_intent_changed(target: Node) -> void:
	_player_preload_attention_target = target
	_hud.set_preload_target(target)
	_sync_player_attention_holds()
	if _run_session.mode() == "fixture" or _run_id.is_empty():
		return
	_spatial_facts_dirty = true
	call_deferred("_queue_nearby_conversation_preloads")


func _horizontal_distance(first: Vector3, second: Vector3) -> float:
	return Vector2(first.x, first.z).distance_to(Vector2(second.x, second.z))


func _initialize_run_background() -> void:
	while _run_id.is_empty() and _run_start_halted_reason.is_empty():
		if await _ensure_run():
			return
		_run_start_attempts += 1
		var retry_seconds := minf(
			RUN_START_RETRY_MAX_SECONDS,
			RUN_START_RETRY_MIN_SECONDS * pow(2.0, minf(_run_start_attempts - 1, 3))
		)
		await _pause_safe_timer(retry_seconds)


func _prepare_advance_request(force_spatial_only := false) -> void:
	if not _pending_advance_request.is_empty() or _run_id.is_empty():
		return
	var prop_only_advance := not _queued_prop_events.is_empty()
	var elapsed_seconds := (
		0
		if prop_only_advance or not _queued_arrivals.is_empty()
		else mini(int(floor(_advance_elapsed_buffer)), ADVANCE_MAX_SECONDS)
	)
	var arrivals: Array[Dictionary] = []
	var selected_actor_ids: Dictionary = {}
	if not prop_only_advance:
		_queued_arrivals.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			var actor_compare := str(a.get("actorId", "")) < str(b.get("actorId", ""))
			if str(a.get("actorId", "")) == str(b.get("actorId", "")):
				return str(a.get("movementId", "")) < str(b.get("movementId", ""))
			return actor_compare
		)
		var queued_arrival_count := _queued_arrivals.size()
		for _index in queued_arrival_count:
			var arrival := _queued_arrivals.pop_front() as Dictionary
			var arrival_actor_id := str(arrival.get("actorId", ""))
			if (
				arrivals.size() < ADVANCE_MAX_ARRIVALS
				and not selected_actor_ids.has(arrival_actor_id)
			):
				arrivals.append(arrival)
				selected_actor_ids[arrival_actor_id] = true
				_arrival_batch_movement_ids.erase(str(arrival.get("movementId", "")))
			else:
				_queued_arrivals.append(arrival)
		_arrival_batch_remaining = (
			ARRIVAL_BATCH_SECONDS if not _queued_arrivals.is_empty() else -1.0
		)
	var prop_events: Array[Dictionary] = []
	if prop_only_advance:
		for _index in mini(ADVANCE_MAX_PROP_EVENTS, _queued_prop_events.size()):
			prop_events.append(_queued_prop_events.pop_front())
	if (
		elapsed_seconds <= 0
		and arrivals.is_empty()
		and prop_events.is_empty()
		and not force_spatial_only
	):
		return
	var observed_world_revision := int(_run_snapshot.get("worldRevision", 0))
	for event in prop_events:
		event["observedWorldRevision"] = mini(
			int(event.get("observedWorldRevision", observed_world_revision)),
			observed_world_revision
		)
	var spatial_facts_packet: Dictionary = {}
	if (
		not prop_only_advance
		and (
			_spatial_facts_dirty
			or not arrivals.is_empty()
			or not _active_movements.is_empty()
		)
	):
		spatial_facts_packet = _capture_spatial_facts(observed_world_revision)
		if spatial_facts_packet.is_empty():
			for arrival in arrivals:
				_queued_arrivals.append(arrival.duplicate(true))
				_arrival_batch_movement_ids[str(arrival.get("movementId", ""))] = true
			if not _queued_arrivals.is_empty():
				_arrival_batch_remaining = 0.0
			return
	_advance_elapsed_buffer = maxf(0.0, _advance_elapsed_buffer - elapsed_seconds)
	_advance_sequence += 1
	_pending_advance_request = {
		"runId": _run_id,
		"advanceId": "%s:advance:%06d" % [_run_id, _advance_sequence],
		"observedWorldRevision": observed_world_revision,
		"afterSpeechSeq": _ambient_speech_cursor,
		"elapsedSeconds": elapsed_seconds,
		"arrivals": arrivals,
	}
	if not prop_events.is_empty():
		_pending_advance_request["propHandlingEvents"] = prop_events.duplicate(true)
	if not spatial_facts_packet.is_empty():
		_pending_advance_request["spatialFacts"] = spatial_facts_packet.duplicate(true)
		_last_spatial_facts_packet = spatial_facts_packet.duplicate(true)
		_spatial_facts_dirty = false


func _dispatch_advance() -> void:
	if _advance_in_flight or _pending_advance_request.is_empty():
		return
	_advance_in_flight = true
	var request := _pending_advance_request.duplicate(true)
	var result: Dictionary = await _run_session.advance(request)
	_advance_in_flight = false
	if _run_status != "active":
		_pending_advance_request = {}
		return
	if request != _pending_advance_request:
		push_error("Run advance lane changed an immutable in-flight packet.")
		_advance_lane_halted_reason = "in_flight_packet_changed"
		return
	if not _is_error(result):
		_pending_advance_request = {}
		_advance_retry_remaining = 0.0
		_apply_advance_response(result)
		return
	var error_code := str(result.get("error", "run_advance_failed"))
	match error_code:
		"run_advance_failed":
			# The server may have committed an ambiguous transport failure. Keep
			# this exact ID and payload until its idempotent response is known.
			_advance_retry_remaining = ADVANCE_RETRY_SECONDS
		"stale_world_revision", "run_paused":
			var rejected_request := _pending_advance_request.duplicate(true)
			_pending_advance_request = {}
			_restore_advance_request(rejected_request)
			_advance_needs_rebase = true
		"advance_id_conflict":
			_advance_lane_halted_reason = error_code
			push_error("Run advance ID conflicted with a different payload; lane halted.")
		"invalid_prop_event", "prop_event_id_conflict":
			if request.has("propHandlingEvents"):
				# The rejection is authoritative, but a noncritical physical fact must
				# not permanently stop clock, movement, or arrival advancement.
				_pending_advance_request = {}
				_advance_retry_remaining = 0.0
				_last_prop_event_rejection = error_code
				push_warning("RunService rejected physical prop events: %s" % error_code)
			else:
				_advance_lane_halted_reason = error_code
		"fixture_advance_miss":
			if _run_session.mode() == "fixture" and request.has("propHandlingEvents"):
				# Fixture mode cannot invent engine-dependent NPC memory. Keep the
				# physical interaction playable and leave authoritative proof to HTTP.
				_pending_advance_request = {}
				_advance_retry_remaining = 0.0
				push_warning("Fixture replay ignored a live physical-prop observation.")
			else:
				_advance_lane_halted_reason = error_code
				push_error("Fixture advance packet did not match its generated response.")
		"fixture_replay_complete":
			if _run_session.mode() == "fixture":
				_pending_advance_request = {}
				_advance_retry_remaining = 0.0
				_advance_needs_rebase = false
				_advance_lane_halted_reason = ""
				_fixture_replay_complete = true
			else:
				_advance_lane_halted_reason = error_code
				push_error("HTTP run advance lane returned fixture-only completion.")
		_:
			_advance_lane_halted_reason = error_code
			push_error("Run advance lane halted: %s" % error_code)


func _restore_advance_request(request: Dictionary) -> void:
	if request.is_empty():
		return
	_advance_elapsed_buffer += float(request.get("elapsedSeconds", 0))
	var arrivals_value: Variant = request.get("arrivals", [])
	if arrivals_value is Array:
		for arrival_value in arrivals_value:
			if arrival_value is Dictionary and not _arrival_is_queued(
				str((arrival_value as Dictionary).get("movementId", ""))
			):
				_queued_arrivals.append((arrival_value as Dictionary).duplicate(true))
	if not _queued_arrivals.is_empty():
		_arrival_batch_remaining = 0.0
	if request.has("spatialFacts"):
		_spatial_facts_dirty = true
	var prop_events := _array_or_empty(request.get("propHandlingEvents"))
	for index in range(prop_events.size() - 1, -1, -1):
		var event_value: Variant = prop_events[index]
		if not event_value is Dictionary:
			continue
		var event := event_value as Dictionary
		var event_id := str(event.get("eventId", ""))
		if not _prop_event_is_queued(event_id):
			_queued_prop_events.push_front(event.duplicate(true))


func _apply_advance_response(result: Dictionary) -> void:
	var current_revision := int(_run_snapshot.get("worldRevision", 0))
	var response_revision := int(result.get("worldRevision", current_revision))
	if response_revision < current_revision:
		# Every field below is derived from the response's world revision. In
		# particular, schedule wakes can spend provider work immediately, ambient
		# speech mutates encounter state, and social/contact data can supersede
		# newer local presentation. Apply none of them until a snapshot rebases the
		# client onto authoritative state.
		_advance_needs_rebase = true
		return
	_apply_social_view_from_response(result)
	_last_accepted_prop_event_ids = _array_or_empty(result.get("acceptedPropEventIds"))
	_last_prop_observation_memories = _array_or_empty(result.get("propObservationMemories"))
	if not _last_accepted_prop_event_ids.is_empty():
		_last_prop_event_rejection = ""
	_ingest_ambient_speech_events(_array_or_empty(result.get("ambientSpeechEvents")))
	_ambient_speech_cursor = maxi(
		_ambient_speech_cursor,
		int(result.get("ambientSpeechCursor", 0))
	)
	_recent_schedule_wakes = _array_or_empty(result.get("scheduleWakes"))
	for wake_value in _recent_schedule_wakes:
		if (
			wake_value is Dictionary
			and str((wake_value as Dictionary).get("kind", "")) == "actor_schedule"
		):
			# A schedule can change goals without issuing movement when two
			# semantic anchors share one physical point. Refresh the engine facts
			# so the runtime can emit that goal on the next material packet.
			_spatial_facts_dirty = true
			break
	_queue_ambient_decision_wakes(_recent_schedule_wakes)
	_run_snapshot["worldRevision"] = maxi(current_revision, response_revision)
	var response_clock := _dictionary_or_empty(result.get("clock"))
	var world_clock := _dictionary_or_empty(_run_snapshot.get("worldClock"))
	if not response_clock.is_empty():
		world_clock["elapsedSeconds"] = float(response_clock.get(
			"toSeconds",
			world_clock.get("elapsedSeconds", 0)
		))
		world_clock["paused"] = false
		world_clock["graceEnded"] = (
			bool(world_clock.get("graceEnded", false))
			or bool(response_clock.get("graceEnded", false))
		)
		world_clock["hearingDue"] = bool(response_clock.get("hearingDue", false))
		_run_snapshot["worldClock"] = world_clock
	if bool(world_clock.get("hearingDue", false)):
		_enter_hearing_due()
		return
	var scheduler := _dictionary_or_empty(result.get("scheduler"))
	if not scheduler.is_empty():
		_run_snapshot["scheduler"] = scheduler.duplicate(true)
	_reconcile_ambient_goal_wakes(scheduler)
	_last_arrivals_applied = _array_or_empty(result.get("arrivalsApplied"))
	_last_arrivals_rejected = _array_or_empty(result.get("arrivalsRejected"))
	for arrival_value in _last_arrivals_applied:
		if not arrival_value is Dictionary:
			continue
		var arrival := arrival_value as Dictionary
		var arrived_actor := _actor_view(str(arrival.get("actorId", "")))
		if not arrived_actor.is_empty():
			arrived_actor["locationId"] = str(arrival.get("locationId", ""))
			_update_run_actor(arrived_actor)
	_apply_readiness_deltas(_array_or_empty(result.get("actorReadinessDeltas")))
	var movement_deltas := _array_or_empty(result.get("movementDeltas"))
	if not movement_deltas.is_empty():
		_arrival_batch_movement_ids = {}
		for movement_value in movement_deltas:
			if movement_value is Dictionary:
				_arrival_batch_movement_ids[str(
					(movement_value as Dictionary).get("movementId", "")
				)] = true
	for movement_value in movement_deltas:
		if movement_value is Dictionary:
			_queue_or_apply_movement(movement_value as Dictionary)
	_reconcile_scheduler_movements(scheduler)
	_queue_nearby_conversation_preloads()


func _queue_ambient_decision_wakes(wakes: Array) -> void:
	for wake_value in wakes:
		if not wake_value is Dictionary:
			continue
		var wake := wake_value as Dictionary
		if (
			not bool(wake.get("requiresDecision", false))
			or str(wake.get("status", "")) != "pending"
		):
			continue
		var wake_id := str(wake.get("wakeId", ""))
		if wake_id.is_empty() or _ambient_claimed_wake_ids.has(wake_id):
			continue
		_ambient_claimed_wake_ids[wake_id] = true
		_ambient_wake_queue.append(wake.duplicate(true))
	_ambient_wake_queue.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var time_a := float(a.get("scheduledAtSeconds", 0.0))
		var time_b := float(b.get("scheduledAtSeconds", 0.0))
		if is_equal_approx(time_a, time_b):
			return str(a.get("wakeId", "")) < str(b.get("wakeId", ""))
		return time_a < time_b
	)


func _prepare_next_ambient_decision() -> void:
	if (
		_advance_needs_rebase
		or _advance_rebase_in_flight
		or not _ambient_pending_request.is_empty()
		or _ambient_wake_queue.is_empty()
	):
		return
	var selected_index := -1
	var preloads_busy := (
		not _conversation_preload_queue.is_empty()
		or not _conversation_preload_in_flight.is_empty()
	)
	for wake_index in _ambient_wake_queue.size():
		var candidate := _ambient_wake_queue[wake_index]
		if preloads_busy and str(candidate.get("kind", "")) == "goal":
			continue
		selected_index = wake_index
		break
	if selected_index < 0:
		return
	var wake: Dictionary = _ambient_wake_queue.pop_at(selected_index)
	_ambient_pending_request = {
		"runId": _run_id,
		"wakeId": str(wake.get("wakeId", "")),
		"observedWorldRevision": int(wake.get(
			"observedWorldRevision",
			_run_snapshot.get("worldRevision", 0)
		)),
	}
	_ambient_pending_wake_kind = str(wake.get("kind", ""))
	_ambient_pending_request_dispatched = false
	_ambient_decision_waiting_for_resume = false


func _dispatch_ambient_decision() -> void:
	if (
		_advance_needs_rebase
		or _advance_rebase_in_flight
		or _ambient_decision_in_flight
		or _ambient_pending_request.is_empty()
		or _hud.modal_mode() != HUD3D.ModalMode.NONE
	):
		return
	if (
		_ambient_decision_waiting_for_resume
		and (get_tree().paused or _conversation_target != null)
	):
		return
	_ambient_decision_in_flight = true
	_ambient_pending_request_dispatched = true
	var request := _ambient_pending_request.duplicate(true)
	var result: Dictionary = await _run_session.npc_decision(request)
	_ambient_decision_in_flight = false
	if _run_status != "active":
		_clear_ambient_pending_request()
		return
	if request != _ambient_pending_request:
		_ambient_decision_halted_reason = "in_flight_packet_changed"
		push_error("Ambient NPC decision lane changed an immutable request.")
		return
	if _present_provider_failure(result, "ambient_background"):
		_ambient_decision_halted_reason = "provider_failed"
		return
	if _is_error(result):
		var error_code := str(result.get("error", "npc_decision_failed"))
		if error_code == "npc_decision_failed":
			_ambient_decision_retry_remaining = AMBIENT_DECISION_RETRY_SECONDS
			return
		_ambient_decision_halted_reason = error_code
		push_error("Ambient NPC decision lane halted: %s" % error_code)
		return

	_resolve_provider_failure("ambient_decision", {"request": request})
	_cache_provider_evidence(result, "npc_decision")
	_ambient_last_decision_status = str(result.get("status", "failed"))
	_ambient_last_decision_kind = str(result.get("decisionKind", ""))
	_ambient_last_wake_kind = str(result.get("wakeKind", ""))
	_ambient_last_actor_ids = _array_or_empty(result.get("actorIds"))
	_ambient_provider_metas = _array_or_empty(result.get("providerMetas"))
	_apply_social_view_from_response(result)
	_run_snapshot["worldRevision"] = maxi(
		int(_run_snapshot.get("worldRevision", 0)),
		int(result.get("worldRevision", 0))
	)
	_spatial_facts_dirty = true
	match _ambient_last_decision_status:
		"completed":
			_clear_ambient_pending_request()
			_ambient_decision_waiting_for_resume = false
			_ambient_active_conversation = null
			var action_deltas := _array_or_empty(result.get("actionDeltas"))
			if not action_deltas.is_empty():
				_apply_run_deltas(action_deltas)
			else:
				# Compatibility with the already-generated T2 meeting fixture. New
				# runtime responses use actionDeltas as the sole application surface.
				_apply_readiness_deltas(_array_or_empty(result.get("actorReadinessDeltas")))
				_ingest_ambient_speech_events(_array_or_empty(result.get("speechEvents")))
				for movement_value in _array_or_empty(result.get("movementDeltas")):
					if movement_value is Dictionary:
						_queue_or_apply_movement(movement_value as Dictionary)
		"queued":
			# The runtime has cached a resolved proposal while the player modal
			# owns the pause. Preserve this exact request and retry after resume;
			# the provider is not called a second time.
			_ambient_decision_waiting_for_resume = true
			_ambient_active_conversation = {
				"conversationId": str(result.get("conversationId", "")),
				"wakeId": str(result.get("wakeId", "")),
				"participantActorIds": _array_or_empty(
					result.get("participantActorIds")
				),
				"observedWorldRevision": int(result.get(
					"observedWorldRevision",
					0
				)),
				"status": "queued",
			}
		"stale", "budget_reserved", "failed", "terminal":
			# These are terminal for this stable wake id. The scheduler may
			# produce a different wake later; changing this request would violate
			# the runtime's exact claim/cache contract.
			_clear_ambient_pending_request()
			_ambient_decision_waiting_for_resume = false
			_ambient_active_conversation = null
		_:
			_ambient_decision_halted_reason = "invalid_decision_status"
			push_error("Ambient NPC decision returned an unknown status.")


func _clear_ambient_pending_request() -> void:
	_ambient_pending_request = {}
	_ambient_pending_wake_kind = ""
	_ambient_pending_request_dispatched = false


func _reconcile_ambient_goal_wakes(scheduler: Dictionary) -> void:
	if scheduler.is_empty() or not scheduler.has("pendingWakes"):
		return
	var authoritative_goal_wake_ids: Dictionary = {}
	for wake_value in _array_or_empty(scheduler.get("pendingWakes")):
		if not wake_value is Dictionary:
			continue
		var wake := wake_value as Dictionary
		if (
			str(wake.get("kind", "")) != "goal"
			or str(wake.get("status", "")) not in ["pending", "claimed"]
		):
			continue
		var wake_id := str(wake.get("wakeId", ""))
		if not wake_id.is_empty():
			authoritative_goal_wake_ids[wake_id] = true
	for index in range(_ambient_wake_queue.size() - 1, -1, -1):
		var queued_wake := _ambient_wake_queue[index]
		if str(queued_wake.get("kind", "")) != "goal":
			continue
		var queued_wake_id := str(queued_wake.get("wakeId", ""))
		if authoritative_goal_wake_ids.has(queued_wake_id):
			continue
		_ambient_wake_queue.remove_at(index)
		_ambient_claimed_wake_ids.erase(queued_wake_id)
	if (
		not _ambient_pending_request.is_empty()
		and not _ambient_pending_request_dispatched
		and _ambient_pending_wake_kind == "goal"
	):
		var pending_wake_id := str(_ambient_pending_request.get("wakeId", ""))
		if not authoritative_goal_wake_ids.has(pending_wake_id):
			_ambient_claimed_wake_ids.erase(pending_wake_id)
			_clear_ambient_pending_request()


func _recover_ambient_decision_wakes_after_rebase(scheduler: Dictionary) -> void:
	# A stale advance response is discarded wholesale. Once the fresh snapshot
	# has rebased the client, recover its still-authoritative decision wakes.
	# Reconciliation first releases only vanished, undispatched goal claims;
	# the shared queue helper then deduplicates queued and in-flight wake ids.
	_reconcile_ambient_goal_wakes(scheduler)
	_queue_ambient_decision_wakes(_array_or_empty(scheduler.get("pendingWakes")))


func _ingest_ambient_snapshot(snapshot: Dictionary) -> void:
	var ambient := _dictionary_or_empty(snapshot.get("ambientSpeech"))
	if ambient.is_empty():
		return
	_ingest_ambient_speech_events(_array_or_empty(ambient.get("events")))
	_ambient_speech_cursor = maxi(
		_ambient_speech_cursor,
		int(ambient.get("cursor", 0))
	)
	if int(snapshot.get("worldRevision", 0)) >= int(_run_snapshot.get("worldRevision", 0)):
		_ambient_active_conversation = ambient.get("activeConversation", null)


func apply_ambient_speech_events(events: Array) -> void:
	_ingest_ambient_speech_events(events)


func _ingest_ambient_speech_events(events: Array) -> void:
	var ordered := events.duplicate(true)
	ordered.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a.get("seq", -1)) < int(b.get("seq", -1))
	)
	for event_value in ordered:
		if not event_value is Dictionary:
			continue
		var event := event_value as Dictionary
		var seq := int(event.get("seq", -1))
		if seq <= 0 or _ambient_seen_seqs.has(seq):
			continue
		_ambient_seen_seqs[seq] = true
		_ambient_speech_cursor = maxi(_ambient_speech_cursor, seq)
		_ambient_speech_events.append(event.duplicate(true))
		if get_tree().paused or _conversation_target != null:
			_deferred_ambient_speech_events.append(event.duplicate(true))
		else:
			_present_ambient_speech_event(event)
	_ambient_speech_events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a.get("seq", -1)) < int(b.get("seq", -1))
	)


func _present_ambient_speech_event(event: Dictionary) -> void:
	_face_ambient_participants(event)
	var audibility := _dictionary_or_empty(event.get("audibility"))
	var player_audibility: Dictionary = _town.player_speech_audibility(audibility)
	if not bool(player_audibility.get("audible", false)):
		return
	var speaker_position_value: Variant = player_audibility.get("speakerPosition")
	if not speaker_position_value is Vector3:
		return
	var presentation_event := event.duplicate(true)
	presentation_event["playerAudibility"] = player_audibility.duplicate(true)
	var direction := StringName(str(_player.call(
		"camera_relative_direction",
		speaker_position_value as Vector3
	)))
	_hud.enqueue_ambient_subtitle(presentation_event, direction)


func _face_ambient_participants(event: Dictionary) -> void:
	var speaker := _town.get_node_or_null(
		"Actors/%s" % str(event.get("speakerActorId", ""))
	) as NPC3D
	var target := _town.get_node_or_null(
		"Actors/%s" % str(event.get("targetActorId", ""))
	) as NPC3D
	if speaker == null or target == null:
		return
	speaker.face_position(target.global_position + Vector3.UP * 1.35)
	target.face_position(speaker.global_position + Vector3.UP * 1.35)


func _on_ambient_subtitle_started(event: Dictionary) -> void:
	var seq := int(event.get("seq", -1))
	var audibility := _dictionary_or_empty(event.get("audibility"))
	var player_audibility: Dictionary = _town.player_speech_audibility(audibility)
	if not bool(player_audibility.get("audible", false)):
		_hud.discard_current_ambient_subtitle(seq)
		return
	var speaker_position_value: Variant = player_audibility.get("speakerPosition")
	if not speaker_position_value is Vector3:
		_hud.discard_current_ambient_subtitle(seq)
		return
	var direction := StringName(str(_player.call(
		"camera_relative_direction",
		speaker_position_value as Vector3
	)))
	if not _hud.accept_current_ambient_subtitle(
		seq,
		direction,
		player_audibility
	):
		return
	var speaker := _town.get_node_or_null(
		"Actors/%s" % str(event.get("speakerActorId", ""))
	) as NPC3D
	if speaker != null:
		speaker.play_speech_blip(float(player_audibility.get("maxDistanceM", 0.0)))
	_acknowledge_speech_encounter(event)


func _acknowledge_speech_encounter(event: Dictionary) -> void:
	var speech_event_id := str(event.get("speechEventId", event.get("eventId", "")))
	if speech_event_id.is_empty() or _acknowledged_speech_encounters.has(speech_event_id):
		return
	_acknowledged_speech_encounters[speech_event_id] = "pending"
	var encounter_id := "enc:speech:%s" % speech_event_id.sha256_text().left(32)
	var result: Dictionary = await _send_encounter_with_retry(
		encounter_id,
		{
			"kind": "speech",
			"speechEventId": speech_event_id,
			"playerPosition": _vector3_to_array(_player.global_position),
		}
	)
	if _is_error(result):
		_acknowledged_speech_encounters.erase(speech_event_id)
		push_warning("RunService did not acknowledge displayed speech: %s" % speech_event_id)
		return
	_acknowledged_speech_encounters[speech_event_id] = "accepted"
	_apply_social_view_from_response(result)


func _flush_deferred_ambient_speech_events() -> void:
	var deferred := _deferred_ambient_speech_events.duplicate(true)
	_deferred_ambient_speech_events.clear()
	deferred.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a.get("seq", -1)) < int(b.get("seq", -1))
	)
	for event_value in deferred:
		if event_value is Dictionary:
			_present_ambient_speech_event(event_value as Dictionary)


func _ambient_decision_request_summary(request: Dictionary) -> Dictionary:
	if request.is_empty():
		return {}
	return {
		"runId": str(request.get("runId", "")),
		"wakeId": str(request.get("wakeId", "")),
		"observedWorldRevision": int(request.get("observedWorldRevision", -1)),
	}


func _capture_spatial_facts(observed_world_revision: int) -> Dictionary:
	var captured := _town.spatial_facts()
	var actors := _array_or_empty(captured.get("actors"))
	var player := _dictionary_or_empty(captured.get("player"))
	if actors.size() != 6:
		_advance_lane_halted_reason = "spatial_fact_actor_count"
		push_error("Town3D spatial packet must contain exactly six resident facts.")
		return {}
	var actor_ids: Dictionary = {}
	for actor_value in actors:
		var actor_id := str(actor_value.get("actorId", ""))
		if actor_id.is_empty() or actor_ids.has(actor_id):
			_advance_lane_halted_reason = "spatial_fact_actor_identity"
			push_error("Town3D spatial packet has a missing or duplicate resident id.")
			return {}
		actor_ids[actor_id] = true
	if _array_or_empty(player.get("position")).size() != 3:
		_advance_lane_halted_reason = "spatial_fact_player"
		push_error("Town3D spatial packet must contain the player's position.")
		return {}
	_last_spatial_player_position = _player.global_position
	return {
		"observedWorldRevision": observed_world_revision,
		"player": player,
		"actors": actors,
	}


func _spatial_facts_summary(packet: Dictionary) -> Dictionary:
	if packet.is_empty():
		return {}
	var actors := _array_or_empty(packet.get("actors"))
	var actor_ids: Array[String] = []
	for actor_value in actors:
		if actor_value is Dictionary:
			actor_ids.append(str((actor_value as Dictionary).get("actorId", "")))
	actor_ids.sort()
	return {
		"observedWorldRevision": int(packet.get("observedWorldRevision", -1)),
		"actorCount": actors.size(),
		"actorIds": actor_ids,
		"player": _dictionary_or_empty(packet.get("player")),
	}


func _apply_run_deltas(deltas: Array) -> void:
	for delta_value in deltas:
		if not delta_value is Dictionary:
			push_warning("Ignoring non-dictionary runtime action delta.")
			continue
		var delta := delta_value as Dictionary
		match str(delta.get("kind", "")):
			"speech":
				var speech_event := _dictionary_or_empty(delta.get("speechEvent"))
				if speech_event.is_empty():
					push_warning("Ignoring runtime speech delta without speechEvent.")
				else:
					_ingest_ambient_speech_events([speech_event])
			"readiness":
				var readiness_delta := _dictionary_or_empty(delta.get("readinessDelta"))
				if readiness_delta.is_empty():
					push_warning("Ignoring runtime readiness delta without readinessDelta.")
				else:
					_apply_readiness_deltas([readiness_delta])
			"look":
				_apply_look_delta(delta)
			"movement":
				var movement_delta := _dictionary_or_empty(delta.get("movementDelta"))
				if movement_delta.is_empty():
					push_warning("Ignoring runtime movement delta without movementDelta.")
				else:
					_queue_or_apply_movement(movement_delta)
			"administration":
				# The runtime owns record truth. Cache only its authoritative record
				# payload so later presentation deltas can resolve recordId to the
				# correct world text surface; player knowledge still arrives through
				# the separately authoritative socialView.
				_apply_administration_delta(delta)
			_:
				push_warning("Ignoring unknown runtime action delta kind: %s" % delta.get("kind", ""))


func _apply_administration_delta(delta: Dictionary) -> void:
	var record_value: Variant = delta.get("record")
	if not record_value is Dictionary:
		push_warning("Ignoring administration delta without an authoritative record.")
		return
	var record := record_value as Dictionary
	var record_id_value: Variant = record.get("recordId")
	var text_surface_id_value: Variant = record.get("textSurfaceId")
	var record_revision_value: Variant = record.get("recordRevision")
	var record_revision := _positive_json_integer(record_revision_value)
	if (
		typeof(record_id_value) != TYPE_STRING
		or str(record_id_value).strip_edges().is_empty()
		or typeof(text_surface_id_value) != TYPE_STRING
		or str(text_surface_id_value).strip_edges().is_empty()
		or record_revision < 1
	):
		push_warning("Ignoring administration delta with an invalid record identity or revision.")
		return

	var record_id := str(record_id_value)
	var records := _array_or_empty(_run_snapshot.get("records"))
	var record_index := -1
	var cached_record: Dictionary = {}
	var cached_record_revision := 0
	for index in records.size():
		var cached_value: Variant = records[index]
		if not cached_value is Dictionary:
			continue
		var cached := cached_value as Dictionary
		if str(cached.get("recordId", "")) != record_id:
			continue
		var cached_revision := _positive_json_integer(cached.get("recordRevision"))
		if cached_revision > 0 and record_revision < cached_revision:
			return
		cached_record = cached
		cached_record_revision = cached_revision
		record_index = index
		break

	# The action delta is also the freshest authoritative pressure/ledger view.
	# Keep the debug snapshot coherent without revealing either value through the
	# normal HUD; player knowledge still comes only from socialView encounters.
	var has_ledger_event := delta.has("ledgerEvent")
	var has_pressure_after := delta.has("pressureAfter")
	if has_ledger_event != has_pressure_after:
		push_warning("Ignoring incomplete administration pressure/ledger metadata.")
		return
	var ledger_event_value: Variant = delta.get("ledgerEvent")
	var pressure_after := _bounded_json_integer(delta.get("pressureAfter"), 0, 125)
	var ledger_events := _array_or_empty(_run_snapshot.get("ledgerEvents"))
	var ledger_event: Dictionary = {}
	var ledger_event_id := ""
	var ledger_event_index := -1
	if has_ledger_event:
		if not ledger_event_value is Dictionary or pressure_after < 0:
			push_warning("Ignoring malformed administration pressure/ledger metadata.")
			return
		ledger_event = ledger_event_value as Dictionary
		ledger_event_id = str(ledger_event.get("eventId", "")).strip_edges()
		var event_seq := _positive_json_integer(ledger_event.get("seq"))
		if (
			ledger_event_id.is_empty()
			or event_seq < 1
			or str(ledger_event.get("recordId", "")) != record_id
			or _positive_json_integer(ledger_event.get("recordRevision")) != record_revision
			or _bounded_json_integer(ledger_event.get("pressureAfter"), 0, 125)
			!= pressure_after
		):
			push_warning("Ignoring malformed administration pressure/ledger metadata.")
			return
		for index in ledger_events.size():
			var cached_event_value: Variant = ledger_events[index]
			if not cached_event_value is Dictionary:
				continue
			var cached_event := cached_event_value as Dictionary
			if str(cached_event.get("eventId", "")) == ledger_event_id:
				if cached_event != ledger_event:
					push_warning("Ignoring administration ledger content drift at one event id.")
					return
				ledger_event_index = index
				break
			if _positive_json_integer(cached_event.get("seq")) == event_seq:
				push_warning("Ignoring administration ledger event with a conflicting sequence.")
				return

	if (
		cached_record_revision == record_revision
		and str(delta.get("action", "")) == "read_record"
	):
		# A record read is the one legal equal-revision mutation: the backend
		# advances lastLedgerEventId while retaining the authored record revision.
		# Accept only that exact shape after its matching ledger event validates.
		var expected_read_record := cached_record.duplicate(true)
		expected_read_record["lastLedgerEventId"] = ledger_event_id
		var is_authoritative_read := (
			has_ledger_event
			and str(ledger_event.get("kind", "")) == "record_read"
			and str(record.get("lastLedgerEventId", "")) == ledger_event_id
			and record == expected_read_record
		)
		if not is_authoritative_read:
			push_warning("Ignoring administration record content drift at one revision.")
			return
	elif cached_record_revision == record_revision and cached_record != record:
		push_warning("Ignoring administration record content drift at one revision.")
		return

	# All supplied authority metadata has now validated. Apply the record,
	# ledger, and pressure together so diagnostics cannot observe a torn delta.
	if record_index >= 0:
		records[record_index] = record.duplicate(true)
	else:
		records.append(record.duplicate(true))
	_run_snapshot["records"] = records
	if (
		str(delta.get("action", "")) == "write_record"
		and cached_record_revision < record_revision
	):
		var record_surface := _record_surface_node(record_id)
		if record_surface != null and is_instance_valid(_audio_feedback):
			_audio_feedback.play_record_scribble(
				record_surface.global_position + Vector3.UP * 1.1
			)
	if not has_ledger_event:
		return
	if ledger_event_index >= 0:
		ledger_events[ledger_event_index] = ledger_event.duplicate(true)
	else:
		ledger_events.append(ledger_event.duplicate(true))
		ledger_events.sort_custom(func(left: Variant, right: Variant) -> bool:
			if not left is Dictionary or not right is Dictionary:
				return false
			return int((left as Dictionary).get("seq", 0)) < int(
				(right as Dictionary).get("seq", 0)
			)
		)
	_run_snapshot["ledgerEvents"] = ledger_events
	_run_snapshot["institutionalPressure"] = pressure_after


func _positive_json_integer(value: Variant) -> int:
	if typeof(value) == TYPE_INT:
		return int(value) if int(value) > 0 else -1
	if typeof(value) != TYPE_FLOAT:
		return -1
	var number := float(value)
	if not is_finite(number) or number < 1.0 or number != floor(number):
		return -1
	return int(number)


func _bounded_json_integer(value: Variant, minimum: int, maximum: int) -> int:
	var integer := -1
	if typeof(value) == TYPE_INT:
		integer = int(value)
	elif typeof(value) == TYPE_FLOAT:
		var number := float(value)
		if is_finite(number) and number == floor(number):
			integer = int(number)
	return integer if integer >= minimum and integer <= maximum else -1


func _apply_look_delta(delta: Dictionary) -> void:
	var delta_revision := int(delta.get("worldRevision", -1))
	if delta_revision != int(_run_snapshot.get("worldRevision", -2)):
		push_warning("Ignoring look delta whose world revision is no longer current.")
		return
	var actor_id := str(delta.get("actorId", ""))
	var target_kind := str(delta.get("targetKind", ""))
	var target_id := str(delta.get("targetId", ""))
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	if actor == null or target_id.is_empty():
		push_warning("Ignoring look delta with an unavailable resident or target.")
		return
	var target_position_value: Variant = _look_target_position(target_kind, target_id)
	if not target_position_value is Vector3:
		push_warning("Ignoring unavailable %s look target: %s" % [target_kind, target_id])
		return
	actor.face_position(target_position_value as Vector3)


func _look_target_position(target_kind: String, target_id: String) -> Variant:
	match target_kind:
		"actor":
			var actor := _town.get_node_or_null("Actors/%s" % target_id) as NPC3D
			if actor != null:
				return actor.global_position + Vector3.UP * 1.35
		"object":
			var prop := _physical_prop_node(target_id)
			if prop != null:
				return _semantic_target_center(prop, 0.35)
		"record":
			var surface := _record_surface_node(target_id)
			if surface != null:
				return _semantic_target_center(surface, 1.2)
	return null


func _physical_prop_node(prop_id: String) -> Node3D:
	if not _physical_prop_known(prop_id):
		return null
	for prop_value in get_tree().get_nodes_in_group(&"physical_props"):
		if prop_value is Node3D and str((prop_value as Node3D).get("prop_id")) == prop_id:
			return prop_value as Node3D
	return null


func _record_surface_node(record_id: String) -> Node3D:
	var text_surface_id := ""
	for record_value in _array_or_empty(_run_snapshot.get("records")):
		if (
			record_value is Dictionary
			and str((record_value as Dictionary).get("recordId", "")) == record_id
		):
			text_surface_id = str((record_value as Dictionary).get("textSurfaceId", ""))
			break
	if text_surface_id.is_empty():
		return null
	for surface_value in get_tree().get_nodes_in_group(&"record_surfaces"):
		if (
			surface_value is Node3D
			and (surface_value as Node3D).has_method("get_semantic_id")
			and str((surface_value as Node3D).call("get_semantic_id")) == text_surface_id
		):
			return surface_value as Node3D
	return null


func _semantic_target_center(target: Node3D, fallback_height_m: float) -> Vector3:
	var collision := target.get_node_or_null("Collision") as Node3D
	if collision != null:
		return collision.global_position
	return target.global_position + Vector3.UP * fallback_height_m


func _apply_conversation_end_deltas_once(
	session_id: String,
	world_revision: int,
	deltas: Array
) -> void:
	var batch_id := session_id
	if session_id.is_empty() or _applied_conversation_end_batches.has(batch_id):
		return
	if world_revision != int(_run_snapshot.get("worldRevision", -1)):
		push_warning("Ignoring queued session-end deltas whose world revision is stale.")
		return
	_applied_conversation_end_batches[batch_id] = true
	_apply_run_deltas(deltas)


func _apply_readiness_deltas(deltas: Array) -> void:
	var should_refresh_priority := false
	for delta_value in deltas:
		if not delta_value is Dictionary:
			continue
		var delta := delta_value as Dictionary
		var actor := _actor_view(str(delta.get("actorId", "")))
		if actor.is_empty():
			continue
		actor["playerConversationReady"] = bool(
			delta.get("playerConversationReady", false)
		)
		_update_run_actor(actor)
		var actor_id := str(actor.get("actorId", ""))
		var reason := str(delta.get("reason", ""))
		if reason == "preload_required":
			_conversation_preload_retries.erase(actor_id)
			_conversation_preload_retry_queued.erase(actor_id)
		if (
			not bool(actor.get("playerConversationReady", false))
			and reason in ["opening_invalidated", "evidence_changed", "preload_required"]
		):
			_conversation_preload_invalidated[actor_id] = true
			should_refresh_priority = true
		elif bool(actor.get("playerConversationReady", false)):
			_clear_conversation_preload_failure_state(actor_id)
			_conversation_preload_invalidated.erase(actor_id)
	if should_refresh_priority:
		_apply_all_conversation_readiness()
		call_deferred("_queue_nearby_conversation_preloads")


func _queue_or_apply_movement(movement: Dictionary) -> void:
	_spatial_facts_dirty = true
	var movement_actor_id := str(movement.get("actorId", ""))
	if (
		not _active_contact.is_empty()
		and movement_actor_id == str(_active_contact.get("actorId", ""))
	):
		# Only activeContact may end an authoritative contact. Keep at most one
		# conflicting movement until a later scheduler snapshot reconciles it.
		_replace_queued_movement_for_actor(movement)
		return
	if get_tree().paused or _conversation_target != null:
		_replace_queued_movement_for_actor(movement)
		return
	_discard_queued_movement_for_actor(movement_actor_id)
	_apply_movement_delta(movement)


func _replace_queued_movement_for_actor(movement: Dictionary) -> void:
	var actor_id := str(movement.get("actorId", ""))
	var movement_id := str(movement.get("movementId", ""))
	for index in range(_queued_movement_deltas.size() - 1, -1, -1):
		var queued := _queued_movement_deltas[index]
		if str(queued.get("actorId", "")) != actor_id:
			continue
		var queued_movement_id := str(queued.get("movementId", ""))
		if queued_movement_id != movement_id:
			_arrival_batch_movement_ids.erase(queued_movement_id)
		_queued_movement_deltas.remove_at(index)
	_queued_movement_deltas.append(movement.duplicate(true))


func _discard_queued_movement_for_actor(actor_id: String) -> void:
	if actor_id.is_empty():
		return
	for index in range(_queued_movement_deltas.size() - 1, -1, -1):
		var queued := _queued_movement_deltas[index]
		if str(queued.get("actorId", "")) != actor_id:
			continue
		_arrival_batch_movement_ids.erase(str(queued.get("movementId", "")))
		_queued_movement_deltas.remove_at(index)


func _apply_movement_delta(movement: Dictionary) -> void:
	var movement_id := str(movement.get("movementId", ""))
	var actor_id := str(movement.get("actorId", ""))
	var anchor_ref := str(movement.get("targetAnchorRef", ""))
	if movement_id.is_empty() or actor_id.is_empty() or anchor_ref.is_empty():
		push_warning("Ignoring incomplete runtime movement delta.")
		return
	var current := _dictionary_or_empty(_active_movements.get(actor_id))
	if str(current.get("movementId", "")) == movement_id:
		return
	var blocked := _dictionary_or_empty(_blocked_movements.get(actor_id))
	if str(blocked.get("movementId", "")) == movement_id:
		return
	if _arrival_is_queued(movement_id):
		return
	var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
	var target_value: Variant = _town.navigation_position(anchor_ref)
	if actor == null or not target_value is Vector3:
		_active_movements.erase(actor_id)
		_blocked_movements[actor_id] = {
			"movementId": movement_id,
			"actorId": actor_id,
			"anchorRef": anchor_ref,
			"reason": "navigation_projection_unavailable",
			"retryCount": 0,
			"retryRemaining": MOVEMENT_RETRY_DELAY_SECONDS,
		}
		push_warning("Cannot bind runtime movement %s to %s." % [movement_id, anchor_ref])
		return
	var target := target_value as Vector3
	_blocked_movements.erase(actor_id)
	_active_movements[actor_id] = {
		"movementId": movement_id,
		"actorId": actor_id,
		"anchorRef": anchor_ref,
		"targetPosition": target,
		"activity": str(movement.get("activity", "")),
		"scheduleBlockId": str(movement.get("scheduleBlockId", "")),
	}
	if not actor.apply_movement_command(movement_id, anchor_ref, target):
		_active_movements.erase(actor_id)
		push_warning("NPC %s rejected runtime movement %s." % [actor_id, movement_id])


func _reconcile_scheduler_movements(scheduler: Dictionary) -> void:
	if scheduler.is_empty():
		return
	var authoritative_pending_by_actor: Dictionary = {}
	var authoritative_pending_movements: Array[Dictionary] = []
	for actor_value in _array_or_empty(scheduler.get("actors")):
		if not actor_value is Dictionary:
			continue
		var scheduler_actor := actor_value as Dictionary
		var actor_id := str(scheduler_actor.get("actorId", ""))
		var pending := _dictionary_or_empty(scheduler_actor.get("pendingMovement"))
		if not pending.is_empty():
			pending["actorId"] = actor_id
			pending["fromAnchorRef"] = str(scheduler_actor.get("confirmedAnchorRef", ""))
			var current_block := _dictionary_or_empty(scheduler_actor.get("currentBlock"))
			pending["activity"] = str(current_block.get("activity", ""))
			authoritative_pending_by_actor[actor_id] = str(pending.get("movementId", ""))
			authoritative_pending_movements.append(pending)
	_sync_meeting_ambient_policy_holds(scheduler)
	# A modal or contact may have delayed a movement that is no longer current.
	# Never replay it merely because presentation became available again.
	for index in range(_queued_movement_deltas.size() - 1, -1, -1):
		var queued := _queued_movement_deltas[index]
		var queued_actor_id := str(queued.get("actorId", ""))
		var queued_movement_id := str(queued.get("movementId", ""))
		if (
			not authoritative_pending_by_actor.has(queued_actor_id)
			or str(authoritative_pending_by_actor[queued_actor_id]) != queued_movement_id
		):
			_arrival_batch_movement_ids.erase(queued_movement_id)
			_queued_movement_deltas.remove_at(index)
	for pending in authoritative_pending_movements:
		_queue_or_apply_movement(pending)
	for active_actor_id_value in _active_movements.keys():
		var active_actor_id := str(active_actor_id_value)
		var active_movement := _dictionary_or_empty(_active_movements.get(active_actor_id))
		if (
			not authoritative_pending_by_actor.has(active_actor_id)
			or str(authoritative_pending_by_actor[active_actor_id])
			!= str(active_movement.get("movementId", ""))
		):
			var actor := _town.get_node_or_null("Actors/%s" % active_actor_id) as NPC3D
			if actor != null:
				actor.stop()
			_active_movements.erase(active_actor_id)
	for blocked_actor_id_value in _blocked_movements.keys():
		var blocked_actor_id := str(blocked_actor_id_value)
		var blocked_movement := _dictionary_or_empty(_blocked_movements.get(blocked_actor_id))
		if (
			not authoritative_pending_by_actor.has(blocked_actor_id)
			or str(authoritative_pending_by_actor[blocked_actor_id])
			!= str(blocked_movement.get("movementId", ""))
		):
			_blocked_movements.erase(blocked_actor_id)


func _sync_meeting_ambient_policy_holds(scheduler: Dictionary) -> void:
	var held_by_actor: Dictionary = {}
	for actor_value in _array_or_empty(scheduler.get("actors")):
		if not actor_value is Dictionary:
			continue
		var scheduler_actor := actor_value as Dictionary
		var actor_id := str(scheduler_actor.get("actorId", ""))
		var current_block := _dictionary_or_empty(scheduler_actor.get("currentBlock"))
		var target_anchor_ref := str(current_block.get("targetId", ""))
		held_by_actor[actor_id] = (
			str(current_block.get("targetKind", "")) == "anchor"
			and _town.is_meeting_participant_anchor(actor_id, target_anchor_ref)
		)
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if not actor_value is NPC3D or not _town.is_ancestor_of(actor_value as NPC3D):
			continue
		var actor := actor_value as NPC3D
		actor.set_ambient_policy_hold(bool(held_by_actor.get(str(actor.actor_id), false)))


func _on_npc_movement_arrived(
	movement_id: String,
	actor_id_value: StringName,
	anchor_ref: String
) -> void:
	var actor_id := str(actor_id_value)
	var movement := _dictionary_or_empty(_active_movements.get(actor_id))
	if movement.is_empty() or str(movement.get("movementId", "")) != movement_id:
		return
	if str(movement.get("anchorRef", "")) != anchor_ref:
		return
	if not _arrival_is_queued(movement_id):
		_queued_arrivals.append({
			"movementId": movement_id,
			"actorId": actor_id,
			"anchorRef": anchor_ref,
		})
	_spatial_facts_dirty = true
	_active_movements.erase(actor_id)
	_refresh_arrival_batch_timer()


func _on_npc_movement_blocked(
	movement_id: String,
	actor_id_value: StringName,
	anchor_ref: String,
	reason: String
) -> void:
	var actor_id := str(actor_id_value)
	var movement := _dictionary_or_empty(_active_movements.get(actor_id))
	if movement.is_empty() or str(movement.get("movementId", "")) != movement_id:
		return
	_active_movements.erase(actor_id)
	_spatial_facts_dirty = true
	_blocked_movements[actor_id] = {
		"movementId": movement_id,
		"actorId": actor_id,
		"anchorRef": anchor_ref,
		"reason": reason,
		"retryCount": int(movement.get("retryCount", 0)),
		"retryRemaining": MOVEMENT_RETRY_DELAY_SECONDS,
	}
	_refresh_arrival_batch_timer()


func _refresh_arrival_batch_timer() -> void:
	if _queued_arrivals.is_empty():
		return
	for active_value in _active_movements.values():
		if not active_value is Dictionary:
			continue
		var movement_id := str((active_value as Dictionary).get("movementId", ""))
		if _arrival_batch_movement_ids.has(movement_id):
			if _arrival_batch_remaining < 0.0:
				_arrival_batch_remaining = ARRIVAL_BATCH_SECONDS
			return
	_arrival_batch_remaining = 0.0


func _fixture_movement_batch_state() -> StringName:
	if _run_session.mode() != "fixture" or _arrival_batch_movement_ids.is_empty():
		return &"none"
	var waiting := false
	for movement_id_value in _arrival_batch_movement_ids:
		var movement_id := str(movement_id_value)
		if _arrival_is_queued(movement_id):
			continue
		if _movement_collection_has_id(_active_movements, movement_id):
			waiting = true
			continue
		var blocked := _movement_collection_entry(_blocked_movements, movement_id)
		if not blocked.is_empty():
			if int(blocked.get("retryCount", 0)) < MOVEMENT_MAX_RETRIES:
				waiting = true
				continue
			return &"blocked"
		return &"lost"
	return &"waiting" if waiting else &"ready"


func _movement_collection_has_id(movements: Dictionary, movement_id: String) -> bool:
	return not _movement_collection_entry(movements, movement_id).is_empty()


func _movement_collection_entry(movements: Dictionary, movement_id: String) -> Dictionary:
	for movement_value in movements.values():
		if (
			movement_value is Dictionary
			and str((movement_value as Dictionary).get("movementId", "")) == movement_id
		):
			return (movement_value as Dictionary).duplicate(true)
	return {}


func _advance_request_summary(request: Dictionary) -> Dictionary:
	if request.is_empty():
		return {}
	var arrivals_value: Variant = request.get("arrivals", [])
	var prop_events_value: Variant = request.get("propHandlingEvents", [])
	return {
		"advanceId": str(request.get("advanceId", "")),
		"observedWorldRevision": int(request.get("observedWorldRevision", -1)),
		"afterSpeechSeq": int(request.get("afterSpeechSeq", 0)),
		"elapsedSeconds": float(request.get("elapsedSeconds", 0.0)),
		"arrivalCount": (arrivals_value as Array).size() if arrivals_value is Array else 0,
		"propEventCount": (
			(prop_events_value as Array).size() if prop_events_value is Array else 0
		),
	}


func _tick_blocked_movements(delta: float) -> void:
	for actor_id_value in _blocked_movements.keys():
		var actor_id := str(actor_id_value)
		var blocked := _dictionary_or_empty(_blocked_movements.get(actor_id))
		var retry_count := int(blocked.get("retryCount", 0))
		if retry_count >= MOVEMENT_MAX_RETRIES:
			continue
		var retry_remaining := maxf(
			0.0,
			float(blocked.get("retryRemaining", MOVEMENT_RETRY_DELAY_SECONDS)) - delta
		)
		blocked["retryRemaining"] = retry_remaining
		_blocked_movements[actor_id] = blocked
		if not is_zero_approx(retry_remaining):
			continue
		var actor := _town.get_node_or_null("Actors/%s" % actor_id) as NPC3D
		var target_value: Variant = _town.navigation_position(str(blocked.get("anchorRef", "")))
		if actor == null or not target_value is Vector3:
			blocked["retryCount"] = MOVEMENT_MAX_RETRIES
			blocked["reason"] = "navigation_projection_unavailable"
			_blocked_movements[actor_id] = blocked
			continue
		var target := target_value as Vector3
		var retry_movement := blocked.duplicate(true)
		retry_movement["targetPosition"] = target
		retry_movement["retryCount"] = retry_count + 1
		if actor.apply_movement_command(
			str(blocked.get("movementId", "")),
			str(blocked.get("anchorRef", "")),
			target
		):
			_blocked_movements.erase(actor_id)
			_active_movements[actor_id] = retry_movement
		else:
			blocked["retryCount"] = MOVEMENT_MAX_RETRIES
			blocked["reason"] = "movement_command_rejected"
			_blocked_movements[actor_id] = blocked


func _advance_batch_seconds() -> float:
	return (
		FIXTURE_ADVANCE_BATCH_SECONDS
		if _run_session.mode() == "fixture"
		else ADVANCE_BATCH_SECONDS
	)


func _arrival_is_queued(movement_id: String) -> bool:
	if movement_id.is_empty():
		return false
	for arrival in _queued_arrivals:
		if str(arrival.get("movementId", "")) == movement_id:
			return true
	var pending_arrivals: Variant = _pending_advance_request.get("arrivals", [])
	if pending_arrivals is Array:
		for arrival_value in pending_arrivals:
			if (
				arrival_value is Dictionary
				and str((arrival_value as Dictionary).get("movementId", "")) == movement_id
			):
				return true
	return false


func _prop_event_is_queued(event_id: String) -> bool:
	if event_id.is_empty():
		return false
	for event in _queued_prop_events:
		if str(event.get("eventId", "")) == event_id:
			return true
	var pending_events := _array_or_empty(_pending_advance_request.get("propHandlingEvents"))
	for event_value in pending_events:
		if (
			event_value is Dictionary
			and str((event_value as Dictionary).get("eventId", "")) == event_id
		):
			return true
	return false


func _settle_advance_lane_for_conversation(force_fresh_spatial := false) -> bool:
	while _advance_in_flight or _advance_rebase_in_flight:
		await get_tree().process_frame
	# Control lock may just have placed a held prop. Drain those immutable
	# event packets before the conversation owns the pause, then send the one
	# requested fresh spatial packet. The paused tree prevents new prop input.
	var prop_drain_budget := mini(
		16,
		maxi(2, ceili(float(_queued_prop_events.size()) / ADVANCE_MAX_PROP_EVENTS) + 4)
	)
	for _attempt in prop_drain_budget:
		if _advance_needs_rebase:
			await _rebase_run_after_advance_conflict()
			while _advance_rebase_in_flight:
				await get_tree().process_frame
		if not _advance_lane_halted_reason.is_empty():
			return false
		if _pending_advance_request.is_empty():
			if _queued_prop_events.is_empty():
				break
			_prepare_advance_request()
		if _pending_advance_request.is_empty():
			break
		_advance_retry_remaining = 0.0
		await _dispatch_advance()
		while _advance_in_flight:
			await get_tree().process_frame
	if not _queued_prop_events.is_empty() or not _pending_advance_request.is_empty():
		return false

	if force_fresh_spatial and _run_session.mode() != "fixture":
		var spatial_accepted := false
		for _attempt in 2:
			if _advance_needs_rebase:
				await _rebase_run_after_advance_conflict()
				while _advance_rebase_in_flight:
					await get_tree().process_frame
			if not _advance_lane_halted_reason.is_empty():
				return false
			_spatial_facts_dirty = true
			_prepare_advance_request(true)
			if _pending_advance_request.is_empty():
				return false
			_advance_retry_remaining = 0.0
			await _dispatch_advance()
			while _advance_in_flight:
				await get_tree().process_frame
			if not _advance_needs_rebase and _pending_advance_request.is_empty():
				spatial_accepted = true
				break
		if not spatial_accepted:
			return false
	return (
		_pending_advance_request.is_empty()
		and not _advance_needs_rebase
		and _advance_lane_halted_reason.is_empty()
	)


func _rebase_run_after_advance_conflict() -> void:
	if _advance_rebase_in_flight or _run_id.is_empty():
		return
	_advance_rebase_in_flight = true
	var result: Dictionary = await _run_session.run_snapshot(_run_id)
	_advance_rebase_in_flight = false
	if _is_error(result):
		_advance_retry_remaining = ADVANCE_RETRY_SECONDS
		return
	_ingest_ambient_snapshot(result)
	var current_revision := int(_run_snapshot.get("worldRevision", 0))
	var snapshot_revision := int(result.get("worldRevision", current_revision))
	if snapshot_revision < current_revision:
		_advance_needs_rebase = true
		_advance_retry_remaining = ADVANCE_RETRY_SECONDS
		return
	_sync_provider_failure_marker(result)
	var previous_readiness := _conversation_readiness(_run_snapshot)
	_replace_run_snapshot(result, true)
	_apply_player_brief_from_snapshot(result)
	_cache_provider_evidence(result)
	_hydrate_run_lifecycle(result)
	_apply_social_view_from_response(result, true)
	if not _social_view.is_empty():
		_run_snapshot["socialView"] = _social_view.duplicate(true)
	_run_snapshot["worldRevision"] = maxi(current_revision, snapshot_revision)
	_spatial_facts_dirty = true
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	_advance_needs_rebase = false
	_advance_retry_remaining = 0.0
	if _run_status == "hearing_due":
		_enter_hearing_due()
		return
	if _run_status == "terminal" and not _terminal_result.is_empty():
		_enter_terminal_outcome()
		return
	_apply_all_conversation_readiness()
	if _run_session.mode() != "fixture":
		var current_readiness := _conversation_readiness(_run_snapshot)
		for actor_id_value in previous_readiness.keys():
			var actor_id := str(actor_id_value)
			if (
				bool(previous_readiness.get(actor_id, false))
				and not bool(current_readiness.get(actor_id, false))
			):
				_conversation_preload_retries.erase(actor_id)
				_conversation_preload_retry_queued.erase(actor_id)
				_conversation_preload_invalidated[actor_id] = true
	var scheduler := _dictionary_or_empty(result.get("scheduler"))
	if _run_session.mode() == "fixture":
		# Generated fixture replays consume only their explicit scheduleWakes;
		# snapshot recovery is an HTTP out-of-order-response concern.
		_reconcile_ambient_goal_wakes(scheduler)
	else:
		_recover_ambient_decision_wakes_after_rebase(scheduler)
	_reconcile_scheduler_movements(scheduler)
	_queue_nearby_conversation_preloads()


func _flush_queued_movement_deltas() -> void:
	var queued := _queued_movement_deltas.duplicate(true)
	_queued_movement_deltas.clear()
	for movement_value in queued:
		if movement_value is Dictionary:
			_queue_or_apply_movement(movement_value as Dictionary)


func _active_movement_summaries() -> Array[Dictionary]:
	var summaries: Array[Dictionary] = []
	for actor_id_value in _active_movements:
		var movement := _dictionary_or_empty(_active_movements[actor_id_value])
		summaries.append({
			"movementId": str(movement.get("movementId", "")),
			"actorId": str(actor_id_value),
			"anchorRef": str(movement.get("anchorRef", "")),
			"activity": str(movement.get("activity", "")),
		})
	summaries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return str(a.get("actorId", "")) < str(b.get("actorId", ""))
	)
	return summaries


func _blocked_movement_summaries() -> Array[Dictionary]:
	var summaries: Array[Dictionary] = []
	for actor_id_value in _blocked_movements:
		var movement := _dictionary_or_empty(_blocked_movements[actor_id_value])
		summaries.append({
			"movementId": str(movement.get("movementId", "")),
			"actorId": str(actor_id_value),
			"anchorRef": str(movement.get("anchorRef", "")),
			"reason": str(movement.get("reason", "")),
			"retryCount": int(movement.get("retryCount", 0)),
			"retryRemaining": float(movement.get("retryRemaining", 0.0)),
		})
	summaries.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return str(a.get("actorId", "")) < str(b.get("actorId", ""))
	)
	return summaries


func _actor_readiness_summaries() -> Array[Dictionary]:
	var summaries: Array[Dictionary] = []
	for actor_value in _array_or_empty(_run_snapshot.get("actors")):
		if not actor_value is Dictionary:
			continue
		var actor := actor_value as Dictionary
		summaries.append({
			"actorId": str(actor.get("actorId", "")),
			"locationId": str(actor.get("locationId", "")),
			"playerConversationReady": bool(
				actor.get("playerConversationReady", false)
			),
		})
	return summaries


func _apply_all_conversation_readiness() -> void:
	for actor_value in _run_snapshot.get("actors", []):
		if actor_value is Dictionary:
			_apply_actor_conversation_readiness(actor_value as Dictionary)


func _apply_actor_conversation_readiness(actor: Dictionary) -> void:
	var actor_id := str(actor.get("actorId", ""))
	var node := _town.get_node_or_null("Actors/%s" % actor_id)
	if node is NPC3D:
		(node as NPC3D).set_conversation_state(
			_actor_conversation_focus_available(actor),
			bool(actor.get("playerConversationReady", false))
		)


func _actor_conversation_focus_available(actor: Dictionary) -> bool:
	var actor_id := str(actor.get("actorId", ""))
	if _run_status != "active" or actor_id.is_empty():
		return false
	if bool(actor.get("playerConversationReady", false)):
		return true
	if actor_id == str(_active_contact.get("actorId", "")):
		return true
	if (
		_conversation_preload_invalidated.has(actor_id)
		or _conversation_preload_recovery_required.has(actor_id)
		or _conversation_preload_in_flight.has(actor_id)
		or _conversation_preload_queued.has(actor_id)
	):
		return true
	for resident_value in _array_or_empty(_social_view.get("encounteredResidents")):
		if (
			resident_value is Dictionary
			and str((resident_value as Dictionary).get("actorId", "")) == actor_id
		):
			return false
	return true


func _finish_conversation_modal() -> void:
	if _run_status != "active":
		return
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_hesitation_retry_scheduled = false
	_conversation_start_retry_required = false
	_conversation_contact_id = ""
	_conversation_contact_zone_id = ""
	_resolving_answer = false
	_ending_conversation = false
	_conversation_target = null
	_hud.close_conversation()
	_restore_conversation_look()
	get_tree().paused = false
	_set_run_clock_paused(false)
	_restore_player_control_if_unlocked()
	_flush_deferred_ambient_speech_events()
	_flush_queued_movement_deltas()
	_resume_active_contact_follow()
	if _advance_needs_rebase:
		call_deferred("_rebase_run_after_advance_conflict")
	else:
		_queue_nearby_conversation_preloads()


func _restore_conversation_look() -> void:
	if not _conversation_return_look_valid:
		return
	_player.set_look_orientation(_conversation_return_look)
	_discard_conversation_look()


func _discard_conversation_look() -> void:
	_conversation_return_look = Vector2.ZERO
	_conversation_return_look_valid = false


func _set_run_clock_paused(value: bool) -> void:
	var clock := _dictionary_or_empty(_run_snapshot.get("worldClock"))
	clock["paused"] = value
	_run_snapshot["worldClock"] = clock


func _replace_run_snapshot(
	authoritative_snapshot: Dictionary,
	preserve_same_run_clock_milestones: bool
) -> void:
	var replacement := authoritative_snapshot.duplicate(true)
	var previous_run_id := str(_run_snapshot.get("runId", ""))
	var replacement_run_id := str(replacement.get("runId", ""))
	var same_run := (
		not previous_run_id.is_empty()
		and previous_run_id == replacement_run_id
	)
	if not same_run:
		_reset_accepted_provider_evidence(replacement_run_id)
	_accept_provider_evidence(replacement, "snapshot")
	if preserve_same_run_clock_milestones:
		var equal_or_newer := (
			int(replacement.get("worldRevision", -1))
			>= int(_run_snapshot.get("worldRevision", 0))
		)
		var replacement_clock_value: Variant = replacement.get("worldClock")
		if (
			same_run
			and equal_or_newer
			and replacement_clock_value is Dictionary
			and bool(
				_dictionary_or_empty(_run_snapshot.get("worldClock")).get(
					"graceEnded",
					false
				)
			)
		):
			# RunService owns both the elapsed clock and the grace transition. Retain
			# an already-observed true milestone when an equal/newer same-run snapshot
			# races with it; never derive time here or carry it across a run boundary.
			var replacement_clock := _dictionary_or_empty(replacement_clock_value)
			replacement_clock["graceEnded"] = true
			replacement["worldClock"] = replacement_clock
	_run_snapshot = replacement
	_overlay_accepted_provider_evidence()


func _pause_safe_timer(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout


func _api_locale() -> String:
	# The first start attempt locks this value for the run. Later language
	# preference changes are persisted for the next run without mixing memories.
	if not _run_start_locale.is_empty():
		return _run_start_locale
	return str(_localization.call("api_locale", _locale_name))


func _apply_social_view_from_response(
	response: Dictionary,
	authoritative_snapshot := false
) -> bool:
	_hydrate_run_lifecycle(response)
	_sync_active_contact_from_response(response, authoritative_snapshot)
	var social_view := _dictionary_or_empty(response.get("socialView"))
	if social_view.is_empty():
		for key in ["runSnapshot", "snapshot"]:
			var nested := _dictionary_or_empty(response.get(key))
			social_view = _dictionary_or_empty(nested.get("socialView"))
			if not social_view.is_empty():
				break
	if social_view.is_empty() or not social_view.has("revision"):
		return false
	var incoming_revision := int(social_view.get("revision", -1))
	var current_revision := int(_social_view.get("revision", -1))
	if incoming_revision < current_revision:
		return false
	_social_view = social_view.duplicate(true)
	if not _run_snapshot.is_empty():
		_run_snapshot["socialView"] = _social_view.duplicate(true)
	_hud.set_social_view(_social_view)
	return true


func _apply_player_brief_from_snapshot(snapshot: Dictionary) -> void:
	if not snapshot.has("playerBrief"):
		return
	var brief_value: Variant = snapshot.get("playerBrief")
	_onboarding.set_player_brief(
		(brief_value as Dictionary).duplicate(true)
		if brief_value is Dictionary
		else {}
	)


func _cache_provider_evidence(
	response: Dictionary,
	source_kind: String = "response"
) -> void:
	if _accept_provider_evidence(response, source_kind):
		_overlay_accepted_provider_evidence()


func _accept_provider_evidence(response: Dictionary, source_kind: String) -> bool:
	var audit_value: Variant = response.get("providerAudit")
	var trace_value: Variant = response.get("providerRuntimeTrace")
	if not audit_value is Dictionary or not trace_value is Dictionary:
		return false
	var candidate_run_id := str(response.get("runId", _run_id))
	if candidate_run_id.is_empty():
		return false
	if (
		not _accepted_provider_evidence_run_id.is_empty()
		and candidate_run_id != _accepted_provider_evidence_run_id
	):
		return false
	var audit := audit_value as Dictionary
	var trace := trace_value as Dictionary
	var candidate_progress := _provider_evidence_progress(audit, trace)
	if not _accepted_provider_audit.is_empty() and not _accepted_provider_runtime_trace.is_empty():
		var current_progress := _provider_evidence_progress(
			_accepted_provider_audit,
			_accepted_provider_runtime_trace
		)
		for index in candidate_progress.size():
			if candidate_progress[index] < current_progress[index]:
				return false
	_accepted_provider_evidence_run_id = candidate_run_id
	_accepted_provider_audit = audit.duplicate(true)
	_accepted_provider_runtime_trace = trace.duplicate(true)
	_accepted_provider_evidence_source = source_kind
	_accepted_provider_evidence_response_revision = int(response.get("worldRevision", -1))
	return true


func _reset_accepted_provider_evidence(run_id: String) -> void:
	_accepted_provider_evidence_run_id = run_id
	_accepted_provider_audit = {}
	_accepted_provider_runtime_trace = {}
	_accepted_provider_evidence_source = "none"
	_accepted_provider_evidence_response_revision = -1


func _overlay_accepted_provider_evidence() -> void:
	if (
		_accepted_provider_evidence_run_id.is_empty()
		or str(_run_snapshot.get("runId", "")) != _accepted_provider_evidence_run_id
		or _accepted_provider_audit.is_empty()
		or _accepted_provider_runtime_trace.is_empty()
	):
		return
	_run_snapshot["providerAudit"] = _accepted_provider_audit.duplicate(true)
	_run_snapshot["providerRuntimeTrace"] = (
		_accepted_provider_runtime_trace.duplicate(true)
	)
	var provider_budget := _dictionary_or_empty(_run_snapshot.get("providerBudget"))
	provider_budget["callsUsed"] = int(_accepted_provider_audit.get("callsUsed", 0))
	provider_budget["tokensUsed"] = int(_accepted_provider_audit.get("tokensUsed", 0))
	_run_snapshot["providerBudget"] = provider_budget


func _provider_evidence_progress(
	audit: Dictionary,
	trace: Dictionary
) -> Array[int]:
	var calls := _array_or_empty(audit.get("calls"))
	var resolutions := _array_or_empty(audit.get("resolutions"))
	var entries := _array_or_empty(trace.get("entries"))
	return [
		int(audit.get("callsUsed", 0)),
		calls.size(),
		resolutions.size() + int(audit.get("droppedCount", 0)),
		entries.size() + int(trace.get("droppedCount", 0)),
	]


func _provider_evidence_freshness_snapshot() -> Dictionary:
	var client_request_in_flight_count := (
		_conversation_preload_in_flight.size()
		+ (1 if _ambient_decision_in_flight else 0)
		+ (1 if _resolving_answer else 0)
	)
	return {
		"clientProviderRequestInFlightCount": client_request_in_flight_count,
		"acceptedRunId": _accepted_provider_evidence_run_id,
		"sourceKind": _accepted_provider_evidence_source,
		"responseWorldRevision": _accepted_provider_evidence_response_revision,
		"progress": _provider_evidence_progress(
			_accepted_provider_audit,
			_accepted_provider_runtime_trace
		),
	}


func _debug_snapshot() -> Dictionary:
	if not OS.is_debug_build():
		return {}
	return {
		"runId": _run_id,
		"worldRevision": _run_snapshot.get("worldRevision", 0),
		"socialRevision": _social_view.get("revision", -1),
		"institutionalPressure": _run_snapshot.get("institutionalPressure", 0),
		"actors": _run_snapshot.get("actors", []),
		"records": _run_snapshot.get("records", []),
		"ledgerEvents": _run_snapshot.get("ledgerEvents", []),
		"providerBudget": _run_snapshot.get("providerBudget", {}),
		"providerAudit": _run_snapshot.get("providerAudit", {}),
		"providerRuntimeTrace": _run_snapshot.get("providerRuntimeTrace", {}),
		"lastProposalMeta": _last_proposal_meta,
		"providerFailure": _provider_failure.duplicate(true),
		"activeContact": _active_contact.duplicate(true),
		"contactPresentation": _contact_presentation_snapshot(),
	}


func _on_provider_failure_retry_requested() -> void:
	if _run_abandon_in_flight or _provider_failure_retry_in_flight:
		return
	var retry_kind := _provider_failure_retry_kind
	if not _provider_failure_retry_supported(
		retry_kind,
		_provider_failure_retry_context
	):
		_hud.set_provider_failure_action_busy(false)
		return
	if retry_kind == "conversation_start" and not _conversation_start_retry_required:
		_hud.set_provider_failure_action_busy(false)
		return
	if retry_kind in ["conversation_answer", "hearing_answer"]:
		var required_answer := _dictionary_or_empty(
			_provider_failure_retry_context.get("answer")
		)
		if required_answer.is_empty() or required_answer != _required_retry_answer:
			_hud.set_provider_failure_action_busy(false)
			return
	_provider_failure_retry_in_flight = true
	match retry_kind:
		"run_start":
			_run_start_halted_reason = ""
			if not await _ensure_run():
				if _run_start_halted_reason.is_empty():
					call_deferred("_initialize_run_background")
		"conversation_start":
			await _on_conversation_end_retry_requested()
		"conversation_answer", "hearing_answer":
			var answer := _dictionary_or_empty(
				_provider_failure_retry_context.get("answer")
			)
			await _submit_answer(answer.duplicate(true))
		"hearing_open":
			_hearing_open_halted_reason = ""
			_hearing_open_retry_remaining = 0.0
			await _dispatch_hearing_open()
	_provider_failure_retry_in_flight = false
	if not _provider_failure.is_empty() and not _run_abandon_in_flight:
		_hud.set_provider_failure_action_busy(false)


func _on_legacy_provider_failure_detected(failure: Dictionary) -> void:
	var retry_kind := ""
	var retry_context: Dictionary = {}
	if _run_id.is_empty():
		retry_kind = "run_start"
	elif not _required_retry_answer.is_empty():
		if _run_status == "hearing_active":
			retry_kind = "hearing_answer"
		elif _run_status == "active" and not _active_session_id.is_empty():
			retry_kind = "conversation_answer"
		if not retry_kind.is_empty():
			retry_context = {"answer": _required_retry_answer.duplicate(true)}
	_present_provider_failure(
		{"providerFailure": failure.duplicate(true)},
		retry_kind,
		retry_context
	)


func _on_provider_failure_restart_requested() -> void:
	if _run_abandon_in_flight or _run_end_in_flight:
		return
	if (
		_provider_failure_retry_in_flight
		or _provider_request_in_flight()
		or not _provider_failure_restart_supported()
	):
		_hud.show_provider_failure_restart_error()
		return
	if _terminal_contract_cleanup_required:
		await _end_terminal_contract_run()
		return
	if _run_abandon_id.is_empty():
		_run_abandon_id = (
			"abandon-fixture-1"
			if _run_session.mode() == "fixture"
			else "godot-abandon-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]
		)
	var run_id := _run_id
	var abandon_id := _run_abandon_id
	_run_abandon_in_flight = true
	_player.set_control_enabled(false)
	_player.release_mouse()
	_hud.set_provider_failure_action_busy(true, &"restart")
	var result: Dictionary = await _run_session.abandon_run(run_id, abandon_id)
	_run_abandon_in_flight = false
	if (
		run_id != _run_id
		or abandon_id != _run_abandon_id
		or _is_error(result)
		or not _valid_run_abandon_response(result, run_id, abandon_id)
	):
		_hud.show_provider_failure_restart_error()
		_restore_player_control_if_unlocked()
		return
	_cache_provider_evidence(result, "run_abandon")
	_reload_current_run_scene(true)


func _end_terminal_contract_run() -> void:
	if _run_end_id.is_empty():
		_run_end_id = _new_run_end_id()
	_run_end_in_flight = true
	_player.set_control_enabled(false)
	_player.release_mouse()
	_hud.set_provider_failure_action_busy(true, &"restart")
	var result: Dictionary = await _run_session.end_run(_run_id, _run_end_id)
	_run_end_in_flight = false
	if (
		_is_error(result)
		or str(result.get("runId", "")) != _run_id
		or str(result.get("endId", "")) != _run_end_id
		or str(result.get("runStatus", "")) != "closed"
	):
		_hud.show_provider_failure_restart_error()
		return
	_hydrate_run_lifecycle(result)
	_run_snapshot["providerBudget"] = _dictionary_or_empty(result.get("providerBudget"))
	_cache_provider_evidence(result)
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	_reload_current_run_scene(true)


func _present_provider_failure(
	response: Dictionary,
	retry_kind := "",
	retry_context: Dictionary = {}
) -> bool:
	var failure := _provider_failure_payload(response)
	if failure.is_empty():
		return false
	if retry_kind.is_empty():
		var same_operation := (
			not _provider_failure.is_empty()
			and (
				str(_provider_failure.get("operationKey", ""))
				== str(failure.get("operationKey", ""))
				or str(_provider_failure.get("operationKey", "")).begins_with(
					"client:"
				)
			)
		)
		if not same_operation:
			_provider_failure_retry_kind = ""
			_provider_failure_retry_context = {}
	else:
		_provider_failure_retry_kind = retry_kind
		_provider_failure_retry_context = retry_context.duplicate(true)
	_provider_failure = failure.duplicate(true)
	_hud.show_provider_failure(
		_provider_failure,
		_provider_failure_retry_supported(
			_provider_failure_retry_kind,
			_provider_failure_retry_context
		),
		_provider_failure_restart_supported()
	)
	return true


func _resolve_provider_failure(
	retry_kind: String,
	_retry_context: Dictionary = {}
) -> void:
	if _provider_failure_retry_kind != retry_kind:
		return
	_provider_failure = {}
	_provider_failure_retry_kind = ""
	_provider_failure_retry_context = {}
	_run_abandon_id = ""
	_hud.clear_provider_failure()


func _sync_provider_failure_marker(authoritative_response: Dictionary) -> void:
	var marker := _provider_failure_marker(authoritative_response)
	if not bool(marker.get("present", false)):
		return
	var value: Variant = marker.get("value")
	if value is Dictionary:
		# A snapshot can race a just-failed exact request at the same world
		# revision. Keep the local immutable retry packet until that packet itself
		# succeeds or fails again; a later marker will be observed after resolution.
		if not _provider_failure_retry_kind.is_empty():
			return
		_present_provider_failure({"providerFailure": value})
		return
	if not _provider_failure_retry_kind.is_empty():
		return
	_provider_failure = {}
	_provider_failure_retry_kind = ""
	_provider_failure_retry_context = {}
	_run_abandon_id = ""
	_hud.clear_provider_failure()


func _provider_failure_retry_supported(
	retry_kind: String,
	retry_context: Dictionary
) -> bool:
	match retry_kind:
		"run_start":
			return _run_id.is_empty()
		"conversation_start":
			return _conversation_target != null
		"conversation_answer":
			return (
				_run_status == "active"
				and not _active_session_id.is_empty()
				and not _dictionary_or_empty(retry_context.get("answer")).is_empty()
			)
		"hearing_answer":
			return (
				_run_status == "hearing_active"
				and not _hearing_id.is_empty()
				and not _dictionary_or_empty(retry_context.get("answer")).is_empty()
			)
		"hearing_open":
			return _run_status == "hearing_due" and not _hearing_id.is_empty()
	return false


func _provider_failure_restart_supported() -> bool:
	return (
		not _provider_failure.is_empty()
		and not _run_id.is_empty()
		and (
			_terminal_contract_cleanup_required
			or _run_status not in ["terminal", "closed"]
		)
	)


func _provider_request_in_flight() -> bool:
	return (
		_run_start_in_flight
		or _conversation_start_in_flight
		or _resolving_answer
		or _ending_conversation
		or _record_encounter_in_flight
		or _advance_in_flight
		or _advance_rebase_in_flight
		or _hearing_open_in_flight
		or _ambient_decision_in_flight
		or not _conversation_preload_in_flight.is_empty()
	)


func _valid_run_abandon_response(
	result: Dictionary,
	expected_run_id: String,
	expected_abandon_id: String
) -> bool:
	var response_failure_value: Variant = result.get("providerFailure")
	var last_meta_value: Variant = result.get("lastProposalMeta")
	if (
		str(result.get("runId", "")) != expected_run_id
		or str(result.get("abandonId", "")) != expected_abandon_id
		or str(result.get("runStatus", "")) != "closed"
		or str(result.get("reason", "")) != "provider_failed"
		or not response_failure_value is Dictionary
		or not result.get("providerBudget", null) is Dictionary
		or not result.get("providerAudit", null) is Dictionary
		or not result.get("providerRuntimeTrace", null) is Dictionary
		or (last_meta_value != null and not last_meta_value is Dictionary)
		or result.has("terminalResult")
		or result.has("verdict")
	):
		return false
	var raw_failure := response_failure_value as Dictionary
	if (
		str(raw_failure.get("profileId", "")).is_empty()
		or str(raw_failure.get("operationKey", "")).is_empty()
		or str(raw_failure.get("reason", "")) not in [
			"missing_credentials",
			"unavailable",
			"timeout",
			"rate_limited",
			"invalid_envelope",
			"budget_exhausted",
			"transport_error",
		]
		or str(raw_failure.get("purpose", "")) not in [
			"conversation",
			"conversation_turn",
			"agent_step",
			"ambient_reply",
			"hearing_verdict",
		]
	):
		return false
	var response_failure := _normalize_provider_failure_payload(
		raw_failure
	)
	if response_failure.is_empty() or _provider_failure.is_empty():
		return false
	for key in ["profileId", "reason", "purpose"]:
		if str(response_failure.get(key, "")) != str(
			_provider_failure.get(key, "")
		):
			return false
	var expected_operation_key := str(_provider_failure.get("operationKey", ""))
	return (
		expected_operation_key.begins_with("client:")
		or expected_operation_key == str(response_failure.get("operationKey", ""))
	)


func _provider_failure_payload(response: Dictionary) -> Dictionary:
	if str(response.get("error", "")) == "provider_failed":
		return _normalize_provider_failure_payload(response)
	var marker := _provider_failure_marker(response)
	var marker_value: Variant = marker.get("value")
	if bool(marker.get("present", false)) and marker_value is Dictionary:
		return _normalize_provider_failure_payload(marker_value as Dictionary)
	for container in [
		response,
		_dictionary_or_empty(response.get("nextTurn")),
		_dictionary_or_empty(response.get("terminalResult")),
		_dictionary_or_empty(response.get("runSnapshot")),
		_dictionary_or_empty(response.get("snapshot")),
	]:
		var candidate := container as Dictionary
		for meta_key in ["proposalMeta", "lastProposalMeta"]:
			var meta := _dictionary_or_empty(candidate.get(meta_key))
			if str(meta.get("transport", "")) == "fallback" or bool(
				meta.get("usedFallback", false)
			):
				return _normalize_provider_failure_payload(meta)
	for meta_value in _array_or_empty(response.get("providerMetas")):
		if not meta_value is Dictionary:
			continue
		var provider_meta := meta_value as Dictionary
		if (
			str(provider_meta.get("transport", "")) == "fallback"
			or bool(provider_meta.get("usedFallback", false))
		):
			return _normalize_provider_failure_payload(provider_meta)
	var audit := _dictionary_or_empty(response.get("providerAudit"))
	for resolution_value in _array_or_empty(audit.get("resolutions")):
		if not resolution_value is Dictionary:
			continue
		var resolution := resolution_value as Dictionary
		if (
			str(resolution.get("transport", "")) == "fallback"
			or bool(resolution.get("usedFallback", false))
		):
			return _normalize_provider_failure_payload(resolution)
	return {}


func _provider_failure_marker(response: Dictionary) -> Dictionary:
	for container in [
		response,
		_dictionary_or_empty(response.get("runSnapshot")),
		_dictionary_or_empty(response.get("snapshot")),
	]:
		var candidate := container as Dictionary
		if candidate.has("providerFailure"):
			return {
				"present": true,
				"value": candidate.get("providerFailure"),
			}
	return {"present": false, "value": null}


func _normalize_provider_failure_payload(failure: Dictionary) -> Dictionary:
	var reason := str(failure.get(
		"reason",
		failure.get("fallbackReason", "transport_error")
	))
	if reason not in [
		"missing_credentials",
		"unavailable",
		"timeout",
		"rate_limited",
		"invalid_envelope",
		"budget_exhausted",
		"transport_error",
	]:
		reason = "transport_error"
	var purpose := str(failure.get("purpose", "conversation_turn"))
	var operation_key := str(failure.get("operationKey", ""))
	if operation_key.is_empty():
		operation_key = "client:%s:%s" % [
			purpose,
			str(failure.get("profileId", "unknown")),
		]
	return {
		"profileId": str(failure.get("profileId", "unknown")),
		"reason": reason,
		"purpose": purpose,
		"operationKey": operation_key,
	}


func _vector3_to_array(value: Vector3) -> Array[float]:
	return [value.x, value.y, value.z]


func _is_error(result: Dictionary) -> bool:
	return result.has("error")


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


func _array_or_empty(value: Variant) -> Array:
	return (value as Array).duplicate(true) if value is Array else []


func _ensure_sfx_bus() -> void:
	if AudioServer.get_bus_index(&"SFX") >= 0:
		return
	AudioServer.add_bus()
	AudioServer.set_bus_name(AudioServer.bus_count - 1, &"SFX")


func _apply_audio_settings() -> void:
	_set_bus_volume(&"Master", _master_volume)
	_set_bus_volume(&"SFX", _sfx_volume)


func _set_bus_volume(bus_name: StringName, linear_volume: float) -> void:
	var bus_index := AudioServer.get_bus_index(bus_name)
	if bus_index < 0:
		return
	var clamped := clampf(linear_volume, 0.0, 1.0)
	AudioServer.set_bus_mute(bus_index, is_zero_approx(clamped))
	AudioServer.set_bus_volume_db(bus_index, linear_to_db(maxf(clamped, 0.0001)))


func _load_preferences() -> void:
	_locale_name = str(_localization.call("default_locale"))
	var config := ConfigFile.new()
	if config.load(SETTINGS_PATH) != OK:
		return
	_player.set_look_settings(
		float(config.get_value("look", "sensitivity", _player.get("mouse_sensitivity"))),
		bool(config.get_value("look", "invert_y", _player.get("invert_y"))),
		float(config.get_value("look", "fov", _player.get("field_of_view")))
	)
	_ui_scale = clampf(float(config.get_value("display", "ui_scale", DEFAULT_UI_SCALE)), 0.8, 1.5)
	_master_volume = clampf(
		float(config.get_value("audio", "master_volume", DEFAULT_MASTER_VOLUME)),
		0.0,
		1.0
	)
	_sfx_volume = clampf(
		float(config.get_value("audio", "sfx_volume", DEFAULT_SFX_VOLUME)),
		0.0,
		1.0
	)
	_locale_name = str(config.get_value("localization", "locale", _locale_name))


func _save_preferences() -> void:
	var config := ConfigFile.new()
	config.load(SETTINGS_PATH)
	config.set_value("look", "sensitivity", float(_player.get("mouse_sensitivity")))
	config.set_value("look", "invert_y", bool(_player.get("invert_y")))
	config.set_value("look", "fov", float(_player.get("field_of_view")))
	config.set_value("display", "ui_scale", _ui_scale)
	config.set_value("audio", "master_volume", _master_volume)
	config.set_value("audio", "sfx_volume", _sfx_volume)
	config.set_value("localization", "locale", _locale_name)
	var error := config.save(SETTINGS_PATH)
	if error != OK:
		push_warning("Could not save 3D client preferences: %s" % error_string(error))
