extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const EXPECTED_VIEWPORT_SIZE := Vector2i(1280, 720)
const ASSET_SOURCE_DOC := "godot/assets/kenney/README.md"
const CONTACT_SHEET_OUTPUT_PATH := "res://../data/evidence/godot/visual-capture/contact-sheet.png"
const MANIFEST_OUTPUT_PATH := "res://../data/evidence/godot/visual-capture/manifest.json"
const WORLD_GENERATOR_SCRIPT_PATH := "res://scripts/world/world_generator.gd"
const INTERACTION_ZONE_SCENE_PATH := "res://scenes/world/cover_test_zone.tscn"
const VALIDATION_SCOPE := "Automated capture validates scene load, session state, viewport size, and nonblank pixels. It records expected visual content for human review; it is not OCR or taste validation."
const CONTACT_SHEET_COLUMNS := 2
const CONTACT_SHEET_TILE_SIZE := Vector2i(640, 360)
const LEGACY_ALIAS_OUTPUT_PATHS := {
	"opening-store-framing": "res://../data/evidence/godot/screenshots/main-shell.png",
	"inquest-session-end": "res://../data/evidence/godot/screenshots/playable-inquest.png"
}
const CAPTURE_DEFINITIONS := [
	{
		"key": "opening-store-framing",
		"artifactPath": "data/evidence/godot/screenshots/01-opening-store-framing.png",
		"outputPath": "res://../data/evidence/godot/screenshots/01-opening-store-framing.png",
		"role": "opening-store-framing",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"opening Store framing visible from current generated world",
			"HUD objective points player toward the Store Clerk conversation",
			"Kenney free asset city dressing visible without owning gameplay authority"
		]
	},
	{
		"key": "store-rule-surface-readable",
		"artifactPath": "data/evidence/godot/screenshots/02-store-rule-surface-readable.png",
		"outputPath": "res://../data/evidence/godot/screenshots/02-store-rule-surface-readable.png",
		"role": "store-rule-surface-readable",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"Store queue rule surface has been interacted with",
			"local routine context is visible before speaking",
			"HUD remains readable while Store board is in range"
		]
	},
	{
		"key": "active-conversation-hud",
		"artifactPath": "data/evidence/godot/screenshots/03-active-conversation-hud.png",
		"outputPath": "res://../data/evidence/godot/screenshots/03-active-conversation-hud.png",
		"role": "active-conversation-hud",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"Store Clerk prompt is active",
			"three large diegetic dialogue choices are visible in the conversation panel",
			"key 4 is explicitly scoped as a displayed recorded statement"
		]
	},
	{
		"key": "conversation-why-line",
		"artifactPath": "data/evidence/godot/screenshots/04-conversation-why-line.png",
		"outputPath": "res://../data/evidence/godot/screenshots/04-conversation-why-line.png",
		"role": "conversation-why-line",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"suspicion has increased from a risky dialogue line",
			"Store Clerk reaction marker is active",
			"player-facing why-line is visible",
			"recent Evidence explains the consequence"
		]
	},
	{
		"key": "inquest-session-end",
		"artifactPath": "data/evidence/godot/screenshots/05-inquest-session-end.png",
		"outputPath": "res://../data/evidence/godot/screenshots/05-inquest-session-end.png",
		"role": "inquest-session-end",
		"expectedContent": [
			"non-empty 1280x720 viewport",
			"Station inquest outcome panel is visible",
			"suspicion, report pressure, and session termination state are visible",
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
	var hud := scene.find_child("SocialStealthHud", true, false)
	if hud == null:
		_fail(["SocialStealthHud node is missing"])
		return

	var captures: Array[Dictionary] = []
	var images: Array[Image] = []

	await _capture_opening(player, session, captures, images, blockers)
	await _capture_store_rules(player, session, captures, images, blockers)
	await _capture_active_conversation(player, session, hud, captures, images, blockers)
	await _capture_conversation_why_line(session, hud, captures, images, blockers)
	await _capture_inquest_session_end(session, hud, captures, images, blockers)
	var final_summary := _build_summary(session)
	blockers.append_array(_store_conversation_blockers(final_summary))

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
		"storeConversationEvidence": _store_conversation_evidence(final_summary),
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
	_place_player(player, Vector3(-10.4, 0.05, 2.2), 0.0)
	_call_session(session, "_refresh_hud")
	await _settle_frames(4)
	_capture_definition("opening-store-framing", captures, images, blockers)

func _capture_store_rules(
	player: Node,
	session: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_place_player(player, Vector3(-8.8, 0.05, -2.0), -90.0)
	await _settle_frames(2)
	_call_session(session, "_force_focus_text_surface", ["TS_Store_QueueRules"])
	_call_session(session, "_interact")
	_call_session(session, "_refresh_hud")
	await _settle_frames(3)
	var summary := _build_summary(session)
	if not _as_array(summary.get("readSurfaceIds", [])).has("TS_Store_QueueRules"):
		blockers.append("Store rule-surface capture did not record TS_Store_QueueRules as read.")
	if not str(summary.get("noticeBody", "")).contains("대화"):
		blockers.append("Store rule-surface capture did not leave conversation context in the notice panel.")
	_capture_definition("store-rule-surface-readable", captures, images, blockers)

func _capture_active_conversation(
	player: Node,
	session: Node,
	hud: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_place_player(player, Vector3(-13.0, 0.05, -1.1), 0.0)
	await _settle_frames(2)
	_call_session(session, "_force_focus_zone", ["StoreCounterZone"])
	_call_session(session, "_interact")
	_call_session(session, "_refresh_hud")
	await _settle_frames(3)
	var summary := _build_summary(session)
	var conversation: Dictionary = summary.get("conversation", {})
	if str(conversation.get("currentPromptId", "")) != "store.same_order.routine":
		blockers.append("Conversation capture did not focus the Same Order routine prompt.")
	if _as_array(conversation.get("availableChoices", [])).size() != 3:
		blockers.append("Conversation capture did not expose three dialogue choices.")
	blockers.append_array(_active_hud_blockers(hud, summary, "Conversation capture"))
	_capture_definition("active-conversation-hud", captures, images, blockers)

func _capture_conversation_why_line(
	session: Node,
	hud: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_call_session(session, "_select_dialogue_choice", ["store.same_order.risky"])
	_call_session(session, "_refresh_hud")
	await _settle_frames(3)
	var summary := _build_summary(session)
	if int(summary.get("suspicion", 0)) < 35:
		blockers.append("Conversation why-line capture did not raise suspicion after risky dialogue.")
	if str(summary.get("lastWhyLine", "")).is_empty():
		blockers.append("Conversation why-line capture did not expose a visible why-line.")
	var reaction := _npc_reaction_snapshot(session, "NPC_Store_Clerk")
	if not bool(reaction.get("markerVisible", false)):
		blockers.append("Conversation why-line capture did not show Store Clerk reaction marker.")
	if float(reaction.get("materialAlpha", -1.0)) <= 0.16:
		blockers.append("Conversation why-line capture did not update Store Clerk reaction material alpha.")
	if float(reaction.get("emissionEnergy", -1.0)) <= 0.2:
		blockers.append("Conversation why-line capture did not update Store Clerk reaction material emission.")
	var snapshot := _hud_snapshot(hud)
	if not str(snapshot.get("whyLineLabel", "")).contains("WHY-LINE"):
		blockers.append("Conversation why-line capture did not expose the HUD why-line label.")
	if not _has_event(summary, "dialogue_choice_selected"):
		blockers.append("Conversation why-line capture did not record dialogue_choice_selected Evidence.")
	_capture_definition("conversation-why-line", captures, images, blockers)

func _capture_inquest_session_end(
	session: Node,
	hud: Node,
	captures: Array[Dictionary],
	images: Array[Image],
	blockers: Array[String]
) -> void:
	_call_session(session, "submit_recorded_statement")
	_call_session(session, "_refresh_hud")
	await _settle_frames(4)
	var summary := _build_summary(session)
	var station: Dictionary = summary.get("station", {})
	if not bool(station.get("inquestOpen", false)):
		blockers.append("Inquest capture did not open Station inquest.")
	if not bool(station.get("sessionTerminationAllowed", false)):
		blockers.append("Inquest capture did not reach sessionTerminationAllowed.")
	if not bool(summary.get("outcomeVisible", false)):
		blockers.append("Inquest capture did not show the outcome panel.")
	if not _has_recorded_statement_event(summary):
		blockers.append("Inquest capture did not record key 4 as explicit recorded-statement Evidence.")
	var snapshot := _hud_snapshot(hud)
	if not bool(snapshot.get("outcomeVisible", false)):
		blockers.append("Inquest capture did not expose the HUD outcome panel.")
	_capture_definition("inquest-session-end", captures, images, blockers)

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
	if DisplayServer.get_name() == "headless":
		return {"ok": false, "message": "Viewport capture is unavailable under the headless display server"}
	var texture := root.get_texture()
	if texture == null:
		return {"ok": false, "message": "Viewport texture is unavailable in the current renderer"}
	var image := texture.get_image()
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

func _active_hud_blockers(hud: Node, summary: Dictionary, prefix: String) -> Array[String]:
	var blockers: Array[String] = []
	var conversation: Dictionary = summary.get("conversation", {})
	if _as_array(conversation.get("availableChoices", [])).size() != 3:
		blockers.append("%s did not have three active Store dialogue choices." % prefix)
	var snapshot := _hud_snapshot(hud)
	if not str(snapshot.get("choicesLabel", "")).begins_with("1  네, 같은 걸로"):
		blockers.append("%s HUD did not preserve active choice label 1." % prefix)
	if not str(snapshot.get("safeLineLabel", "")).begins_with("2  제가 보통"):
		blockers.append("%s HUD did not preserve active choice label 2." % prefix)
	if not str(snapshot.get("riskyLineLabel", "")).begins_with("3  오늘 처음"):
		blockers.append("%s HUD did not preserve active choice label 3." % prefix)
	if not str(snapshot.get("consequenceLabel", "")).contains("4  기록된 진술 제출"):
		blockers.append("%s HUD did not scope key 4 as an explicit recorded statement." % prefix)
	if not str(snapshot.get("recordedStatementLabel", "")).contains("기록된 진술"):
		blockers.append("%s HUD did not expose key 4 as a recorded statement label." % prefix)
	return blockers

func _store_conversation_blockers(summary: Dictionary) -> Array[String]:
	var blockers: Array[String] = []
	var conversation: Dictionary = summary.get("conversation", {})
	if str(conversation.get("conversationId", "")) != "conv-same-order":
		blockers.append("Final visual capture summary is not the current Store Same Order conversation.")
	if str(conversation.get("recordedStatementScope", "")) != "key_4_explicit_recorded_statement_no_typed_ui":
		blockers.append("Final visual capture summary does not scope key 4 as an explicit recorded statement.")
	if not _has_event(summary, "dialogue_choice_selected"):
		blockers.append("Final visual capture summary has no Store dialogue_choice_selected Evidence.")
	if not _has_recorded_statement_event(summary):
		blockers.append("Final visual capture summary has no explicit recorded-statement Evidence.")
	if not _has_event(summary, "station_inquest_opened"):
		blockers.append("Final visual capture summary has no Station inquest Evidence from the Store conversation.")
	return blockers

func _store_conversation_evidence(summary: Dictionary) -> Dictionary:
	var conversation: Dictionary = summary.get("conversation", {})
	return {
		"conversationId": str(conversation.get("conversationId", "")),
		"currentPromptId": str(conversation.get("currentPromptId", "")),
		"recordedStatementAction": str(conversation.get("recordedStatementAction", "")),
		"recordedStatementScope": str(conversation.get("recordedStatementScope", "")),
		"history": conversation.get("history", []),
		"lastWhyLine": str(summary.get("lastWhyLine", "")),
		"stage": str(summary.get("stage", "")),
		"suspicion": int(summary.get("suspicion", 0)),
		"reportWeight": int(summary.get("reportWeight", 0)),
		"station": summary.get("station", {}),
		"eventNames": _event_names(summary)
	}

func _event_names(summary: Dictionary) -> Array[String]:
	var names: Array[String] = []
	for event in summary.get("events", []):
		if event is Dictionary:
			names.append(str(event.get("eventName", "")))
	return names

func _has_event(summary: Dictionary, event_name: String) -> bool:
	for event in summary.get("events", []):
		if event is Dictionary and str(event.get("eventName", "")) == event_name:
			return true
	return false

func _has_recorded_statement_event(summary: Dictionary) -> bool:
	for event in summary.get("events", []):
		if not event is Dictionary:
			continue
		if str(event.get("eventName", "")) != "free_input_submitted":
			continue
		if str(event.get("inputMode", "")) != "explicit_recorded_statement":
			continue
		if str(event.get("recordedStatementScope", "")) != "key_4_explicit_recorded_statement_no_typed_ui":
			continue
		if str(event.get("freeInputHash", "")).is_empty():
			continue
		return true
	return false

func _hud_snapshot(hud: Node) -> Dictionary:
	if hud != null and hud.has_method("debug_snapshot"):
		var snapshot: Variant = hud.call("debug_snapshot")
		if snapshot is Dictionary:
			return snapshot
	return {}

func _npc_reaction_snapshot(context_node: Node, npc_id: String) -> Dictionary:
	if context_node == null:
		return {}
	for node in context_node.get_tree().get_nodes_in_group("npc_placeholders"):
		if str(node.get_meta("npc_id", "")) != npc_id:
			continue
		if node.has_method("debug_reaction_snapshot"):
			var snapshot: Variant = node.call("debug_reaction_snapshot")
			if snapshot is Dictionary:
				return snapshot
	return {}

func _scene_build_blockers(scene: Node) -> Array[String]:
	var blockers: Array[String] = []
	if scene.get_script() == null:
		blockers.append("Main scene root script did not load; generated Store conversation framing cannot be trusted.")
	if get_nodes_in_group("text_surfaces").is_empty():
		blockers.append("Generated text surfaces are missing; capture cannot prove interactable Store rule context.")
	if get_nodes_in_group("interaction_zones").is_empty():
		blockers.append("Generated interaction zones are missing; capture cannot prove Store conversation focus.")
	var generation_failures := _as_array(scene.get_meta("generation_failures", []))
	for failure in generation_failures:
		blockers.append("World generation failure: %s" % str(failure))
	if _world_generator_references_missing_interaction_zone_scene():
		blockers.append("%s references missing %s; current world generation fails before Store conversation visual framing." % [
			WORLD_GENERATOR_SCRIPT_PATH,
			INTERACTION_ZONE_SCENE_PATH
		])
	return blockers

func _world_generator_references_missing_interaction_zone_scene() -> bool:
	if FileAccess.file_exists(INTERACTION_ZONE_SCENE_PATH):
		return false
	if not FileAccess.file_exists(WORLD_GENERATOR_SCRIPT_PATH):
		return false
	var source := FileAccess.get_file_as_string(WORLD_GENERATOR_SCRIPT_PATH)
	return source.find(INTERACTION_ZONE_SCENE_PATH) >= 0

func _build_summary(session: Node) -> Dictionary:
	if session != null and session.has_method("build_summary"):
		var summary: Variant = session.call("build_summary")
		if summary is Dictionary:
			return summary
	return {}

func _call_session(session: Node, method: String, args: Array = []) -> bool:
	if session == null:
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
