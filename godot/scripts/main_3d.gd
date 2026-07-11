extends Node

const SETTINGS_PATH := "user://m3r_settings.cfg"
const DEFAULT_UI_SCALE := 1.0
const DEFAULT_MASTER_VOLUME := 0.8
const DEFAULT_SFX_VOLUME := 0.8
const CONVERSATION_ERROR_HOLD_SECONDS := 1.5
const CONVERSATION_END_HOLD_SECONDS := 0.35
const STUDIO_INTERACTION_ZONE_ID := "StudioReceptionConversation"

@onready var _town: Town3D = $Town
@onready var _player: CharacterBody3D = $Town/Actors/Player3D
@onready var _hud: HUD3D = $HUD3D
@onready var _run_session: RunSession3D = $RunSession
@onready var _studio_receptionist: NPC3D = $Town/Actors/NPC_Studio_Receptionist
@onready var _localization: Node = get_node("/root/Localization")

var _ui_scale := DEFAULT_UI_SCALE
var _master_volume := DEFAULT_MASTER_VOLUME
var _sfx_volume := DEFAULT_SFX_VOLUME
var _locale_name := "ko"
var _run_id := ""
var _active_session_id := ""
var _run_snapshot: Dictionary = {}
var _active_turn: Dictionary = {}
var _last_proposal_meta: Dictionary = {}
var _conversation_target: NPC3D
var _run_start_in_flight := false
var _resolving_answer := false
var _ending_conversation := false
var _required_retry_answer: Dictionary = {}


func _ready() -> void:
	_ensure_sfx_bus()
	_load_preferences()
	if not bool(_localization.call("set_locale", _locale_name)):
		_locale_name = "ko"
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
	_studio_receptionist.conversation_requested.connect(
		_on_conversation_requested.bind(_studio_receptionist)
	)
	_hud.configure_look_settings(
		float(_player.get("mouse_sensitivity")),
		bool(_player.get("invert_y")),
		float(_player.get("field_of_view"))
	)
	_hud.configure_preferences(_ui_scale, _master_volume, _sfx_volume, _locale_name)
	_hud.set_ui_scale(_ui_scale)
	_hud.refresh_localized_text()
	_apply_audio_settings()


