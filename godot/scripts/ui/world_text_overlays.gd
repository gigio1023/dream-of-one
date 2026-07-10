extends Control
class_name WorldTextOverlays
## Native-resolution text that stays visually attached to the pixel world.
## Main projects world anchors/body bounds into viewport coordinates; this
## component owns only presentation and collision-free callout placement.

const ACTION_LINGER_MSEC := 5000
const SCREEN_MARGIN := 8.0
const CALLOUT_GAP := 7.0
const COLLISION_PADDING := 3.0
const SUMMARY_LINE_CHARS := 13
## The 80% HUD option must not reduce world-attached Korean below a readable
## raster size at 720p. Larger outputs still follow the normal proportional
## HUD scale, so this is a low-resolution floor rather than a new scale domain.
const MIN_FONT_PIXELS := 13

const INK := Color("#ece8dc")
const SPEECH_INK := Color("#27231d")
const COLD := Color("#6f8fbd")
const WARM := Color("#e2a33d")
const OUTLINE_DARK := Color(0.04, 0.05, 0.07, 1.0)

var _actors_root: Control
var _props_root: Control
var _actor_overlays: Dictionary = {}
var _prop_overlays: Dictionary = {}
var _ui_scale := 1.0
var _debug_mode := false
var _fallback_count := 0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_actors_root = _full_rect_control("Actors")
	add_child(_actors_root)
	_props_root = _full_rect_control("Props")
	add_child(_props_root)

func set_ui_scale(value: float) -> void:
	_ui_scale = maxf(value, 0.5)
	_apply_scale(self)

func set_debug_mode(value: bool) -> void:
	_debug_mode = value

func fallback_count() -> int:
	return _fallback_count

func sync(
	actor_payloads: Array,
	prop_payloads: Array,
	world_safe_rect: Rect2,
	reserved_rects: Array[Rect2] = [],
	extra_obstacles: Array[Rect2] = []
) -> void:
	_fallback_count = 0
	var viewport_safe := get_viewport().get_visible_rect().grow(-SCREEN_MARGIN * _ui_scale)
	var safe_rect := world_safe_rect.intersection(viewport_safe)
	if not safe_rect.has_area():
		_hide_all()
		return
	safe_rect = _rounded_rect(safe_rect)

	var actor_payload_by_id := _refresh_actors(actor_payloads)
	var prop_payload_by_id := _refresh_props(prop_payloads)
	var occupied: Array[Rect2] = []
	for rect in extra_obstacles:
		if rect.has_area():
			occupied.append(rect)
	for payload in actor_payload_by_id.values():
		var body: Rect2 = payload.get("avoidRect", Rect2())
		if body.has_area():
			occupied.append(body)
	for payload in prop_payload_by_id.values():
		var body: Rect2 = payload.get("avoidRect", Rect2())
		if body.has_area():
			occupied.append(body)
	for rect in reserved_rects:
		if rect.has_area():
			occupied.append(rect)

	# Identity stays quiet but readable. Place it first so transient text routes
	# around the stable visual identity instead of covering it.
	for actor_id_value in actor_payload_by_id.keys():
		var actor_id := str(actor_id_value)
		var payload: Dictionary = actor_payload_by_id[actor_id]
		var root: Control = _actor_overlays[actor_id]
		var nameplate := root.get_node("Nameplate") as Control
		var body: Rect2 = payload.get("avoidRect", Rect2())
		var rect := _place_control(nameplate, body, safe_rect, occupied, ["below", "right", "left", "above"], false)
		root.set_meta("nameplate_rect", rect)
		occupied.append(rect)

	# Speech has the highest transient priority; reactions and prop state route
	# around already placed speech so generated dialogue remains the first read.
	for actor_id_value in actor_payload_by_id.keys():
		var actor_id := str(actor_id_value)
		var payload: Dictionary = actor_payload_by_id[actor_id]
		var root: Control = _actor_overlays[actor_id]
		var speech := root.get_node("SpeechChip") as Control
		if not speech.visible:
			continue
		var body: Rect2 = payload.get("avoidRect", Rect2())
		var rect := _place_control(speech, body, safe_rect, occupied, ["above", "right", "left", "below"], true)
		occupied.append(rect)

	for actor_id_value in actor_payload_by_id.keys():
		var actor_id := str(actor_id_value)
		var payload: Dictionary = actor_payload_by_id[actor_id]
		var root: Control = _actor_overlays[actor_id]
		var marker := root.get_node("ReactionChip") as Control
		if not marker.visible:
			continue
		var body: Rect2 = payload.get("avoidRect", Rect2())
		var marker_anchor: Rect2 = root.get_meta("nameplate_rect", body)
		var rect := _place_control(marker, marker_anchor, safe_rect, occupied, ["right", "left", "below", "above"], true)
		occupied.append(rect)

	for prop_id_value in prop_payload_by_id.keys():
		var prop_id := str(prop_id_value)
		var payload: Dictionary = prop_payload_by_id[prop_id]
		var root: Control = _prop_overlays[prop_id]
		var chip := root.get_node("StateChip") as Control
		if not chip.visible:
			continue
		var body: Rect2 = payload.get("avoidRect", Rect2())
		var rect := _place_control(chip, body, safe_rect, occupied, ["above", "right", "left", "below"], true)
		occupied.append(rect)

