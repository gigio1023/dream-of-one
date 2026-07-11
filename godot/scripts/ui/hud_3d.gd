class_name HUD3D
extends CanvasLayer

signal settings_visibility_changed(visible: bool)
signal look_settings_changed(sensitivity: float, inverted: bool, fov: float)
signal ui_scale_requested(scale: float)
signal audio_settings_requested(master_volume: float, sfx_volume: float)
signal language_requested(locale_name: String)

const UI_SCALE_OPTIONS: Array[float] = [0.8, 1.0, 1.25, 1.5]
const LANGUAGE_OPTIONS: Array[String] = ["ko", "en"]

@onready var _reticle: Label = %Reticle
@onready var _start_hint: Label = %StartHint
@onready var _prompt_panel: PanelContainer = %PromptPanel
@onready var _prompt_label: Label = %PromptLabel
@onready var _settings_shade: ColorRect = %SettingsShade
@onready var _settings_title: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SettingsTitle
@onready var _sensitivity_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SensitivityLabel
@onready var _sensitivity_slider: HSlider = %SensitivitySlider
@onready var _invert_y_check: CheckButton = %InvertYCheck
@onready var _fov_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/FovLabel
@onready var _fov_slider: HSlider = %FovSlider
@onready var _ui_scale_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/UiScaleLabel
@onready var _ui_scale_option: OptionButton = %UiScaleOption
@onready var _master_volume_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/MasterVolumeLabel
@onready var _master_volume_slider: HSlider = %MasterVolumeSlider
@onready var _sfx_volume_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/SfxVolumeLabel
@onready var _sfx_volume_slider: HSlider = %SfxVolumeSlider
@onready var _language_label: Label = $Overlay/SettingsShade/SettingsPanel/SettingsMargin/SettingsColumns/LanguageLabel
@onready var _language_option: OptionButton = %LanguageOption
@onready var _close_settings_button: Button = %CloseSettingsButton

var _settings_visible := false
var _focused_target: Node
var _runtime_theme: Theme


func _ready() -> void:
	_populate_ui_scale_options()
	_apply_localized_text()
	_sensitivity_slider.value_changed.connect(_on_look_setting_changed)
	_invert_y_check.toggled.connect(_on_invert_y_toggled)
	_fov_slider.value_changed.connect(_on_look_setting_changed)
	_ui_scale_option.item_selected.connect(_on_ui_scale_selected)
	_master_volume_slider.value_changed.connect(_on_audio_setting_changed)
	_sfx_volume_slider.value_changed.connect(_on_audio_setting_changed)
	_language_option.item_selected.connect(_on_language_selected)
	_close_settings_button.pressed.connect(close_settings)
	_prompt_panel.visible = false
	_settings_shade.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if _settings_visible and event.is_action_pressed("cancel"):
		close_settings()
		get_viewport().set_input_as_handled()


func set_focus(target: Node) -> void:
	_focused_target = target
	if target == null or not target.has_method("get_interaction_label_key"):
		_prompt_panel.visible = false
		_reticle.modulate = Color(0.9, 0.9, 0.86, 0.8)
		return
	var label_key := str(target.call("get_interaction_label_key"))
	_prompt_label.text = tr(label_key)
	_prompt_panel.visible = not _prompt_label.text.is_empty()
	_reticle.modulate = Color(0.55, 0.95, 0.72, 1.0)


func configure_look_settings(sensitivity: float, inverted: bool, fov: float) -> void:
	_sensitivity_slider.set_value_no_signal(sensitivity)
	_invert_y_check.set_pressed_no_signal(inverted)
	_fov_slider.set_value_no_signal(fov)


func configure_preferences(
	ui_scale: float,
	master_volume: float,
	sfx_volume: float,
	locale_name: String
) -> void:
	_select_float_option(_ui_scale_option, UI_SCALE_OPTIONS, ui_scale)
	_master_volume_slider.set_value_no_signal(clampf(master_volume, 0.0, 1.0))
	_sfx_volume_slider.set_value_no_signal(clampf(sfx_volume, 0.0, 1.0))
	_select_language(locale_name)


