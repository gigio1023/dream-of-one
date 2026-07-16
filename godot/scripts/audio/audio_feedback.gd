class_name AudioFeedback
extends Node3D

## Small project-owned audio layer for the first-person town.
##
## Every stream is synthesized deterministically at startup, so the playable
## baseline has no external audio-license or import dependency. Social truth
## remains elsewhere; this node only listens to presentation state.

const MIX_RATE := 16_000
const STEP_DISTANCE_M := 1.45
const MAX_FRAME_TRAVEL_M := 0.85
const AMBIENCE_FADE_DB_PER_SECOND := 18.0
const SILENT_DB := -60.0
const PARK_DB := -28.0
const INTERIOR_DB := -32.0
const BETWEEN_ZONE_PARK_DB := -36.0
const BETWEEN_ZONE_INTERIOR_DB := -44.0
const PROP_SCAN_SECONDS := 0.25
const PROP_IMPACT_ARM_SECONDS := 0.75

@export var player_path := NodePath("../Town/Actors/Player3D")
@export var town_path := NodePath("../Town")

@onready var _footstep: AudioStreamPlayer = $Footstep
@onready var _park_ambience: AudioStreamPlayer = $ParkAmbience
@onready var _interior_ambience: AudioStreamPlayer = $InteriorAmbience
@onready var _prop_impact: AudioStreamPlayer3D = $PropImpact
@onready var _scribble: AudioStreamPlayer3D = $RecordScribble

var _player: CharacterBody3D
var _town: Node
var _footstep_streams: Array[AudioStreamWAV] = []
var _last_player_position := Vector3(INF, INF, INF)
var _step_distance_accumulator := 0.0
var _step_index := 0
var _park_target_db := SILENT_DB
var _interior_target_db := SILENT_DB
var _prop_scan_remaining := 0.0
var _prop_impact_arm_remaining := PROP_IMPACT_ARM_SECONDS
var _signal_bound_props: Dictionary = {}
var _footstep_count := 0
var _prop_impact_count := 0
var _scribble_count := 0
var _record_surface_count := 0


func _ready() -> void:
	_player = get_node_or_null(player_path) as CharacterBody3D
	_town = get_node_or_null(town_path)
	_footstep_streams = [_build_footstep_stream(0), _build_footstep_stream(1)]
	if not _footstep_streams.is_empty():
		_footstep.stream = _footstep_streams[0]
	_prop_impact.stream = _build_impact_stream()
	_scribble.stream = _build_scribble_stream()
	_park_ambience.stream = _build_ambience_stream(false)
	_interior_ambience.stream = _build_ambience_stream(true)
	_park_ambience.volume_db = SILENT_DB
	_interior_ambience.volume_db = SILENT_DB
	if _player != null:
		_last_player_position = _player.global_position
	call_deferred("_start_ambience")
	call_deferred("_bind_record_surfaces")


func _exit_tree() -> void:
	# Stop the two looping playbacks before their nodes leave AudioServer. This
	# matters for fast headless scene teardown as well as hot scene replacement.
	for player in [
		_footstep,
		_park_ambience,
		_interior_ambience,
		_prop_impact,
		_scribble,
	]:
		if not is_instance_valid(player):
			continue
		player.stop()
		player.set("stream", null)
	_footstep_streams.clear()


func _process(delta: float) -> void:
	if not get_tree().paused:
		_update_footsteps()
		_update_ambience(delta)
		_prop_impact_arm_remaining = maxf(0.0, _prop_impact_arm_remaining - delta)
		_prop_scan_remaining = maxf(0.0, _prop_scan_remaining - delta)
		if is_zero_approx(_prop_scan_remaining):
			_prop_scan_remaining = PROP_SCAN_SECONDS
			_poll_prop_impacts()


func play_prop_impact(world_position: Vector3, intensity := 1.0) -> void:
	if _prop_impact.stream == null:
		return
	_prop_impact.global_position = world_position
	_prop_impact.volume_db = lerpf(-18.0, -8.0, clampf(intensity, 0.0, 1.0))
	_prop_impact.pitch_scale = 0.92 + 0.08 * float(_prop_impact_count % 3)
	_prop_impact.play()
	_prop_impact_count += 1


func play_record_scribble(world_position: Vector3) -> void:
	if _scribble.stream == null:
		return
	_scribble.global_position = world_position
	_scribble.pitch_scale = 0.96 + 0.04 * float(_scribble_count % 2)
	_scribble.play()
	_scribble_count += 1