func _refresh_actors(payloads: Array) -> Dictionary:
	var seen := {}
	var by_id := {}
	var now := Time.get_ticks_msec()
	for payload_value in payloads:
		if not payload_value is Dictionary:
			continue
		var payload: Dictionary = payload_value
		var actor_id := str(payload.get("actorId", ""))
		if actor_id.is_empty():
			continue
		seen[actor_id] = true
		var root: Control = _actor_overlays.get(actor_id, null)
		if root == null:
			root = _create_actor_overlay(actor_id)
			_actor_overlays[actor_id] = root
		var on_screen := bool(payload.get("onScreen", true))
		root.visible = on_screen
		if not on_screen:
			continue
		by_id[actor_id] = payload
		var name_label := root.get_node("Nameplate/Name") as Label
		var accent_tick := root.get_node("Nameplate/AccentTick") as ColorRect
		var action_label := root.get_node("Nameplate/Action") as Label
		var actor_label := str(payload.get("label", actor_id))
		var actor_role := str(payload.get("role", ""))
		name_label.text = (
			"%s · %s" % [actor_label, actor_role]
			if not actor_role.is_empty() and not actor_label.contains(actor_role)
			else actor_label
		)
		var accent: Color = payload.get("accent", COLD) if payload.get("accent") is Color else COLD
		accent_tick.color = Color(accent, 0.9)
		action_label.text = str(payload.get("action", ""))
		var tool := str(payload.get("actionTool", payload.get("action", "")))
		if str(root.get_meta("last_tool", "")) != tool:
			root.set_meta("last_tool", tool)
			root.set_meta("tool_since", now)
		var recent := tool != "observe" and now - int(root.get_meta("tool_since", 0)) < ACTION_LINGER_MSEC
		action_label.visible = (
			not action_label.text.is_empty()
			and (_debug_mode or recent or bool(payload.get("focused", false)) or bool(payload.get("speaking", false)))
		)

		var speech := root.get_node("SpeechChip") as PanelContainer
		var speech_label := root.get_node("SpeechChip/Margin/Text") as Label
		var summary := str(payload.get("speech", ""))
		speech_label.text = _wrap_summary(summary)
		speech.visible = not summary.is_empty()
		var marker := root.get_node("ReactionChip") as PanelContainer
		var marker_label := root.get_node("ReactionChip/Margin/Text") as Label
		marker_label.text = str(payload.get("reaction", ""))
		marker.visible = bool(payload.get("reactionVisible", false)) and not marker_label.text.is_empty()

	for actor_id_value in _actor_overlays.keys():
		var actor_id := str(actor_id_value)
		if seen.has(actor_id):
			continue
		(_actor_overlays[actor_id] as Control).queue_free()
		_actor_overlays.erase(actor_id)
	return by_id

