extends Node

const SETTINGS_PATH := "user://m3r_settings.cfg"
const DEFAULT_UI_SCALE := 1.0
const DEFAULT_MASTER_VOLUME := 0.8
const DEFAULT_SFX_VOLUME := 0.8

@onready var _town: Town3D = $Town
@onready var _player: CharacterBody3D = $Town/Actors/Player3D
@onready var _hud: HUD3D = $HUD3D
@onready var _localization: Node = get_node("/root/Localization")

var _ui_scale := DEFAULT_UI_SCALE
var _master_volume := DEFAULT_MASTER_VOLUME
var _sfx_volume := DEFAULT_SFX_VOLUME
var _locale_name := "ko"


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
		"sessionMode": OS.get_environment("DREAM_SESSION_MODE"),
		"transitioning": false,
		"resolvingAnswer": false,
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
