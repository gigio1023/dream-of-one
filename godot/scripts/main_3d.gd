extends Node

const SETTINGS_PATH := "user://m3r_settings.cfg"
const DEFAULT_UI_SCALE := 1.0
const DEFAULT_MASTER_VOLUME := 0.8
const DEFAULT_SFX_VOLUME := 0.8
const CONVERSATION_ERROR_HOLD_SECONDS := 1.5
const CONVERSATION_END_HOLD_SECONDS := 0.35
const CONVERSATION_START_RETRY_ATTEMPTS := 3
const CONVERSATION_PRELOAD_MAX_IN_FLIGHT := 1
const CONVERSATION_PRELOAD_MAX_RETRIES := 3
const CONVERSATION_PRELOAD_RETRY_SECONDS := 1.0
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
const AMBIENT_DECISION_RETRY_SECONDS := 1.0

@onready var _town: Town3D = $Town
@onready var _player: CharacterBody3D = $Town/Actors/Player3D
@onready var _hud: HUD3D = $HUD3D
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
var _conversation_preload_queue: Array[String] = []
var _conversation_preload_queued: Dictionary = {}
var _conversation_preload_in_flight: Dictionary = {}
var _conversation_preload_requeue_requested: Dictionary = {}
var _conversation_preload_retries: Dictionary = {}
var _conversation_preload_refresh_required := false
var _advance_elapsed_buffer := 0.0
var _advance_in_flight := false
var _advance_rebase_in_flight := false
var _advance_needs_rebase := false
var _advance_retry_remaining := 0.0
var _arrival_batch_remaining := -1.0
var _advance_sequence := 0
var _pending_advance_request: Dictionary = {}
var _queued_arrivals: Array[Dictionary] = []
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


func _ready() -> void:
	_ensure_sfx_bus()
	_load_preferences()
	if not bool(_localization.call("set_locale", _locale_name)):
		_locale_name = str(_localization.call("default_locale"))
		_localization.call("set_locale", _locale_name)
	else:
		_locale_name = str(_localization.call("locale"))
	_player.focus_changed.connect(_hud.set_focus)
	_player.settings_requested.connect(_hud.open_settings)
	_hud.settings_visibility_changed.connect(_on_settings_visibility_changed)
	_hud.look_settings_changed.connect(_on_look_settings_changed)
	_hud.ui_scale_requested.connect(_on_ui_scale_requested)
	_hud.audio_settings_requested.connect(_on_audio_settings_requested)
	_hud.language_requested.connect(_on_language_requested)
	_hud.choice_submitted.connect(_on_choice_submitted)
	_hud.free_input_submitted.connect(_on_free_input_submitted)
	_hud.conversation_end_retry_requested.connect(_on_conversation_end_retry_requested)
	_hud.ambient_subtitle_started.connect(_on_ambient_subtitle_started)
	for actor_value in get_tree().get_nodes_in_group(&"npc_actors"):
		if actor_value is NPC3D:
			var actor := actor_value as NPC3D
			actor.movement_arrived.connect(_on_npc_movement_arrived)
			actor.movement_blocked.connect(_on_npc_movement_blocked)
			actor.conversation_requested.connect(_on_conversation_requested.bind(actor))
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
	if get_tree().paused or _conversation_target != null:
		return
	if _run_id.is_empty() or _run_start_in_flight:
		return
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
		is_zero_approx(_arrival_batch_remaining)
		if not _queued_arrivals.is_empty()
		else _advance_elapsed_buffer >= _advance_batch_seconds()
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
		"sessionMode": _run_session.mode(),
		"runLocale": _run_snapshot.get("locale", _run_start_locale),
		"presentationLocale": hud_snapshot.get("locale", ""),
		"nextRunLocale": str(_localization.call("api_locale", _locale_name)),
		"languageAppliesNextRun": hud_snapshot.get("languageAppliesNextRun", false),
		"transitioning": false,
		"resolvingAnswer": _resolving_answer or _ending_conversation,
		"currentTurn": _active_turn.duplicate(true),
		"encounteredStances": hud_snapshot.get("encounteredStances", []),
		"institutionalPressure": {
			"level": _run_snapshot.get("institutionalPressure", 0),
			"summary": str(_run_snapshot.get("institutionalPressure", 0)),
		} if not _run_snapshot.is_empty() else {},
		"provider": _last_proposal_meta.duplicate(true),
		"providerBudget": _dictionary_or_empty(_run_snapshot.get("providerBudget")),
		"actors": _actor_readiness_summaries(),
		"worldClock": _dictionary_or_empty(_run_snapshot.get("worldClock")),
		"scheduler": _dictionary_or_empty(_run_snapshot.get("scheduler")),
		"scheduleWakes": _recent_schedule_wakes.duplicate(true),
		"arrivals": {
			"applied": _last_arrivals_applied.duplicate(true),
			"rejected": _last_arrivals_rejected.duplicate(true),
			"queuedCount": _queued_arrivals.size(),
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
	}


