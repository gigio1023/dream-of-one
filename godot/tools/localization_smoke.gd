extends SceneTree

## Verifies the complete primary Korean localization table through the same
## Localization autoload API used by the HUD and world scenes.

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

	if _failures.is_empty():
		print("PASS localization_smoke: %d KO keys resolved" % keys.size())
	_finish()

func _finish() -> void:
	if _failures.is_empty():
		quit(0)
		return
	for failure in _failures:
		print("FAIL localization_smoke: %s" % failure)
	quit(1)
