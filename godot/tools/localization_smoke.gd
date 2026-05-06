extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail(["Unable to load %s" % MAIN_SCENE])
		return

	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	await process_frame

	var localization := scene.find_child("LocalizationManager", true, false)
	var failures: Array[String] = []
	if localization == null or not localization.has_method("get_locale"):
		failures.append("LocalizationManager is missing")
	elif str(localization.get_locale()) != "ko":
		failures.append("Expected default locale ko")

	var language_label := scene.find_child("LanguageLabel", true, false) as Label
	if language_label == null or language_label.text != "언어":
		failures.append("Expected Korean language label")

	var station_surface := _find_text_surface("TS_Station_IntakeRules")
	if station_surface == null or not station_surface.has_method("localized_display_name"):
		failures.append("Expected localized Station text surface")
	elif str(station_surface.localized_display_name()) != "접수 규칙":
		failures.append("Expected Korean Station text surface label")

	if localization != null and localization.has_method("set_locale"):
		localization.set_locale("en")
		await process_frame
		await process_frame

	if localization != null and localization.has_method("get_locale") and str(localization.get_locale()) != "en":
		failures.append("Expected locale switch to en")
	if language_label == null or language_label.text != "Language":
		failures.append("Expected English language label after switch")
	if station_surface != null and station_surface.has_method("localized_display_name") and str(station_surface.localized_display_name()) != "Intake Rules":
		failures.append("Expected English Station text surface label after switch")

	if failures.size() > 0:
		_fail(failures)
		return

	print(JSON.stringify({
		"ok": true,
		"defaultLocale": "ko",
		"switchedLocale": "en"
	}, "\t"))
	quit(0)

func _find_text_surface(surface_id: String) -> Node:
	for node in get_nodes_in_group("text_surfaces"):
		if str(node.get_meta("surface_id", "")) == surface_id:
			return node
	return null

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