func presentation_snapshot() -> Dictionary:
	return {
		"procedural": true,
		"footsteps": _footstep_count,
		"propImpacts": _prop_impact_count,
		"propImpactsArmed": is_zero_approx(_prop_impact_arm_remaining),
		"recordScribbles": _scribble_count,
		"recordSurfaces": _record_surface_count,
		"speechBlipActors": get_tree().get_nodes_in_group(&"npc_actors").size(),
		"parkPlaying": _park_ambience.playing,
		"interiorPlaying": _interior_ambience.playing,
		"parkVolumeDb": _park_ambience.volume_db,
		"interiorVolumeDb": _interior_ambience.volume_db,
		"locationId": _current_location_id(),
		"trackedProps": _signal_bound_props.size(),
	}


func _update_footsteps() -> void:
	if _player == null or not is_instance_valid(_player):
		return
	var current_position := _player.global_position
	if not is_finite(_last_player_position.x):
		_last_player_position = current_position
		return
	var travel := current_position - _last_player_position
	_last_player_position = current_position
	travel.y = 0.0
	var frame_distance := travel.length()
	if frame_distance > MAX_FRAME_TRAVEL_M:
		_step_distance_accumulator = 0.0
		return
	var horizontal_speed := Vector2(_player.velocity.x, _player.velocity.z).length()
	if not _player.is_on_floor() or horizontal_speed < 0.3:
		return
	_step_distance_accumulator += frame_distance
	if _step_distance_accumulator < STEP_DISTANCE_M:
		return
	_step_distance_accumulator = fmod(_step_distance_accumulator, STEP_DISTANCE_M)
	_play_footstep()


func _play_footstep() -> void:
	if _footstep_streams.is_empty():
		return
	_footstep.stream = _footstep_streams[_step_index % _footstep_streams.size()]
	_footstep.pitch_scale = 0.96 + 0.05 * float(_step_index % 2)
	_footstep.play()
	_step_index += 1
	_footstep_count += 1


func _update_ambience(delta: float) -> void:
	match _current_location_id():
		"park":
			_park_target_db = PARK_DB
			_interior_target_db = SILENT_DB
		"studio", "office", "station":
			_park_target_db = SILENT_DB
			_interior_target_db = INTERIOR_DB
		_:
			# Open portals and connective street space blend instead of implying a door.
			_park_target_db = BETWEEN_ZONE_PARK_DB
			_interior_target_db = BETWEEN_ZONE_INTERIOR_DB
	_park_ambience.volume_db = move_toward(
		_park_ambience.volume_db,
		_park_target_db,
		AMBIENCE_FADE_DB_PER_SECOND * delta
	)
	_interior_ambience.volume_db = move_toward(
		_interior_ambience.volume_db,
		_interior_target_db,
		AMBIENCE_FADE_DB_PER_SECOND * delta
	)


func _current_location_id() -> String:
	if _town == null or not is_instance_valid(_town) or not _town.has_method("current_location_id"):
		return ""
	return str(_town.call("current_location_id")).to_lower()


func _bind_record_surfaces() -> void:
	_record_surface_count = 0
	for surface_value in get_tree().get_nodes_in_group(&"record_surfaces"):
		if not surface_value is Node3D:
			continue
		var surface := surface_value as Node3D
		if not surface.has_signal(&"record_surface_requested"):
			continue
		var callback := _on_record_surface_requested.bind(surface)
		if not surface.is_connected(&"record_surface_requested", callback):
			surface.connect(&"record_surface_requested", callback)
		_record_surface_count += 1


func _start_ambience() -> void:
	_park_ambience.play()
	_interior_ambience.play()


func _on_record_surface_requested(_surface_id: String, surface: Node3D) -> void:
	if is_instance_valid(surface):
		play_record_scribble(surface.global_position + Vector3.UP * 1.1)


func _poll_prop_impacts() -> void:
	var current_ids: Dictionary = {}
	var candidates: Array[Node] = []
	for group_name in [&"physical_props", &"carryable_props", &"holdable_props"]:
		for candidate_value in get_tree().get_nodes_in_group(group_name):
			if candidate_value is Node and candidate_value not in candidates:
				candidates.append(candidate_value as Node)
	for candidate in candidates:
		if not candidate is RigidBody3D:
			continue
		var prop := candidate as RigidBody3D
		var instance_id := prop.get_instance_id()
		current_ids[instance_id] = true
		_bind_prop_signal(prop)
	for tracked_id in _signal_bound_props.keys():
		if not current_ids.has(tracked_id):
			_signal_bound_props.erase(tracked_id)


