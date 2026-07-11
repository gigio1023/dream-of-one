extends SceneTree

## Verifies the complete primary Korean localization table through the same
## Localization autoload API used by the HUD and world scenes.

const M3R_EN_KEYS := [
	"hud.interaction.npc",
	"hud.interaction.door",
	"hud.m3r.start_hint",
	"hud.m3r.conversation.thinking",
	"hud.m3r.conversation.speaker_fallback",
	"hud.m3r.conversation.input_placeholder",
	"hud.m3r.conversation.input_required",
	"hud.m3r.conversation.submit",
	"hud.m3r.conversation.retry_end",
	"hud.m3r.conversation.ended",
	"hud.m3r.stance.header",
	"hud.m3r.stance.oppose",
	"hud.m3r.stance.uncertain",
	"hud.m3r.stance.vouch",
	"hud.m3r.why_line.header",
	"hud.m3r.why_line.format",
	"hud.m3r.encountered_stances.title",
	"hud.m3r.encountered_stances.entry",
	"hud.m3r.error.run_start",
	"hud.m3r.error.conversation_start",
	"hud.m3r.error.conversation_answer",
	"hud.m3r.error.conversation_end",
	"hud.m3r.error.invalid_response",
	"hud.m3r.provider.scripted",
	"hud.m3r.provider.fallback_format",
	"hud.m3r.provider.reason.missing_credentials",
	"hud.m3r.provider.reason.unavailable",
	"hud.m3r.provider.reason.timeout",
	"hud.m3r.provider.reason.rate_limited",
	"hud.m3r.provider.reason.invalid_envelope",
	"hud.m3r.provider.reason.budget_exhausted",
	"hud.m3r.provider.reason.transport_error",
	"hud.m3r.provider.reason.unknown",
	"hud.settings.title",
	"hud.settings.look_sensitivity",
	"hud.settings.invert_y",
	"hud.settings.fov",
	"hud.settings.ui_scale",
	"hud.settings.master_volume",
	"hud.settings.sfx_volume",
	"hud.settings.language",
	"hud.settings.return",
	"hud.language.ko",
	"hud.language.en",
]

var _failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	await process_frame
	var localization = root.get_node_or_null("Localization")
	if localization == null:
		_failures.append("Localization autoload is missing")
		_finish()
		return
	if not localization.has_method("all_keys") or not localization.has_method("t"):
		_failures.append("Localization autoload does not expose all_keys()/t()")
		_finish()
		return

	TranslationServer.set_locale("ko")
	if localization.has_method("locale") and str(localization.call("locale")) != "ko":
		_failures.append("primary locale is not ko")

	var keys_value: Variant = localization.call("all_keys")
	if not keys_value is Array:
		_failures.append("Localization.all_keys() did not return an Array")
		_finish()
		return
	var keys: Array = keys_value
	if keys.is_empty():
		_failures.append("Localization.all_keys() returned no KO keys")

	var seen := {}
	for key_value in keys:
		var key := str(key_value)
		if key.is_empty():
			_failures.append("localization table contains an empty key")
			continue
		if seen.has(key):
			_failures.append("duplicate localization key: %s" % key)
			continue
		seen[key] = true
		var resolved := str(localization.call("t", key))
		if resolved.strip_edges().is_empty():
			_failures.append("KO key resolved empty: %s" % key)
		elif resolved == key:
			_failures.append("KO key resolved to itself: %s" % key)

	if not localization.has_method("set_locale") or not bool(localization.call("set_locale", "en")):
		_failures.append("Localization cannot switch to the M3R English table")
	else:
		for key in M3R_EN_KEYS:
			var resolved := str(localization.call("t", key))
			if resolved.strip_edges().is_empty() or resolved == key:
				_failures.append("M3R EN key did not resolve: %s" % key)
	localization.call("set_locale", "ko")

	if _failures.is_empty():
		print(
			"PASS localization_smoke: %d KO keys and %d M3R EN keys resolved"
			% [keys.size(), M3R_EN_KEYS.size()]
		)
	_finish()

func _finish() -> void:
	if _failures.is_empty():
		quit(0)
		return
	for failure in _failures:
		print("FAIL localization_smoke: %s" % failure)
	quit(1)
