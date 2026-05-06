extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const EXPECTED_VIEWPORT_SIZE := Vector2i(1280, 720)
const ASSET_SOURCE_DOC := "godot/assets/kenney/README.md"
const CONTACT_SHEET_OUTPUT_PATH := "res://../data/evidence/godot/visual-capture/contact-sheet.png"
const MANIFEST_OUTPUT_PATH := "res://../data/evidence/godot/visual-capture/manifest.json"
const WORLD_GENERATOR_SCRIPT_PATH := "res://scripts/world/world_generator.gd"
const COVER_TEST_ZONE_SCENE_PATH := "res://scenes/world/cover_test_zone.tscn"
const VALIDATION_SCOPE := "Automated capture validates scene load, session state, viewport size, and nonblank pixels. It records expected visual content for human review; it is not OCR or taste validation."
const CONTACT_SHEET_COLUMNS := 2
const CONTACT_SHEET_TILE_SIZE := Vector2i(640, 360)
const LEGACY_ALIAS_OUTPUT_PATHS := {
	"opening-station-framing": "res://../data/evidence/godot/screenshots/main-shell.png",
	"verdict-session-end": "res://../data/evidence/godot/screenshots/playable-verdict.png"
}
const CAPTURE_DEFINITIONS := [
	{
		"key": "opening-station-framing",
		"artifactPath": "data/evidence/godot/screenshots/01-opening-station-framing.png",
		"outputPath": "res://../data/evidence/godot/screenshots/01-opening-station-framing.png",
		"role": "opening-station-framing",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"opening Station framing visible from current generated world",
			"HUD objective points player toward rule-surface reading",
			"Kenney free asset city dressing visible without owning gameplay authority"
		]
	},
	{
		"key": "station-rule-surface-readable",
		"artifactPath": "data/evidence/godot/screenshots/02-station-rule-surface-readable.png",
		"outputPath": "res://../data/evidence/godot/screenshots/02-station-rule-surface-readable.png",
		"role": "station-rule-surface-readable",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"Station intake rule surface has been interacted with",
			"Dream Law and Cover Test identifiers are visible in player-facing notice",
			"HUD remains readable while Station board is in range"
		]
	},
	{
		"key": "active-cover-test-hud",
		"artifactPath": "data/evidence/godot/screenshots/03-active-cover-test-hud.png",
		"outputPath": "res://../data/evidence/godot/screenshots/03-active-cover-test-hud.png",
		"role": "active-cover-test-hud",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"Station Cover Test prompt is active",
			"bounded speech choices are visible",
			"consequence HUD distinguishes safe procedural speech from risky break"
		]
	},
	{
		"key": "exposure-why-line",
		"artifactPath": "data/evidence/godot/screenshots/04-exposure-why-line.png",
		"outputPath": "res://../data/evidence/godot/screenshots/04-exposure-why-line.png",
		"role": "exposure-why-line",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"Exposure has increased from a risky speech act",
			"player-facing why-line is visible",
			"recent Evidence explains the consequence"
		]
	},
	{
		"key": "verdict-session-end",
		"artifactPath": "data/evidence/godot/screenshots/05-verdict-session-end.png",
		"outputPath": "res://../data/evidence/godot/screenshots/05-verdict-session-end.png",
		"role": "verdict-session-end",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"verdict outcome panel is visible",
			"Exposure, Station verdict, and session termination state are visible",
			"why-line remains visible as session-end basis"
		]
	}
]

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail(["Unable to load %s" % MAIN_SCENE])
		return

	root.size = EXPECTED_VIEWPORT_SIZE
	var scene := packed.instantiate()
	root.add_child(scene)
	await _settle_frames(5)

	var blockers: Array[String] = []
	blockers.append_array(_scene_build_blockers(scene))

	var session := scene.find_child("PlayableSession", true, false)
	if session == null:
		_fail(["PlayableSession node is missing"])
		return
	var player := scene.find_child("Player", true, false)
	if player == null:
		_fail(["Player node is missing"])
		return

	var captures: Array[Dictionary] = []
	var images: Array[Image] = []

	await _capture_opening(player, session, captures, images, blockers)
	await _capture_station_rules(player, session, captures, images, blockers)
	await _capture_active_cover_test(player, session, captures, images, blockers)
	await _capture_exposure_why_line(session, captures, images, blockers)
	await _capture_verdict_session_end(session, captures, images, blockers)

	var contact_sheet := _save_contact_sheet(images)
	if not contact_sheet["ok"]:
		blockers.append(str(contact_sheet["message"]))

	var manifest := {
		"ok": blockers.is_empty(),
		"viewport": {
			"width": EXPECTED_VIEWPORT_SIZE.x,
			"height": EXPECTED_VIEWPORT_SIZE.y
		},
		"assetSourceDoc": ASSET_SOURCE_DOC,
		"validationScope": VALIDATION_SCOPE,
		"contactSheet": {
			"artifactPath": "data/evidence/godot/visual-capture/contact-sheet.png",
			"width": contact_sheet.get("width", 0),
			"height": contact_sheet.get("height", 0)
		},
		"screenshotExpectations": _screenshot_expectations(),
		"captures": captures,
		"blockedChecks": blockers
	}
	var manifest_result := _save_json(MANIFEST_OUTPUT_PATH, manifest)
	if not manifest_result["ok"]:
		blockers.append(str(manifest_result["message"]))
		manifest["ok"] = false
		manifest["blockedChecks"] = blockers

	print(JSON.stringify(manifest, "\t"))
	quit(0 if blockers.is_empty() else 1)