func _refresh_props(payloads: Array) -> Dictionary:
	var seen := {}
	var by_id := {}
	for payload_value in payloads:
		if not payload_value is Dictionary:
			continue
		var payload: Dictionary = payload_value
		var prop_id := str(payload.get("propId", ""))
		if prop_id.is_empty():
			continue
		seen[prop_id] = true
		var root: Control = _prop_overlays.get(prop_id, null)
		if root == null:
			root = _create_prop_overlay(prop_id)
			_prop_overlays[prop_id] = root
		var on_screen := bool(payload.get("onScreen", true))
		root.visible = on_screen
		if not on_screen:
			continue
		by_id[prop_id] = payload
		var name_label := root.get_node("StateChip/Margin/Column/Name") as Label
		var state_label := root.get_node("StateChip/Margin/Column/State") as Label
		name_label.text = str(payload.get("label", prop_id))
		state_label.text = str(payload.get("state", ""))
		var chip := root.get_node("StateChip") as PanelContainer
		chip.visible = bool(payload.get("stateVisible", false)) and not state_label.text.is_empty()

	for prop_id_value in _prop_overlays.keys():
		var prop_id := str(prop_id_value)
		if seen.has(prop_id):
			continue
		(_prop_overlays[prop_id] as Control).queue_free()
		_prop_overlays.erase(prop_id)
	return by_id

func _create_actor_overlay(actor_id: String) -> Control:
	var root := _full_rect_control("Actor_%s" % actor_id)
	_actors_root.add_child(root)

	var nameplate := VBoxContainer.new()
	nameplate.name = "Nameplate"
	nameplate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	nameplate.add_theme_constant_override("separation", 1)
	root.add_child(nameplate)
	var name_label := _label("", 12, INK)
	name_label.name = "Name"
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_set_outline(name_label, 3)
	nameplate.add_child(name_label)
	var accent_tick := ColorRect.new()
	accent_tick.name = "AccentTick"
	accent_tick.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_set_minimum(accent_tick, Vector2(14, 2))
	accent_tick.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	nameplate.add_child(accent_tick)
	var action_label := _label("", 11, Color("#b8c9df"))
	action_label.name = "Action"
	action_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_set_outline(action_label, 3)
	action_label.visible = false
	nameplate.add_child(action_label)

	var speech := _panel("SpeechChip", "speech")
	root.add_child(speech)
	var speech_margin := _margin("Margin", Vector4(8, 5, 8, 5))
	speech.add_child(speech_margin)
	var speech_label := _label("", 13, SPEECH_INK)
	speech_label.name = "Text"
	speech_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	speech_margin.add_child(speech_label)
	speech.visible = false

	var marker := _panel("ReactionChip", "reaction")
	root.add_child(marker)
	var marker_margin := _margin("Margin", Vector4(6, 3, 6, 3))
	marker.add_child(marker_margin)
	var marker_label := _label("", 11, Color("#f4cc7d"))
	marker_label.name = "Text"
	marker_margin.add_child(marker_label)
	marker.visible = false
	return root

func _create_prop_overlay(prop_id: String) -> Control:
	var root := _full_rect_control("Prop_%s" % prop_id)
	_props_root.add_child(root)
	var chip := _panel("StateChip", "prop")
	root.add_child(chip)
	var margin := _margin("Margin", Vector4(6, 4, 6, 4))
	chip.add_child(margin)
	var column := VBoxContainer.new()
	column.name = "Column"
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.add_theme_constant_override("separation", 0)
	margin.add_child(column)
	var name_label := _label("", 11, INK)
	name_label.name = "Name"
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(name_label)
	var state_label := _label("", 10, Color("#b8c9df"))
	state_label.name = "State"
	state_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(state_label)
	chip.visible = false
	return root