func set_ui_scale(value: float) -> void:
	if _runtime_theme == null:
		_runtime_theme = $Overlay.theme.duplicate(true) as Theme
		$Overlay.theme = _runtime_theme
	_runtime_theme.default_base_scale = clampf(value, 0.8, 1.5)


func refresh_localized_text() -> void:
	_apply_localized_text()


func open_settings() -> void:
	_set_settings_visible(true)


func close_settings() -> void:
	_set_settings_visible(false)


func settings_visible() -> bool:
	return _settings_visible


func presentation_snapshot() -> Dictionary:
	return {
		"modalSurface": "settings" if _settings_visible else "none",
		"busy": false,
		"thinking": false,
		"hesitationTimerVisible": false,
		"uiScale": UI_SCALE_OPTIONS[_ui_scale_option.selected],
		"locale": LANGUAGE_OPTIONS[_language_option.selected],
	}


func _set_settings_visible(should_show: bool) -> void:
	if _settings_visible == should_show:
		return
	_settings_visible = should_show
	_settings_shade.visible = should_show
	if should_show:
		_prompt_panel.visible = false
	else:
		set_focus(_focused_target)
	settings_visibility_changed.emit(should_show)
	if should_show:
		_close_settings_button.grab_focus()


func _on_look_setting_changed(_value: float) -> void:
	look_settings_changed.emit(
		float(_sensitivity_slider.value),
		_invert_y_check.button_pressed,
		float(_fov_slider.value)
	)


func _on_invert_y_toggled(_enabled: bool) -> void:
	_on_look_setting_changed(0.0)


func _on_ui_scale_selected(index: int) -> void:
	if index < 0 or index >= UI_SCALE_OPTIONS.size():
		return
	ui_scale_requested.emit(UI_SCALE_OPTIONS[index])


func _on_audio_setting_changed(_value: float) -> void:
	audio_settings_requested.emit(
		float(_master_volume_slider.value),
		float(_sfx_volume_slider.value)
	)


func _on_language_selected(index: int) -> void:
	if index < 0 or index >= LANGUAGE_OPTIONS.size():
		return
	language_requested.emit(LANGUAGE_OPTIONS[index])


func _populate_ui_scale_options() -> void:
	_ui_scale_option.clear()
	for value in UI_SCALE_OPTIONS:
		_ui_scale_option.add_item("%d%%" % roundi(value * 100.0))


func _apply_localized_text() -> void:
	_start_hint.text = tr(&"hud.m3r.start_hint")
	_invert_y_check.text = tr(&"hud.settings.invert_y")
	_close_settings_button.text = tr(&"hud.settings.return")
	_settings_title.text = tr(&"hud.settings.title")
	_sensitivity_label.text = tr(&"hud.settings.look_sensitivity")
	_fov_label.text = tr(&"hud.settings.fov")
	_ui_scale_label.text = tr(&"hud.settings.ui_scale")
	_master_volume_label.text = tr(&"hud.settings.master_volume")
	_sfx_volume_label.text = tr(&"hud.settings.sfx_volume")
	_language_label.text = tr(&"hud.settings.language")
	_populate_language_options()
	set_focus(_focused_target)


func _populate_language_options() -> void:
	var selected_locale := TranslationServer.get_locale().split("_")[0]
	_language_option.clear()
	for index in LANGUAGE_OPTIONS.size():
		var locale_name := LANGUAGE_OPTIONS[index]
		_language_option.add_item(tr("hud.language.%s" % locale_name))
		if locale_name == selected_locale:
			_language_option.select(index)


func _select_float_option(option: OptionButton, values: Array[float], target: float) -> void:
	var selected_index := 0
	for index in values.size():
		if is_equal_approx(values[index], target):
			selected_index = index
			break
	option.select(selected_index)


func _select_language(locale_name: String) -> void:
	var normalized := locale_name.to_lower().split("_")[0]
	for index in LANGUAGE_OPTIONS.size():
		if LANGUAGE_OPTIONS[index] == normalized:
			_language_option.select(index)
			return
	_language_option.select(0)
