extends SceneTree

## Verifies the shared locale registry and every M3R table directly. This does
## not call tr() for parity checks, so Godot's Korean fallback cannot conceal a
## missing key, empty value, or changed format-placeholder contract.

var _failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await process_frame
	var localization := root.get_node_or_null("Localization")
	if localization == null:
		_failures.append("Localization autoload is missing")
		_finish()
		return
	for method_name in [
		"supported_locales",
		"default_locale",
		"presentation_locale",
		"api_locale",
		"set_locale",
		"locale",
		"content_keys",
		"content_message",
	]:
		if not localization.has_method(method_name):
			_failures.append("Localization does not expose %s()" % method_name)
	if not _failures.is_empty():
		_finish()
		return

	var locales_value: Variant = localization.call("supported_locales")
	if not locales_value is Array or (locales_value as Array).is_empty():
		_failures.append("supported locale registry is empty or invalid")
		_finish()
		return
	var locales := locales_value as Array
	var default_locale := str(localization.call("default_locale"))
	var presentation_ids: Dictionary = {}
	var api_locales: Dictionary = {}
	var registry_order: Array[String] = []
	var registry_has_default := false
	for entry_value in locales:
		if not entry_value is Dictionary:
			_failures.append("supported locale entry is not a Dictionary")
			continue
		var entry := entry_value as Dictionary
		var presentation_id := str(entry.get("presentationId", ""))
		var api_locale_name := str(entry.get("apiLocale", ""))
		var label_key := str(entry.get("labelKey", ""))
		if presentation_id.is_empty() or api_locale_name.is_empty() or label_key.is_empty():
			_failures.append("supported locale entry has an empty required field")
			continue
		if presentation_ids.has(presentation_id):
			_failures.append("duplicate presentation locale: %s" % presentation_id)
		if api_locales.has(api_locale_name):
			_failures.append("duplicate API locale: %s" % api_locale_name)
		presentation_ids[presentation_id] = true
		api_locales[api_locale_name] = true
		registry_order.append(presentation_id)
		registry_has_default = registry_has_default or presentation_id == default_locale
		if str(localization.call("presentation_locale", api_locale_name)) != presentation_id:
			_failures.append("API locale does not round-trip: %s" % api_locale_name)
		if (
			str(localization.call("presentation_locale", api_locale_name.replace("-", "_")))
			!= presentation_id
		):
			_failures.append("underscore API locale does not round-trip: %s" % api_locale_name)
		if str(localization.call("api_locale", presentation_id)) != api_locale_name:
			_failures.append("presentation locale loses exact API tag: %s" % presentation_id)
	if not registry_has_default:
		_failures.append("default locale is absent from the supported registry: %s" % default_locale)

	var reference_keys := _string_array(localization.call("content_keys", default_locale))
	if reference_keys.is_empty():
		_failures.append("default M3R locale table has no keys: %s" % default_locale)
		_finish()
		return
	for entry_value in locales:
		if not entry_value is Dictionary:
			continue
		var entry := entry_value as Dictionary
		var presentation_id := str(entry.get("presentationId", ""))
		var api_locale_name := str(entry.get("apiLocale", ""))
		var label_key := str(entry.get("labelKey", ""))
		var locale_keys := _string_array(localization.call("content_keys", presentation_id))
		var missing := _difference(reference_keys, locale_keys)
		var extra := _difference(locale_keys, reference_keys)
		if not missing.is_empty():
			_failures.append("%s is missing M3R keys: %s" % [presentation_id, missing])
		if not extra.is_empty():
			_failures.append("%s has extra M3R keys: %s" % [presentation_id, extra])
		if label_key not in locale_keys:
			_failures.append("%s locale label key is absent: %s" % [presentation_id, label_key])
		for key in reference_keys:
			var reference_text := str(
				localization.call("content_message", default_locale, key)
			)
			var localized_text := str(
				localization.call("content_message", presentation_id, key)
			)
			if localized_text.strip_edges().is_empty():
				_failures.append("%s M3R key is empty: %s" % [presentation_id, key])
				continue
			var expected_placeholders := _placeholders(reference_text)
			var actual_placeholders := _placeholders(localized_text)
			if actual_placeholders != expected_placeholders:
				_failures.append(
					"%s placeholder mismatch for %s: expected %s, got %s"
					% [presentation_id, key, expected_placeholders, actual_placeholders]
				)
		if not bool(localization.call("set_locale", api_locale_name)):
			_failures.append("cannot switch with full API locale: %s" % api_locale_name)
		elif str(localization.call("locale")) != presentation_id:
			_failures.append("active presentation locale is not %s" % presentation_id)

	localization.call("set_locale", default_locale)
	await _check_hud_registry(localization, locales, registry_order, default_locale)
	if _failures.is_empty():
		print(
			"PASS localization_smoke: %d locales share %d exact M3R keys and placeholders"
			% [locales.size(), reference_keys.size()]
		)
	_finish()