func _place_control(
	control: Control,
	anchor: Rect2,
	safe_rect: Rect2,
	obstacles: Array[Rect2],
	directions: Array[String],
	track_fallback: bool
) -> Rect2:
	var control_size := _fit_control(control)
	var preferred: Array[String] = []
	var cached := str(control.get_meta("overlay_slot", ""))
	if directions.has(cached):
		preferred.append(cached)
	for direction in directions:
		if not preferred.has(direction):
			preferred.append(direction)

	for direction in preferred:
		var candidate := _candidate_rect(anchor, control_size, direction)
		if _contains_rect(safe_rect, candidate) and not _intersects_any(candidate, obstacles):
			return _commit_placement(control, candidate, safe_rect, direction, false)

	# A subject may be partially visible at a room or camera edge. In that case
	# every raw slot can cross the safe boundary even though the same slot,
	# clamped inward, is collision-free. Treat that as a valid placement rather
	# than falling through to least-overlap scoring.
	for direction in preferred:
		var candidate := _clamp_rect(_candidate_rect(anchor, control_size, direction), safe_rect)
		if _contains_rect(safe_rect, candidate) and not _intersects_any(candidate, obstacles):
			return _commit_placement(control, candidate, safe_rect, direction, false)

	# Bottom sheets, dense furniture, and nearby actors can exhaust the four
	# immediate slots. Try the free edge of every known obstacle before accepting
	# an overlap; choosing across one combined candidate set avoids arbitrary
	# jumps to whichever HUD panel happened to be enumerated first.
	var edge_candidates: Array[Dictionary] = []
	var lane_offsets := [0, 1, -1, 2, -2, 3, -3, 4, -4]
	for obstacle_index in range(obstacles.size()):
		var obstacle := obstacles[obstacle_index]
		for direction in preferred:
			var base := _escape_candidate_rect(anchor, obstacle, control_size, direction)
			for lane in lane_offsets:
				edge_candidates.append({
					"key": "edge_%d_%s_%d" % [obstacle_index, direction, int(lane)],
					"rect": _clamp_rect(_shift_edge_lane(base, control_size, direction, int(lane)), safe_rect),
				})
	if cached.begins_with("edge_"):
		for spec in edge_candidates:
			if str(spec.get("key", "")) != cached:
				continue
			var candidate: Rect2 = spec.get("rect", Rect2())
			if _contains_rect(safe_rect, candidate) and not _intersects_any(candidate, obstacles):
				return _commit_placement(control, candidate, safe_rect, cached, false)
	var best_edge := Rect2()
	var best_edge_key := ""
	var best_edge_distance := INF
	for spec in edge_candidates:
		var key := str(spec.get("key", ""))
		if key == cached:
			continue
		var candidate: Rect2 = spec.get("rect", Rect2())
		if not _contains_rect(safe_rect, candidate) or _intersects_any(candidate, obstacles):
			continue
		var distance := candidate.get_center().distance_squared_to(anchor.get_center())
		if distance < best_edge_distance:
			best_edge = candidate
			best_edge_key = key
			best_edge_distance = distance
	if best_edge.has_area():
		return _commit_placement(control, best_edge, safe_rect, best_edge_key, false)

	var best_rect := Rect2()
	var best_direction := ""
	var best_overlap_count := 2147483647
	var best_overlap_area := INF
	var best_distance := INF
	for direction in preferred:
		var raw := _candidate_rect(anchor, control_size, direction)
		var candidate := _clamp_rect(raw, safe_rect)
		var overlap_count := 0
		var overlap_area := 0.0
		for obstacle in obstacles:
			if candidate.grow(COLLISION_PADDING * _ui_scale).intersects(obstacle):
				overlap_count += 1
				overlap_area += _intersection_area(candidate, obstacle)
		var distance := candidate.position.distance_squared_to(raw.position)
		var better := (
			overlap_count < best_overlap_count
			or (overlap_count == best_overlap_count and overlap_area < best_overlap_area)
			or (
				overlap_count == best_overlap_count
				and is_equal_approx(overlap_area, best_overlap_area)
				and distance < best_distance
			)
		)
		if better:
			best_overlap_count = overlap_count
			best_overlap_area = overlap_area
			best_distance = distance
			best_rect = candidate
			best_direction = direction
	var committed := _commit_placement(control, best_rect, safe_rect, best_direction, true)
	if track_fallback:
		_fallback_count += 1
	return committed