func presentation_snapshot() -> Dictionary:
	var town_snapshot := _town.presentation_snapshot()
	return {
		"locationId": town_snapshot.get("locationId", ""),
		"worldRevision": town_snapshot.get("worldRevision", ""),
		"runWorldRevision": _run_snapshot.get("worldRevision", 0),
		"runId": _run_id,
		"sessionMode": _run_session.mode(),
		"transitioning": false,
		"resolvingAnswer": _resolving_answer or _ending_conversation,
		"currentTurn": _active_turn.duplicate(true),
		"encounteredStances": _hud.presentation_snapshot().get("encounteredStances", []),
		"institutionalPressure": {
			"level": _run_snapshot.get("institutionalPressure", 0),
			"summary": str(_run_snapshot.get("institutionalPressure", 0)),
		} if not _run_snapshot.is_empty() else {},
		"provider": _last_proposal_meta.duplicate(true),
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
	if not bool(_localization.call("set_locale", locale_name)):
		return
	_locale_name = str(_localization.call("locale"))
	_hud.refresh_localized_text()
	_hud.configure_preferences(_ui_scale, _master_volume, _sfx_volume, _locale_name)
	_save_preferences()


func _on_conversation_requested(actor_id: StringName, target: NPC3D) -> void:
	if _conversation_target != null or _resolving_answer or _ending_conversation:
		return
	_conversation_target = target
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_player.call("face_position", target.global_position + Vector3.UP * 1.35)
	_player.set_control_enabled(false)
	_player.release_mouse()
	_hud.begin_conversation(_actor_view(str(actor_id)))
	get_tree().paused = true

	if not await _ensure_run():
		_hud.show_conversation_error(&"hud.m3r.error.run_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	_hud.begin_conversation(_actor_view(str(actor_id)))
	var result: Dictionary = await _run_session.start_conversation(
		_run_id,
		str(actor_id),
		STUDIO_INTERACTION_ZONE_ID,
		str(_run_snapshot.get("locale", _api_locale()))
	)
	if _is_error(result):
		_hud.show_conversation_error(&"hud.m3r.error.conversation_start")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()
		return

	_active_session_id = str(result.get("sessionId", ""))
	_active_turn = _dictionary_or_empty(result.get("nextTurn"))
	_run_snapshot["worldRevision"] = int(result.get("worldRevision", 0))
	_run_snapshot["activeConversationId"] = _active_session_id
	_set_run_clock_paused(true)
	_update_run_actor(_dictionary_or_empty(result.get("actor")))
	_last_proposal_meta = _dictionary_or_empty(_active_turn.get("proposalMeta"))
	_run_snapshot["lastProposalMeta"] = _last_proposal_meta.duplicate(true)
	if _active_session_id.is_empty() or _active_turn.is_empty() or not _hud.show_turn(_active_turn):
		_hud.show_conversation_error(&"hud.m3r.error.invalid_response")
		await _pause_safe_timer(CONVERSATION_ERROR_HOLD_SECONDS)
		_finish_conversation_modal()


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
	_run_snapshot["activeConversationId"] = null
	_set_run_clock_paused(false)
	_update_run_actor(_dictionary_or_empty(result.get("actor")))
	if _conversation_target != null:
		_conversation_target.conversation_enabled = false
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
	var result: Dictionary = await _run_session.start_run(_api_locale())
	_run_start_in_flight = false
	if _is_error(result):
		return false
	var town_snapshot := _town.presentation_snapshot()
	if (
		str(result.get("worldId", "")) != str(town_snapshot.get("layoutId", ""))
		or str(result.get("layoutRevision", "")) != str(town_snapshot.get("worldRevision", ""))
	):
		push_error("RunService topology does not match the loaded 3D town.")
		return false
	_run_id = str(result.get("runId", ""))
	if _run_id.is_empty():
		return false
	_run_snapshot = result.duplicate(true)
	_last_proposal_meta = _dictionary_or_empty(result.get("lastProposalMeta"))
	return true


func _actor_view(actor_id: String) -> Dictionary:
	for actor_value in _run_snapshot.get("actors", []):
		if actor_value is Dictionary and str((actor_value as Dictionary).get("actorId", "")) == actor_id:
			return (actor_value as Dictionary).duplicate(true)
	return {"actorId": actor_id}


func _update_run_actor(actor: Dictionary) -> void:
	if actor.is_empty():
		return
	var actors_value: Variant = _run_snapshot.get("actors", [])
	if not actors_value is Array:
		return
	var actors := actors_value as Array
	for index in actors.size():
		var current: Variant = actors[index]
		if current is Dictionary and str((current as Dictionary).get("actorId", "")) == str(actor.get("actorId", "")):
			actors[index] = actor.duplicate(true)
			return


func _finish_conversation_modal() -> void:
	_active_session_id = ""
	_active_turn = {}
	_required_retry_answer = {}
	_resolving_answer = false
	_ending_conversation = false
	_conversation_target = null
	_hud.close_conversation()
	_player.set_control_enabled(true)
	_player.capture_mouse()
	get_tree().paused = false


func _set_run_clock_paused(value: bool) -> void:
	var clock := _dictionary_or_empty(_run_snapshot.get("worldClock"))
	clock["paused"] = value
	_run_snapshot["worldClock"] = clock


func _pause_safe_timer(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout


func _api_locale() -> String:
	# Korean is the authored M3R gameplay language in this milestone. The
	# language setting already localizes client chrome; live conversation
	# locale parity is scheduled for the later localization milestone.
	return "ko-KR"


func _is_error(result: Dictionary) -> bool:
	return result.has("error")


func _dictionary_or_empty(value: Variant) -> Dictionary:
	return (value as Dictionary).duplicate(true) if value is Dictionary else {}


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
	_locale_name = str(config.get_value("localization", "locale", "ko"))


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