func _string_array(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not value is Array:
		return result
	for item in value as Array:
		result.append(str(item))
	result.sort()
	return result


func _difference(left: Array[String], right: Array[String]) -> Array[String]:
	var right_set: Dictionary = {}
	for value in right:
		right_set[value] = true
	var result: Array[String] = []
	for value in left:
		if not right_set.has(value):
			result.append(value)
	return result


func _placeholders(text: String) -> Array[String]:
	var result: Array[String] = []
	var cursor := 0
	while cursor < text.length():
		var opening := text.find("{", cursor)
		if opening < 0:
			break
		var closing := text.find("}", opening + 1)
		if closing < 0:
			result.append(text.substr(opening))
			break
		result.append(text.substr(opening, closing - opening + 1))
		cursor = closing + 1
	result.sort()
	return result


func _check_hud_registry(
	localization: Node,
	locales: Array,
	registry_order: Array[String],
	default_locale: String
) -> void:
	var hud_scene := load("res://scenes/ui/hud_3d.tscn") as PackedScene
	if hud_scene == null:
		_failures.append("HUD3D scene could not load for locale registry smoke")
		return
	var hud := hud_scene.instantiate()
	root.add_child(hud)
	await process_frame
	var snapshot: Dictionary = hud.call("presentation_snapshot")
	if _ordered_string_array(snapshot.get("languageOptions", [])) != registry_order:
		_failures.append("HUD language options do not come from the registry")
	if str(snapshot.get("locale", "")) != default_locale:
		_failures.append("HUD active locale does not match the registry default")
	if str(snapshot.get("selectedLocale", "")) != default_locale:
		_failures.append("HUD default language selection does not match the registry")
	if not locales.is_empty() and locales[-1] is Dictionary:
		var last_api_locale := str((locales[-1] as Dictionary).get("apiLocale", ""))
		hud.call("configure_preferences", 1.0, 0.8, 0.8, last_api_locale)
		snapshot = hud.call("presentation_snapshot")
		if str(snapshot.get("selectedLocale", "")) != str(
			localization.call("presentation_locale", last_api_locale)
		):
			_failures.append("HUD cannot select a language from its full API locale")
	hud.call("set_language_applies_next_run", true)
	snapshot = hud.call("presentation_snapshot")
	if not bool(snapshot.get("languageAppliesNextRun", false)):
		_failures.append("HUD does not expose the immutable-run language state")
	var language_label := hud.find_child("LanguageLabel", true, false) as Label
	if (
		language_label == null
		or language_label.text.strip_edges().is_empty()
		or language_label.text == "hud.settings.language_next_run"
	):
		_failures.append("HUD next-run language label is not localized")
	hud.queue_free()
	await process_frame


func _ordered_string_array(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not value is Array:
		return result
	for item in value as Array:
		result.append(str(item))
	return result


func _finish() -> void:
	if _failures.is_empty():
		quit(0)
		return
	for failure in _failures:
		print("FAIL localization_smoke: %s" % failure)
	quit(1)