func _commit_placement(control: Control, rect: Rect2, safe_rect: Rect2, slot: String, fallback: bool) -> Rect2:
	var snapped := _clamp_rect(Rect2(rect.position.round(), rect.size), safe_rect)
	control.position = snapped.position
	control.set_meta("overlay_slot", slot)
	control.set_meta("placement_fallback", fallback)
	return Rect2(control.position, rect.size)

func _candidate_rect(anchor: Rect2, control_size: Vector2, direction: String) -> Rect2:
	var gap := CALLOUT_GAP * _ui_scale
	var center := anchor.get_center()
	match direction:
		"above":
			return Rect2(Vector2(center.x - control_size.x * 0.5, anchor.position.y - gap - control_size.y), control_size)
		"right":
			return Rect2(Vector2(anchor.end.x + gap, center.y - control_size.y * 0.5), control_size)
		"left":
			return Rect2(Vector2(anchor.position.x - gap - control_size.x, center.y - control_size.y * 0.5), control_size)
		_:
			return Rect2(Vector2(center.x - control_size.x * 0.5, anchor.end.y + gap), control_size)

func _escape_candidate_rect(anchor: Rect2, obstacle: Rect2, control_size: Vector2, direction: String) -> Rect2:
	var gap := CALLOUT_GAP * _ui_scale
	var center := anchor.get_center()
	match direction:
		"above":
			return Rect2(Vector2(center.x - control_size.x * 0.5, obstacle.position.y - gap - control_size.y), control_size)
		"right":
			return Rect2(Vector2(obstacle.end.x + gap, center.y - control_size.y * 0.5), control_size)
		"left":
			return Rect2(Vector2(obstacle.position.x - gap - control_size.x, center.y - control_size.y * 0.5), control_size)
		_:
			return Rect2(Vector2(center.x - control_size.x * 0.5, obstacle.end.y + gap), control_size)

func _shift_edge_lane(rect: Rect2, control_size: Vector2, direction: String, lane: int) -> Rect2:
	if lane == 0:
		return rect
	var shifted := rect
	if direction == "above" or direction == "below":
		var step_x := maxf(8.0 * _ui_scale, control_size.x * 0.5)
		shifted.position.x += lane * step_x
	else:
		var step_y := maxf(8.0 * _ui_scale, control_size.y * 0.5)
		shifted.position.y += lane * step_y
	return shifted

func _fit_control(control: Control) -> Vector2:
	control.reset_size()
	var minimum := control.get_combined_minimum_size().ceil()
	control.size = minimum
	return minimum

func _contains_rect(outer: Rect2, inner: Rect2) -> bool:
	return (
		inner.position.x >= outer.position.x
		and inner.position.y >= outer.position.y
		and inner.end.x <= outer.end.x
		and inner.end.y <= outer.end.y
	)

func _intersects_any(rect: Rect2, obstacles: Array[Rect2]) -> bool:
	var padded := rect.grow(COLLISION_PADDING * _ui_scale)
	for obstacle in obstacles:
		if obstacle.has_area() and padded.intersects(obstacle):
			return true
	return false

func _clamp_rect(rect: Rect2, bounds: Rect2) -> Rect2:
	var max_x := maxf(bounds.position.x, bounds.end.x - rect.size.x)
	var max_y := maxf(bounds.position.y, bounds.end.y - rect.size.y)
	return Rect2(
		Vector2(
			clampf(rect.position.x, bounds.position.x, max_x),
			clampf(rect.position.y, bounds.position.y, max_y)
		),
		rect.size
	)

func _intersection_area(first: Rect2, second: Rect2) -> float:
	var overlap := first.intersection(second)
	return overlap.size.x * overlap.size.y if overlap.has_area() else 0.0

func _rounded_rect(rect: Rect2) -> Rect2:
	var position := rect.position.ceil()
	var end := rect.end.floor()
	return Rect2(position, (end - position).max(Vector2.ZERO))

func _wrap_summary(text: String) -> String:
	if text.length() <= SUMMARY_LINE_CHARS:
		return text
	var lines: Array[String] = []
	var cursor := 0
	while cursor < text.length():
		lines.append(text.substr(cursor, SUMMARY_LINE_CHARS))
		cursor += SUMMARY_LINE_CHARS
	return "\n".join(lines)