func _on_settings_visibility_changed(visible: bool) -> void:
	_player.set_control_enabled(not visible)
	if visible:
		_player.release_mouse()
	else:
		_player.capture_mouse()


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


func _on_conversation_requested(actor_id: StringName, target: NPC3D) -> void:
	if _conversation_target != null or _resolving_answer or _ending_conversation:
		return
	_conversation_target = target
	for in_flight_actor_id in _conversation_preload_in_flight:
		_conversation_preload_requeue_requested[str(in_flight_actor_id)] = true
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_conversation_start_retry_required = false
	_player.call("face_position", target.global_position + Vector3.UP * 1.35)
	_player.set_control_enabled(false)
	_player.release_mouse()
	_hud.begin_conversation(_actor_view(str(actor_id)))
	get_tree().paused = true
	if not await _settle_advance_lane_for_conversation():
		_hud.show_conversation_error(&"hud.m3r.error.run_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	if not await _ensure_run():
		_hud.show_conversation_error(&"hud.m3r.error.run_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return
	if not bool(_actor_view(str(actor_id)).get("playerConversationReady", false)):
		_advance_needs_rebase = true
		_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	_hud.begin_conversation(_actor_view(str(actor_id)))
	var result: Dictionary = await _start_conversation_with_retry(str(actor_id))
	await _handle_conversation_start_result(result)


func _handle_conversation_start_result(result: Dictionary) -> void:
	if _is_error(result):
		if str(result.get("error", "")) == "conversation_not_ready":
			var actor_id := (
				str(_conversation_target.actor_id) if _conversation_target != null else ""
			)
			var actor := _actor_view(actor_id)
			if not actor.is_empty():
				actor["playerConversationReady"] = false
				_update_run_actor(actor)
			_advance_needs_rebase = true
		if str(result.get("error", "")) == "conversation_start_retry_required":
			_conversation_start_retry_required = true
			_hud.show_conversation_start_retry()
			return
		_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	_active_session_id = str(result.get("sessionId", ""))
	_active_turn = _dictionary_or_empty(result.get("nextTurn"))
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	_spatial_facts_dirty = true
	_run_snapshot["activeConversationId"] = _active_session_id
	_set_run_clock_paused(true)
	_update_run_actor(_dictionary_or_empty(result.get("actor")))
	_last_proposal_meta = _dictionary_or_empty(_active_turn.get("proposalMeta"))
	_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	if _active_session_id.is_empty() or _active_turn.is_empty() or not _hud.show_turn(_active_turn):
		_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()


func _start_conversation_with_retry(actor_id: String) -> Dictionary:
	var interaction_zone_id := _conversation_zone_for_actor(actor_id)
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
			str(_run_snapshot.get("locale", _api_locale()))
		)
		if not _is_error(result):
			return result
		if str(result.get("error", "")) != "conversation_start_failed":
			return result
		# The server may already have committed this start. RunService returns
		# the existing active turn for the same run/actor, so remain modal and
		# retry instead of orphaning a paused runtime conversation.
		if attempt < CONVERSATION_START_RETRY_ATTEMPTS - 1:
			_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
			await _pause_safe_timer(retry_seconds)
			retry_seconds = minf(8.0, retry_seconds * 2.0)
	return {"error": "conversation_start_retry_required"}


func _on_choice_submitted(choice_id: String) -> void:
	await _submit_answer({"type": "choice", "choiceId": choice_id})


func _on_free_input_submitted(text: String) -> void:
	await _submit_answer({"type": "free_input", "text": text.strip_edges()})


func _submit_answer(answer_payload: Dictionary) -> void:
	if (
		_resolving_answer
		or _ending_conversation
		or _active_session_id.is_empty()
		or _active_turn.is_empty()
	):
		return
	if not _required_retry_answer.is_empty() and answer_payload != _required_retry_answer:
		_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
		return

	_resolving_answer = true
	_hud.set_conversation_busy(true)
	var result: Dictionary = await _run_session.answer(
		_run_id,
		_active_session_id,
		str(_active_turn.get("turnId", "")),
		answer_payload
	)
	_resolving_answer = false
	if _is_error(result):
		if _run_session.mode() == "fixture" and str(result.get("error", "")) == "fixture_replay_miss":
			_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
			await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
			_finish_conversation_modal()
			return
		_required_retry_answer = answer_payload.duplicate(true)
		_hud.show_conversation_error(&"hud.m3r.error.conversation_answer")
		return

	_required_retry_answer = {}
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


func _on_conversation_end_retry_requested() -> void:
	if _conversation_start_retry_required and _active_session_id.is_empty():
		_conversation_start_retry_required = false
		_hud.set_conversation_busy(true)
		var actor_id := str(_conversation_target.actor_id) if _conversation_target != null else ""
		if actor_id.is_empty():
			_finish_conversation_modal()
			return
		var result: Dictionary = await _start_conversation_with_retry(actor_id)
		await _handle_conversation_start_result(result)
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
	_run_start_last_error = {}
	_run_start_attempts = 0
	_fixture_replay_complete = false
	_run_snapshot = result.duplicate(true)
	_spatial_facts_dirty = true
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	_ingest_ambient_snapshot(result)
	_apply_all_conversation_readiness()
	_queue_initial_conversation_preloads()
	_reconcile_scheduler_movements(_dictionary_or_empty(result.get("scheduler")))
	return true


func _actor_view(actor_id: String) -> Dictionary:
	for actor_value in _run_snapshot.get("actors", []):
		if actor_value is Dictionary and str((actor_value as Dictionary).get("actorId", "")) == actor_id:
			return (actor_value as Dictionary).duplicate(true)
	return {"actorId": actor_id}


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


func _queue_initial_conversation_preloads() -> void:
	for actor_value in _run_snapshot.get("actors", []):
		if not actor_value is Dictionary:
			continue
		var actor := actor_value as Dictionary
		if not bool(actor.get("playerConversationReady", false)):
			_queue_conversation_preload(str(actor.get("actorId", "")))
	_pump_conversation_preloads()


func _queue_conversation_preload(actor_id: String) -> void:
	if actor_id.is_empty() or _run_id.is_empty():
		return
	var actor := _actor_view(actor_id)
	if actor.is_empty() or bool(actor.get("playerConversationReady", false)):
		return
	if _conversation_preload_in_flight.has(actor_id):
		_conversation_preload_requeue_requested[actor_id] = true
		return
	if _conversation_preload_queued.has(actor_id):
		return
	_conversation_preload_queued[actor_id] = true
	_conversation_preload_queue.append(actor_id)
	_pump_conversation_preloads()


func _pump_conversation_preloads() -> void:
	if get_tree().paused or _conversation_target != null:
		return
	while (
		_conversation_preload_in_flight.size() < CONVERSATION_PRELOAD_MAX_IN_FLIGHT
		and not _conversation_preload_queue.is_empty()
	):
		var actor_id: String = _conversation_preload_queue.pop_front()
		_conversation_preload_queued.erase(actor_id)
		if bool(_actor_view(actor_id).get("playerConversationReady", false)):
			continue
		_conversation_preload_in_flight[actor_id] = true
		_dispatch_conversation_preload(actor_id)
	if (
		_conversation_preload_in_flight.is_empty()
		and _conversation_preload_queue.is_empty()
		and _conversation_preload_refresh_required
	):
		_conversation_preload_refresh_required = false
		_advance_needs_rebase = true
		call_deferred("_rebase_run_after_advance_conflict")


func _dispatch_conversation_preload(actor_id: String) -> void:
	var interaction_zone_id := _conversation_zone_for_actor(actor_id)
	if interaction_zone_id.is_empty():
		_conversation_preload_in_flight.erase(actor_id)
		call_deferred("_pump_conversation_preloads")
		return
	var result: Dictionary = await _run_session.preload_conversation(
		_run_id,
		actor_id,
		interaction_zone_id,
		str(_run_snapshot.get("locale", _api_locale()))
	)
	_conversation_preload_in_flight.erase(actor_id)
	var transport_retry_scheduled := false
	if not _is_error(result):
		_conversation_preload_retries.erase(actor_id)
		_conversation_preload_refresh_required = true
		var current_revision := int(_run_snapshot.get("worldRevision", 0))
		var response_revision := int(result.get("worldRevision", 0))
		if response_revision < current_revision:
			# A newer movement/evidence delta may already have invalidated this
			# actor. Rebase instead of letting the late opening re-enable it.
			_advance_needs_rebase = true
		else:
			_run_snapshot["worldRevision"] = response_revision
			_spatial_facts_dirty = true
			_update_run_actor(_dictionary_or_empty(result.get("actor")))
			_last_proposal_meta = _dictionary_or_empty(result.get("proposalMeta"))
			_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	elif str(result.get("error", "")) == "conversation_preload_failed":
		var retry_count := int(_conversation_preload_retries.get(actor_id, 0)) + 1
		_conversation_preload_retries[actor_id] = retry_count
		if retry_count <= CONVERSATION_PRELOAD_MAX_RETRIES:
			transport_retry_scheduled = true
			_retry_conversation_preload(
				actor_id,
				CONVERSATION_PRELOAD_RETRY_SECONDS * pow(2.0, retry_count - 1)
			)
	if _conversation_preload_requeue_requested.has(actor_id):
		_conversation_preload_requeue_requested.erase(actor_id)
		if (
			not transport_retry_scheduled
			and not bool(_actor_view(actor_id).get("playerConversationReady", false))
		):
			call_deferred("_queue_conversation_preload", actor_id)
	call_deferred("_pump_conversation_preloads")


func _retry_conversation_preload(actor_id: String, delay_seconds: float) -> void:
	await _pause_safe_timer(delay_seconds)
	_queue_conversation_preload(actor_id)


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


func _prepare_advance_request() -> void:
	if not _pending_advance_request.is_empty() or _run_id.is_empty():
		return
	var elapsed_seconds := (
		0
		if not _queued_arrivals.is_empty()
		else mini(int(floor(_advance_elapsed_buffer)), ADVANCE_MAX_SECONDS)
	)
	var arrivals: Array[Dictionary] = []
	var selected_actor_ids: Dictionary = {}
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
	if elapsed_seconds <= 0 and arrivals.is_empty():
		return
	var observed_world_revision := int(_run_snapshot.get("worldRevision", 0))
	var spatial_facts_packet: Dictionary = {}
	if (
		_spatial_facts_dirty
		or not arrivals.is_empty()
		or not _active_movements.is_empty()
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


func _apply_advance_response(result: Dictionary) -> void:
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
	var current_revision := int(_run_snapshot.get("worldRevision", 0))
	var response_revision := int(result.get("worldRevision", current_revision))
	if response_revision < current_revision:
		_advance_needs_rebase = true
		return
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
	var scheduler := _dictionary_or_empty(result.get("scheduler"))
	if not scheduler.is_empty():
		_run_snapshot["scheduler"] = scheduler.duplicate(true)
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
	if not _ambient_pending_request.is_empty() or _ambient_wake_queue.is_empty():
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
	_ambient_decision_waiting_for_resume = false


func _dispatch_ambient_decision() -> void:
	if _ambient_decision_in_flight or _ambient_pending_request.is_empty():
		return
	if (
		_ambient_decision_waiting_for_resume
		and (get_tree().paused or _conversation_target != null)
	):
		return
	_ambient_decision_in_flight = true
	var request := _ambient_pending_request.duplicate(true)
	var result: Dictionary = await _run_session.npc_decision(request)
	_ambient_decision_in_flight = false
	if request != _ambient_pending_request:
		_ambient_decision_halted_reason = "in_flight_packet_changed"
		push_error("Ambient NPC decision lane changed an immutable request.")
		return
	if _is_error(result):
		var error_code := str(result.get("error", "npc_decision_failed"))
		if error_code == "npc_decision_failed":
			_ambient_decision_retry_remaining = AMBIENT_DECISION_RETRY_SECONDS
			return
		_ambient_decision_halted_reason = error_code
		push_error("Ambient NPC decision lane halted: %s" % error_code)
		return

	_ambient_last_decision_status = str(result.get("status", "failed"))
	_ambient_last_decision_kind = str(result.get("decisionKind", ""))
	_ambient_last_wake_kind = str(result.get("wakeKind", ""))
	_ambient_last_actor_ids = _array_or_empty(result.get("actorIds"))
	_ambient_provider_metas = _array_or_empty(result.get("providerMetas"))
	_run_snapshot["worldRevision"] = maxi(
		int(_run_snapshot.get("worldRevision", 0)),
		int(result.get("worldRevision", 0))
	)
	_spatial_facts_dirty = true
	match _ambient_last_decision_status:
		"completed":
			_ambient_pending_request = {}
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
			_ambient_pending_request = {}
			_ambient_decision_waiting_for_resume = false
			_ambient_active_conversation = null
		_:
			_ambient_decision_halted_reason = "invalid_decision_status"
			push_error("Ambient NPC decision returned an unknown status.")


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
	var actors := _town.npc_spatial_facts()
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
	return {
		"observedWorldRevision": observed_world_revision,
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
			_:
				push_warning("Ignoring unknown runtime action delta kind: %s" % delta.get("kind", ""))


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
	if target_kind == "actor":
		var target := _town.get_node_or_null("Actors/%s" % target_id) as NPC3D
		if target == null:
			push_warning("Ignoring look delta with an unavailable target resident.")
			return
		actor.face_position(target.global_position + Vector3.UP * 1.35)
		return
	# Object and record look targets cannot be valid until a canonical 3D
	# semantic object id is included in visibleObjectIds by Town3D.
	push_warning("Ignoring unavailable %s look target: %s" % [target_kind, target_id])


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
		if (
			not bool(actor.get("playerConversationReady", false))
			and _conversation_preload_in_flight.has(actor_id)
		):
			_conversation_preload_requeue_requested[actor_id] = true
		var reason := str(delta.get("reason", ""))
		if reason == "preload_required":
			_conversation_preload_retries.erase(actor_id)
		if (
			not bool(actor.get("playerConversationReady", false))
			and reason in ["opening_invalidated", "evidence_changed", "preload_required"]
		):
			_queue_conversation_preload(actor_id)


func _queue_or_apply_movement(movement: Dictionary) -> void:
	_spatial_facts_dirty = true
	if get_tree().paused or _conversation_target != null:
		var actor_id := str(movement.get("actorId", ""))
		for index in range(_queued_movement_deltas.size() - 1, -1, -1):
			if str(_queued_movement_deltas[index].get("actorId", "")) == actor_id:
				_queued_movement_deltas.remove_at(index)
		_queued_movement_deltas.append(movement.duplicate(true))
		return
	_apply_movement_delta(movement)


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
	return {
		"advanceId": str(request.get("advanceId", "")),
		"observedWorldRevision": int(request.get("observedWorldRevision", -1)),
		"afterSpeechSeq": int(request.get("afterSpeechSeq", 0)),
		"elapsedSeconds": float(request.get("elapsedSeconds", 0.0)),
		"arrivalCount": (arrivals_value as Array).size() if arrivals_value is Array else 0,
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


func _settle_advance_lane_for_conversation() -> bool:
	while _advance_in_flight:
		await get_tree().process_frame
	while _advance_rebase_in_flight:
		await get_tree().process_frame
	if not _pending_advance_request.is_empty():
		_advance_retry_remaining = 0.0
		await _dispatch_advance()
		while _advance_in_flight:
			await get_tree().process_frame
	if _advance_needs_rebase:
		await _rebase_run_after_advance_conflict()
		while _advance_rebase_in_flight:
			await get_tree().process_frame
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
	_run_snapshot = result.duplicate(true)
	_run_snapshot["worldRevision"] = maxi(current_revision, snapshot_revision)
	_spatial_facts_dirty = true
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	_apply_all_conversation_readiness()
	_reconcile_scheduler_movements(_dictionary_or_empty(result.get("scheduler")))
	_advance_needs_rebase = false
	_advance_retry_remaining = 0.0
	_queue_initial_conversation_preloads()


func _flush_queued_movement_deltas() -> void:
	var queued := _queued_movement_deltas.duplicate(true)
	_queued_movement_deltas.clear()
	for movement_value in queued:
		if movement_value is Dictionary:
			_apply_movement_delta(movement_value as Dictionary)


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
		(node as NPC3D).conversation_enabled = bool(
			actor.get("playerConversationReady", false)
		)


func _finish_conversation_modal() -> void:
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_conversation_start_retry_required = false
	_resolving_answer = false
	_ending_conversation = false
	_conversation_target = null
	_hud.close_conversation()
	_player.set_control_enabled(true)
	_player.capture_mouse()
	get_tree().paused = false
	_flush_deferred_ambient_speech_events()
	_flush_queued_movement_deltas()
	if _advance_needs_rebase:
		call_deferred("_rebase_run_after_advance_conflict")
	else:
		_queue_initial_conversation_preloads()


func _set_run_clock_paused(value: bool) -> void:
	var clock := _dictionary_or_empty(_run_snapshot.get("worldClock"))
	clock["paused"] = value
	_run_snapshot["worldClock"] = clock


func _pause_safe_timer(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout


func _api_locale() -> String:
	# The first start attempt locks this value for the run. Later language
	# preference changes are persisted for the next run without mixing memories.
	if not _run_start_locale.is_empty():
		return _run_start_locale
	return str(_localization.call("api_locale", _locale_name))


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