func _bind_prop_signal(prop: RigidBody3D) -> void:
	var instance_id := prop.get_instance_id()
	if _signal_bound_props.has(instance_id) or not prop.has_signal(&"impact"):
		return
	var callback := _on_prop_impact.bind(prop)
	if not prop.is_connected(&"impact", callback):
		prop.connect(&"impact", callback)
	_signal_bound_props[instance_id] = true


func _on_prop_impact(_prop_id: Variant, speed: float, prop: RigidBody3D) -> void:
	# Newly instanced rigid bodies may report contacts while the authored town
	# settles. Those are not player actions and should not produce mystery thuds.
	if is_zero_approx(_prop_impact_arm_remaining) and is_instance_valid(prop):
		play_prop_impact(prop.global_position, inverse_lerp(0.8, 6.0, speed))


func _build_footstep_stream(variant: int) -> AudioStreamWAV:
	var duration := 0.12
	var sample_count := roundi(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for sample_index in sample_count:
		var progress := float(sample_index) / float(maxi(1, sample_count - 1))
		var time_seconds := float(sample_index) / float(MIX_RATE)
		var envelope := pow(1.0 - progress, 2.8)
		var thump := sin(TAU * (72.0 + 9.0 * variant) * time_seconds)
		var texture := _noise(sample_index, 31 + variant * 17)
		var sample := clampi(roundi((0.72 * thump + 0.28 * texture) * envelope * 7_000.0), -32_768, 32_767)
		bytes.encode_s16(sample_index * 2, sample)
	return _wav_from_bytes(bytes, sample_count, false)


func _build_impact_stream() -> AudioStreamWAV:
	var duration := 0.18
	var sample_count := roundi(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for sample_index in sample_count:
		var progress := float(sample_index) / float(maxi(1, sample_count - 1))
		var time_seconds := float(sample_index) / float(MIX_RATE)
		var envelope := pow(1.0 - progress, 4.0)
		var body := sin(TAU * 58.0 * time_seconds) + 0.45 * sin(TAU * 93.0 * time_seconds)
		var texture := _noise(sample_index, 97)
		var sample := clampi(roundi((0.72 * body + 0.28 * texture) * envelope * 8_200.0), -32_768, 32_767)
		bytes.encode_s16(sample_index * 2, sample)
	return _wav_from_bytes(bytes, sample_count, false)


func _build_scribble_stream() -> AudioStreamWAV:
	var duration := 0.34
	var sample_count := roundi(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for sample_index in sample_count:
		var progress := float(sample_index) / float(maxi(1, sample_count - 1))
		var time_seconds := float(sample_index) / float(MIX_RATE)
		var envelope := pow(sin(PI * progress), 0.55)
		var scratch_gate := 0.35 + 0.65 * absf(sin(TAU * 29.0 * time_seconds))
		var slow_sample_index := floori(float(sample_index) / 3.0)
		var texture := 0.7 * _noise(sample_index, 211) + 0.3 * _noise(slow_sample_index, 43)
		var sample := clampi(roundi(texture * scratch_gate * envelope * 3_600.0), -32_768, 32_767)
		bytes.encode_s16(sample_index * 2, sample)
	return _wav_from_bytes(bytes, sample_count, false)


func _build_ambience_stream(interior: bool) -> AudioStreamWAV:
	var duration := 4.0
	var sample_count := roundi(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	var cycles: PackedInt32Array = (
		PackedInt32Array([200, 400, 736, 1036])
		if interior
		else PackedInt32Array([168, 257, 443, 709, 997])
	)
	for sample_index in sample_count:
		var progress := float(sample_index) / float(sample_count)
		var texture := 0.0
		for component_index in cycles.size():
			var phase := float(component_index + 1) * 1.137
			texture += sin(TAU * float(cycles[component_index]) * progress + phase) / float(component_index + 1)
		var slow_motion := 0.82 + 0.18 * sin(TAU * (2.0 if interior else 3.0) * progress)
		var amplitude := 430.0 if interior else 620.0
		var sample := clampi(roundi(texture * slow_motion * amplitude), -32_768, 32_767)
		bytes.encode_s16(sample_index * 2, sample)
	return _wav_from_bytes(bytes, sample_count, true)


func _wav_from_bytes(bytes: PackedByteArray, sample_count: int, looping: bool) -> AudioStreamWAV:
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	if looping:
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = sample_count
	return stream


func _noise(sample_index: int, noise_seed: int) -> float:
	var value := ((sample_index + noise_seed) * 1_103_515_245 + 12_345) & 0x7fffffff
	return float(value % 65_536) / 32_767.5 - 1.0
