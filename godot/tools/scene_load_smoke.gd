extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const ShellInspector := preload("res://scripts/tools/shell_inspector.gd")

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		_fail({"ok": false, "failures": ["Unable to load %s" % MAIN_SCENE]})
		return

	var scene := packed.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame

	var result := ShellInspector.inspect(scene)
	print(JSON.stringify(result, "\t"))
	quit(0 if result["ok"] else 1)

func _fail(result: Dictionary) -> void:
	printerr(JSON.stringify(result, "\t"))
	quit(1)