func _hide_all() -> void:
	for root in _actor_overlays.values():
		(root as Control).visible = false
	for root in _prop_overlays.values():
		(root as Control).visible = false

func _full_rect_control(node_name: String) -> Control:
	var control := Control.new()
	control.name = node_name
	control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return control

func _panel(node_name: String, kind: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = node_name
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.set_meta("overlay_style", kind)
	_apply_panel_style(panel)
	return panel

func _label(text: String, logical_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.set_meta("overlay_font_size", logical_size)
	label.add_theme_font_size_override("font_size", _scaled_font_size(logical_size))
	label.add_theme_color_override("font_color", color)
	return label

func _margin(node_name: String, values: Vector4) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.name = node_name
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.set_meta("overlay_margins", values)
	_apply_margin(margin)
	return margin

func _set_outline(control: Control, logical_size: int) -> void:
	control.set_meta("overlay_outline", logical_size)
	control.add_theme_color_override("font_outline_color", OUTLINE_DARK)
	control.add_theme_constant_override("outline_size", roundi(logical_size * _ui_scale))

func _set_minimum(control: Control, logical_size: Vector2) -> void:
	control.set_meta("overlay_minimum_size", logical_size)
	control.custom_minimum_size = logical_size * _ui_scale

func _apply_scale(node: Node) -> void:
	if node is Control:
		var control := node as Control
		if control.has_meta("overlay_font_size"):
			control.add_theme_font_size_override("font_size", _scaled_font_size(int(control.get_meta("overlay_font_size"))))
		if control.has_meta("overlay_outline"):
			control.add_theme_constant_override("outline_size", roundi(float(control.get_meta("overlay_outline")) * _ui_scale))
		if control.has_meta("overlay_minimum_size"):
			control.custom_minimum_size = Vector2(control.get_meta("overlay_minimum_size")) * _ui_scale
		if control is MarginContainer and control.has_meta("overlay_margins"):
			_apply_margin(control as MarginContainer)
		if control is PanelContainer and control.has_meta("overlay_style"):
			_apply_panel_style(control as PanelContainer)
	for child in node.get_children():
		_apply_scale(child)

func _scaled_font_size(logical_size: int) -> int:
	return maxi(MIN_FONT_PIXELS, roundi(logical_size * _ui_scale))

func _apply_margin(margin: MarginContainer) -> void:
	var values := Vector4(margin.get_meta("overlay_margins", Vector4.ZERO))
	margin.add_theme_constant_override("margin_left", roundi(values.x * _ui_scale))
	margin.add_theme_constant_override("margin_top", roundi(values.y * _ui_scale))
	margin.add_theme_constant_override("margin_right", roundi(values.z * _ui_scale))
	margin.add_theme_constant_override("margin_bottom", roundi(values.w * _ui_scale))

func _apply_panel_style(panel: PanelContainer) -> void:
	var kind := str(panel.get_meta("overlay_style", "reaction"))
	match kind:
		"speech":
			panel.add_theme_stylebox_override("panel", _style(Color(0.95, 0.91, 0.82, 0.98), Color("#b9894d"), 0.95, 5, 3))
		"prop":
			panel.add_theme_stylebox_override("panel", _style(Color(0.055, 0.075, 0.10, 0.96), COLD, 0.82, 3, 2))
		_:
			panel.add_theme_stylebox_override("panel", _style(Color(0.11, 0.12, 0.14, 0.96), WARM, 0.88, 3, 2))

func _style(background: Color, accent: Color, alpha: float, radius: int, shadow: int) -> StyleBoxFlat:
	var scale_int := maxi(1, roundi(_ui_scale))
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = Color(accent, alpha)
	style.set_border_width_all(scale_int)
	style.set_corner_radius_all(roundi(radius * _ui_scale))
	style.shadow_color = Color(0, 0, 0, 0.38)
	style.shadow_size = roundi(shadow * _ui_scale)
	style.shadow_offset = Vector2(0, roundi(2 * _ui_scale))
	return style
