extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const EXPECTED_VIEWPORT_SIZE := Vector2i(1280, 720)
const INITIAL_OUTPUT_PATH := "res://../data/evidence/godot/screenshots/main-shell.png"
const VERDICT_OUTPUT_PATH := "res://../data/evidence/godot/screenshots/playable-verdict.png"
const ASSET_SOURCE_DOC := "godot/assets/kenney/README.md"
const SCREENSHOT_EXPECTATIONS := [
	{
		"artifactPath": "data/evidence/godot/screenshots/main-shell.png",
		"role": "opening-shell",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"player-facing HUD objective and focus prompt",
			"readable Dream Law or Cover Test text surface",
			"Kenney free asset city dressing visible without owning gameplay authority"
		]
	},
	{
		"artifactPath": "data/evidence/godot/screenshots/playable-verdict.png",
		"role": "playable-verdict",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"bounded speech-act loop has advanced to visible verdict feedback",
			"Exposure, Station state, verdict, and why-line UI remain visible",
			"Kenney free asset city dressing remains visual-only context"
		]
	}
]

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail("Unable to load %s" % MAIN_SCENE)
		return

	root.size = EXPECTED_VIEWPORT_SIZE
	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	await process_frame

	var initial := _save_viewport(INITIAL_OUTPUT_PATH)
	if not initial["ok"]:
		_fail(str(initial["message"]))
		return

	var session := scene.find_child("PlayableSession", true, false)
	if session != null and session.has_method("run_smoke_sequence"):
		session.run_smoke_sequence()
		await process_frame
		await process_frame

	var verdict := _save_viewport(VERDICT_OUTPUT_PATH)
	if not verdict["ok"]:
		_fail(str(verdict["message"]))
		return

	print(JSON.stringify({
		"ok": true,
		"viewport": {
			"width": EXPECTED_VIEWPORT_SIZE.x,
			"height": EXPECTED_VIEWPORT_SIZE.y
		},
		"assetSourceDoc": ASSET_SOURCE_DOC,
		"screenshotExpectations": SCREENSHOT_EXPECTATIONS,
		"artifacts": [
			{
				"artifactPath": "data/evidence/godot/screenshots/main-shell.png",
				"role": "opening-shell",
				"width": initial["width"],
				"height": initial["height"]
			},
			{
				"artifactPath": "data/evidence/godot/screenshots/playable-verdict.png",
				"role": "playable-verdict",
				"width": verdict["width"],
				"height": verdict["height"]
			}
		]
	}, "\t"))
	quit(0)

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

	var output_path := ProjectSettings.globalize_path(path)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var error := image.save_png(output_path)
	if error != OK:
		return {"ok": false, "message": "Unable to save screenshot: %s" % error_string(error)}
	return {"ok": true, "width": image.get_width(), "height": image.get_height()}

func _fail(message: String) -> void:
	printerr(JSON.stringify({"ok": false, "failures": [message]}, "\t"))
	quit(1)
