extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/screenshots/main-shell.png"

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail("Unable to load %s" % MAIN_SCENE)
		return

	root.size = Vector2i(1280, 720)
	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	await process_frame

	var image := root.get_texture().get_image()
	if image == null or image.is_empty():
		_fail("Viewport image is empty")
		return

	var output_path := ProjectSettings.globalize_path(OUTPUT_PATH)
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var error := image.save_png(output_path)
	if error != OK:
		_fail("Unable to save screenshot: %s" % error_string(error))
		return

	print(JSON.stringify({
		"ok": true,
		"artifactPath": "data/evidence/godot/screenshots/main-shell.png",
		"width": image.get_width(),
		"height": image.get_height()
	}, "\t"))
	quit(0)

func _fail(message: String) -> void:
	printerr(JSON.stringify({"ok": false, "failures": [message]}, "\t"))
	quit(1)