func _capture_opening(
	player: Node,
	session: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_place_player(player, Vector3(11.0, 0.05, -6.0), 0.0)
	_call_session(session, "_refresh_hud")
	await _settle_frames(4)
	_capture_definition("opening-station-framing", captures, images, blockers)

func _capture_station_rules(
	player: Node,
	session: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_place_player(player, Vector3(13.65, 0.05, -12.75), 0.0)
	await _settle_frames(2)
	_call_session(session, "_force_focus_text_surface", ["TS_Station_IntakeRules"])
	_call_session(session, "_interact")
	_call_session(session, "_refresh_hud")
	await _settle_frames(3)
	var summary := _build_summary(session)
	if not _as_array(summary.get("readSurfaceIds", [])).has("TS_Station_IntakeRules"):
		blockers.append("Station rule-surface capture did not record TS_Station_IntakeRules as read.")
	if str(summary.get("noticeBodyKey", "")) != "notice.text_surface.body":
		blockers.append("Station rule-surface capture did not leave rule text in the notice panel.")
	_capture_definition("station-rule-surface-readable", captures, images, blockers)

func _capture_active_cover_test(
	player: Node,
	session: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_place_player(player, Vector3(8.4, 0.05, -10.8), 0.0)
	await _settle_frames(2)
	_call_session(session, "_force_focus_zone", ["StationIntakeZone"])
	_call_session(session, "_interact")
	_call_session(session, "_refresh_hud")
	await _settle_frames(3)
	var summary := _build_summary(session)
	if str(summary.get("noticeTitleKey", "")) != "cover.CT_STATION_SOFT_INQUEST.title":
		blockers.append("Cover Test capture did not focus CT_STATION_SOFT_INQUEST.")
	if str(summary.get("noticeBodyKey", "")) != "notice.cover_test.body":
		blockers.append("Cover Test capture did not show the bounded speech prompt.")
	_capture_definition("active-cover-test-hud", captures, images, blockers)

func _capture_exposure_why_line(
	session: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_call_session(session, "_force_focus_zone", ["StationIntakeZone"])
	_call_session(session, "_apply_speech_act", ["speech_break"])
	_call_session(session, "_refresh_hud")
	await _settle_frames(3)
	var summary := _build_summary(session)
	if int(summary.get("exposure", 0)) < 25:
		blockers.append("Exposure/why-line capture did not raise Exposure after SA_BREAK.")
	if str(summary.get("lastWhyLine", "")).is_empty():
		blockers.append("Exposure/why-line capture did not expose a visible why-line.")
	if str(summary.get("noticeBodyKey", "")) != "notice.speech.body":
		blockers.append("Exposure/why-line capture did not leave speech consequence text in the notice panel.")
	_capture_definition("exposure-why-line", captures, images, blockers)

func _capture_verdict_session_end(
	session: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	for _index in range(3):
		_call_session(session, "_force_focus_zone", ["StationIntakeZone"])
		_call_session(session, "_apply_speech_act", ["speech_break"])
	_call_session(session, "_refresh_hud")
	await _settle_frames(4)
	var summary := _build_summary(session)
	var station: Dictionary = summary.get("station", {})
	if not bool(station.get("verdictReady", false)):
		blockers.append("Verdict capture did not reach Station verdictReady.")
	if not bool(station.get("sessionTerminationAllowed", false)):
		blockers.append("Verdict capture did not reach sessionTerminationAllowed.")
	if not bool(summary.get("outcomeVisible", false)):
		blockers.append("Verdict capture did not show the outcome panel.")
	_capture_definition("verdict-session-end", captures, images, blockers)

func _capture_definition(
	key: String,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	var definition := _definition_for_key(key)
	if definition.is_empty():
		blockers.append("Missing capture definition for %s." % key)
		return

	var result := _save_viewport(str(definition["outputPath"]))
	if not result["ok"]:
		blockers.append(str(result["message"]))
		return

	var image := result["image"] as Image
	images.append(image.duplicate())
	var artifact := {
		"artifactPath": str(definition["artifactPath"]),
		"role": str(definition["role"]),
		"width": result["width"],
		"height": result["height"],
		"expectedContent": definition["expectedContent"],
		"automatedChecks": [
			"viewport_size",
			"nonblank_pixels",
			"scripted_session_state"
		],
		"requiresHumanReadabilityReview": true
	}
	if blockers.is_empty() and LEGACY_ALIAS_OUTPUT_PATHS.has(key):
		var alias_result := _save_image(image, str(LEGACY_ALIAS_OUTPUT_PATHS[key]))
		if alias_result["ok"]:
			artifact["legacyAliasArtifactPath"] = _res_path_to_artifact(str(LEGACY_ALIAS_OUTPUT_PATHS[key]))
		else:
			blockers.append(str(alias_result["message"]))
	captures.append(artifact)

func _save_viewport(path: String) -> Dictionary:
	var image := root.get_texture().get_image()
	if image == null or image.is_empty():
		return {"ok": false, "message": "Viewport image is empty"}
	if image.get_width() != EXPECTED_VIEWPORT_SIZE.x or image.get_height() != EXPECTED_VIEWPORT_SIZE.y:
		return {
			"ok": false,
			"message": "Viewport image is %dx%d, expected %dx%d" % [
				image.get_width(),
				image.get_height(),
				EXPECTED_VIEWPORT_SIZE.x,
				EXPECTED_VIEWPORT_SIZE.y
			]
		}
	if not _image_has_visible_content(image):
		return {"ok": false, "message": "Viewport image appears blank"}

	var save_result := _save_image(image, path)
	if not save_result["ok"]:
		return save_result
	return {
		"ok": true,
		"width": image.get_width(),
		"height": image.get_height(),
		"image": image.duplicate()
	}

func _save_image(image: Image, path: String) -> Dictionary:
	var output_path := ProjectSettings.globalize_path(path)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var error := image.save_png(output_path)
	if error != OK:
		return {"ok": false, "message": "Unable to save screenshot %s: %s" % [path, error_string(error)]}
	return {"ok": true}

func _save_contact_sheet(images: Array[Image]) -> Dictionary:
	if images.is_empty():
		return {"ok": false, "message": "No screenshots available for contact sheet"}

	var row_count := int(ceil(float(images.size()) / float(CONTACT_SHEET_COLUMNS)))
	var sheet_size := Vector2i(
		CONTACT_SHEET_COLUMNS * CONTACT_SHEET_TILE_SIZE.x,
		row_count * CONTACT_SHEET_TILE_SIZE.y
	)
	var sheet := Image.create(sheet_size.x, sheet_size.y, false, Image.FORMAT_RGB8)
	sheet.fill(Color(0.02, 0.025, 0.03, 1.0))
	for index in range(images.size()):
		var tile := images[index].duplicate()
		tile.resize(CONTACT_SHEET_TILE_SIZE.x, CONTACT_SHEET_TILE_SIZE.y, Image.INTERPOLATE_LANCZOS)
		var column := index % CONTACT_SHEET_COLUMNS
		var row := int(floor(float(index) / float(CONTACT_SHEET_COLUMNS)))
		var destination := Vector2i(column * CONTACT_SHEET_TILE_SIZE.x, row * CONTACT_SHEET_TILE_SIZE.y)
		sheet.blit_rect(tile, Rect2i(Vector2i.ZERO, CONTACT_SHEET_TILE_SIZE), destination)

	var save_result := _save_image(sheet, CONTACT_SHEET_OUTPUT_PATH)
	if not save_result["ok"]:
		return save_result
	return {
		"ok": true,
		"width": sheet_size.x,
		"height": sheet_size.y
	}

func _save_json(path: String, value: Dictionary) -> Dictionary:
	var output_path := ProjectSettings.globalize_path(path)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		return {
			"ok": false,
			"message": "Unable to write %s: %s" % [path, error_string(FileAccess.get_open_error())]
		}
	file.store_string(JSON.stringify(value, "\t"))
	return {"ok": true}

func _definition_for_key(key: String) -> Dictionary:
	for definition in CAPTURE_DEFINITIONS:
		if str(definition.get("key", "")) == key:
			return definition
	return {}

func _screenshot_expectations() -> Array:
	var expectations := []
	for definition in CAPTURE_DEFINITIONS:
		expectations.append({
			"artifactPath": str(definition["artifactPath"]),
			"role": str(definition["role"]),
			"expectedContent": definition["expectedContent"]
		})
	return expectations

func _scene_build_blockers(scene: Node) -> Array[String]:
	var blockers: Array[String] = []
	if scene.get_script() == null:
		blockers.append("Main scene root script did not load; generated Station framing cannot be trusted.")
	if get_nodes_in_group("text_surfaces").is_empty():
		blockers.append("Generated text surfaces are missing; rule-surface capture cannot prove interactable Station rules.")
	if get_nodes_in_group("interaction_zones").is_empty():
		blockers.append("Generated interaction zones are missing; Cover Test captures cannot prove active zone focus.")
	var generation_failures := _as_array(scene.get_meta("generation_failures", []))
	for failure in generation_failures:
		blockers.append("World generation failure: %s" % str(failure))
	if _world_generator_references_missing_cover_test_scene():
		blockers.append("%s references missing %s; current world generation fails before Station visual framing." % [
			WORLD_GENERATOR_SCRIPT_PATH,
			COVER_TEST_ZONE_SCENE_PATH
		])
	return blockers

func _world_generator_references_missing_cover_test_scene() -> bool:
	if FileAccess.file_exists(COVER_TEST_ZONE_SCENE_PATH):
		return false
	if not FileAccess.file_exists(WORLD_GENERATOR_SCRIPT_PATH):
		return false
	var source := FileAccess.get_file_as_string(WORLD_GENERATOR_SCRIPT_PATH)
	return source.find(COVER_TEST_ZONE_SCENE_PATH) >= 0

func _build_summary(session: Node) -> Dictionary:
	if session != null and session.has_method("build_summary"):
		var summary: Variant = session.call("build_summary")
		if summary is Dictionary:
			return summary
	return {}

func _call_session(session: Node, method: String, args: Array = []) -> bool:
	if session == null or not session.has_method(method):
		return false
	session.callv(method, args)
	return true

func _place_player(player: Node, position: Vector3, yaw_degrees: float) -> void:
	if player.has_method("place_at"):
		player.call("place_at", position, yaw_degrees)
	else:
		var player_3d := player as Node3D
		if player_3d != null:
			player_3d.global_position = position
			player_3d.rotation.y = deg_to_rad(yaw_degrees)

func _settle_frames(count: int) -> void:
	for _index in range(count):
		await process_frame

func _image_has_visible_content(image: Image) -> bool:
	var first: Color = image.get_pixel(0, 0)
	var step_x: int = max(1, int(image.get_width() / 8))
	var step_y: int = max(1, int(image.get_height() / 8))
	for y in range(0, image.get_height(), step_y):
		for x in range(0, image.get_width(), step_x):
			var pixel: Color = image.get_pixel(x, y)
			var distance: float = abs(first.r - pixel.r) + abs(first.g - pixel.g) + abs(first.b - pixel.b)
			if distance > 0.03:
				return true
	return false

func _as_array(value: Variant) -> Array:
	if value is Array:
		return value
	return []

func _res_path_to_artifact(path: String) -> String:
	if path.begins_with("res://../"):
		return path.substr("res://../".length())
	return path

func _fail(failures: Array[String]) -> void:
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
