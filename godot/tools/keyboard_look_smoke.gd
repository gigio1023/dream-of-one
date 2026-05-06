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

	var player := scene.find_child("Player", true, false)
	if player == null or not player.has_method("look_state"):
		_fail(["Player is missing keyboard look inspection API"])
		return

	var initial: Dictionary = player.look_state()
	Input.action_press(&"look_right")
	await process_frame
	await process_frame
	await process_frame
	Input.action_release(&"look_right")
	var after_right: Dictionary = player.look_state()

	Input.action_press(&"look_up")
	await process_frame
	await process_frame
	await process_frame
	Input.action_release(&"look_up")
	var after_up: Dictionary = player.look_state()

	var failures: Array[String] = []
	if not float(after_right.get("yaw", 0.0)) < float(initial.get("yaw", 0.0)):
		failures.append("Expected right arrow action to rotate yaw")
	if not float(after_up.get("pitch", 0.0)) > float(after_right.get("pitch", 0.0)):
		failures.append("Expected up arrow action to rotate pitch")

	Input.action_release(&"look_right")
	Input.action_release(&"look_up")

	if failures.size() > 0:
		_fail(failures)
		return

	print(JSON.stringify({
		"ok": true,
		"initial": initial,
		"afterRight": after_right,
		"afterUp": after_up
	}, "\t"))
	quit(0)

func _fail(failures: Array[String]) -> void:
	Input.action_release(&"look_right")
	Input.action_release(&"look_up")
	printerr(JSON.stringify({"ok": false, "failures": failures}, "\t"))
	quit(1)
