extends CharacterBody3D

@export var npc_id: StringName
@export var display_name := "NPC"
@export var role := "Placeholder"
@export var home_landmark := ""
@export var route_id := ""

var _pressure_line := ""
var _pressure_line_key := ""
var _pressure_line_args: Dictionary = {}
var _reaction_state := "normal"
var _reaction_exposure := 0
var _reaction_text := ""
var _reaction_source_text := ""
var _role_tint := "neutral"
var _role_tint_label := "neutral role"
var _body_color := Color(0.92, 0.50, 0.34, 1.0)
var _head_color := Color(1.0, 0.68, 0.48, 1.0)

@onready var _body_mesh: MeshInstance3D = $Body
@onready var _head_mesh: MeshInstance3D = $Head
@onready var _name_label: Label3D = $NameLabel
@onready var _pressure_label: Label3D = $PressureLabel
@onready var _reaction_label: Label3D = $ReactionLabel
@onready var _attention_disc: MeshInstance3D = $AttentionDisc

func _ready() -> void:
	add_to_group("npc_placeholders")
	add_to_group("localized_nodes")
	set_meta("npc_id", String(npc_id))
	set_meta("role", role)
	set_meta("home_landmark", home_landmark)
	set_meta("route_id", route_id)
	_apply_label()
	_apply_role_tint()

func configure(actor_data: Dictionary) -> void:
	npc_id = StringName(actor_data.get("id", "NPC_Placeholder"))
	display_name = str(actor_data.get("label", npc_id))
	role = str(actor_data.get("role", "Placeholder"))
	home_landmark = str(actor_data.get("home_landmark", ""))
	route_id = str(actor_data.get("route_id", ""))
	name = "Actor_%s" % String(npc_id)
	set_meta("npc_id", String(npc_id))
	set_meta("role", role)
	set_meta("home_landmark", home_landmark)
	set_meta("route_id", route_id)
	if is_node_ready():
		_apply_label()
		_apply_role_tint()

func _apply_label() -> void:
	_name_label.text = "%s\n%s" % [
		_localized("npc.%s.label" % String(npc_id), {}, display_name),
		_localized("npc.%s.role" % String(npc_id), {}, role)
	]

func say(line: String) -> void:
	_pressure_line = line
	_pressure_line_key = ""
	_pressure_line_args = {}
	_pressure_label.text = line

func set_reaction_state(state: String, exposure: int) -> void:
	_reaction_state = state
	_reaction_exposure = exposure
	_attention_disc.visible = state != "normal"
	var reaction_text := ""
	var reaction_color := Color(1.0, 0.88, 0.38, 1.0)
	match state:
		"uneasy":
			reaction_text = _localized("npc.reaction.uneasy", {}, "noticed")
			reaction_color = Color(1.0, 0.78, 0.36, 1.0)
		"probing":
			reaction_text = _localized("npc.reaction.probing", {}, "checking")
			reaction_color = Color(1.0, 0.58, 0.30, 1.0)
		"reported", "inquest":
			reaction_text = _localized("npc.reaction.reported", {}, "reported")
			reaction_color = Color(1.0, 0.38, 0.28, 1.0)
		"noted":
			reaction_text = _localized("npc.reaction.noted", {}, "note added")
			reaction_color = Color(1.0, 0.66, 0.34, 1.0)
		"paused":
			reaction_text = _localized("npc.reaction.paused", {}, "service paused")
			reaction_color = Color(1.0, 0.48, 0.28, 1.0)
		"forwarded":
			reaction_text = _localized("npc.reaction.forwarded", {}, "report forwarded")
			reaction_color = Color(1.0, 0.34, 0.28, 1.0)
		"invited":
			reaction_text = _localized("npc.reaction.invited", {}, "review open")
			reaction_color = Color(0.52, 0.78, 1.0, 1.0)
		"conditional":
			reaction_text = _localized("npc.reaction.conditional", {}, "conditional review")
			reaction_color = Color(0.62, 0.82, 1.0, 1.0)
		"deferred":
			reaction_text = _localized("npc.reaction.deferred", {}, "review deferred")
			reaction_color = Color(1.0, 0.62, 0.36, 1.0)
		"blocked":
			reaction_text = _localized("npc.reaction.blocked", {}, "review blocked")
			reaction_color = Color(1.0, 0.42, 0.34, 1.0)
		"vouched":
			reaction_text = _localized("npc.reaction.vouched", {}, "public vouch")
			reaction_color = Color(0.56, 0.86, 0.56, 1.0)
		"repaired":
			reaction_text = _localized("npc.reaction.repaired", {}, "repair posted")
			reaction_color = Color(0.62, 0.78, 1.0, 1.0)
		"warned":
			reaction_text = _localized("npc.reaction.warned", {}, "warning posted")
			reaction_color = Color(1.0, 0.62, 0.28, 1.0)
		"rumored":
			reaction_text = _localized("npc.reaction.rumored", {}, "rumor posted")
			reaction_color = Color(1.0, 0.52, 0.34, 1.0)
		"helped":
			reaction_text = _localized("npc.reaction.helped", {}, "helped")
			reaction_color = Color(0.50, 0.86, 0.66, 1.0)
		"repair_accepted":
			reaction_text = _localized("npc.reaction.repair_accepted", {}, "repair accepted")
			reaction_color = Color(0.62, 0.82, 1.0, 1.0)
		"distanced":
			reaction_text = _localized("npc.reaction.distanced", {}, "keeping distance")
			reaction_color = Color(1.0, 0.70, 0.30, 1.0)
		"left":
			reaction_text = _localized("npc.reaction.left", {}, "left queue")
			reaction_color = Color(1.0, 0.54, 0.38, 1.0)
		"refused":
			reaction_text = _localized("npc.reaction.refused", {}, "refused contact")
			reaction_color = Color(1.0, 0.36, 0.32, 1.0)
		"delayed":
			reaction_text = _localized("npc.reaction.delayed", {}, "queue delayed")
			reaction_color = Color(1.0, 0.78, 0.36, 1.0)
		_:
			reaction_text = ""
	_reaction_text = reaction_text
	_apply_reaction_label()
	_reaction_label.modulate = reaction_color
	_pressure_label.modulate = reaction_color
	var material := _reaction_material()
	if material != null:
		material.albedo_color = Color(reaction_color.r, reaction_color.g, reaction_color.b, 0.16 + minf(float(exposure), 100.0) / 420.0)
		material.emission = Color(reaction_color.r, reaction_color.g, reaction_color.b, 1.0)
		material.emission_energy_multiplier = 0.2 + minf(float(exposure), 100.0) / 240.0

func debug_reaction_snapshot() -> Dictionary:
	var material := _reaction_material()
	return {
		"npcId": String(npc_id),
		"displayName": display_name,
		"role": role,
		"state": _reaction_state,
		"exposure": _reaction_exposure,
		"pressureText": _pressure_label.text,
		"markerVisible": _attention_disc.visible,
		"reactionText": _reaction_label.text,
		"baseReactionText": _reaction_text,
		"reactionSourceText": _reaction_source_text,
		"homeLandmark": home_landmark,
		"routeId": route_id,
		"roleTint": _role_tint,
		"roleTintLabel": _role_tint_label,
		"bodyColor": _color_components(_body_color),
		"headColor": _color_components(_head_color),
		"materialAlpha": material.albedo_color.a if material != null else -1.0,
		"emissionEnergy": material.emission_energy_multiplier if material != null else -1.0
	}

func set_reaction_source(source_text: String) -> void:
	_reaction_source_text = source_text.strip_edges()
	_apply_reaction_label()

func say_key(line_key: String, args: Dictionary = {}) -> void:
	_pressure_line = ""
	_pressure_line_key = line_key
	_pressure_line_args = args.duplicate(true)
	_pressure_label.text = _localized(line_key, args)

func refresh_locale() -> void:
	_apply_label()
	set_reaction_state(_reaction_state, _reaction_exposure)
	if not _pressure_line_key.is_empty():
		_pressure_label.text = _localized(_pressure_line_key, _pressure_line_args)
	elif not _pressure_line.is_empty():
		_pressure_label.text = _pressure_line

func _reaction_material() -> StandardMaterial3D:
	var material := _attention_disc.material_override
	if material == null:
		material = _attention_disc.get_surface_override_material(0)
	if material == null:
		material = _attention_disc.get_active_material(0)
	return material as StandardMaterial3D

func _apply_reaction_label() -> void:
	if _reaction_text.is_empty():
		_reaction_label.text = ""
	elif _reaction_source_text.is_empty():
		_reaction_label.text = _reaction_text
	else:
		_reaction_label.text = "%s\n%s" % [_reaction_text, _reaction_source_text]

func _apply_role_tint() -> void:
	var profile := _role_tint_profile()
	_role_tint = str(profile.get("tint", "neutral"))
	_role_tint_label = str(profile.get("label", _role_tint))
	_body_color = profile.get("body", Color(0.92, 0.50, 0.34, 1.0))
	_head_color = profile.get("head", Color(1.0, 0.68, 0.48, 1.0))
	_apply_mesh_color(_body_mesh, _body_color)
	_apply_mesh_color(_head_mesh, _head_color)

func _role_tint_profile() -> Dictionary:
	match String(npc_id):
		"NPC_Store_Clerk":
			return {
				"tint": "store-clerk-warm",
				"label": "store clerk warm amber",
				"body": Color(0.94, 0.55, 0.22, 1.0),
				"head": Color(1.0, 0.72, 0.42, 1.0)
			}
		"NPC_Store_Manager":
			return {
				"tint": "store-manager-rust",
				"label": "store manager rust",
				"body": Color(0.78, 0.36, 0.22, 1.0),
				"head": Color(0.94, 0.55, 0.38, 1.0)
			}
		"NPC_Waiting_Customer":
			return {
				"tint": "queue-customer-teal",
				"label": "waiting customer teal",
				"body": Color(0.26, 0.67, 0.62, 1.0),
				"head": Color(0.48, 0.82, 0.76, 1.0)
			}
		"NPC_Studio_PM":
			return {
				"tint": "studio-pm-blue",
				"label": "studio pm blue",
				"body": Color(0.32, 0.52, 0.88, 1.0),
				"head": Color(0.54, 0.70, 1.0, 1.0)
			}
		"NPC_Park_Witness":
			return {
				"tint": "park-witness-green",
				"label": "park witness green",
				"body": Color(0.36, 0.66, 0.32, 1.0),
				"head": Color(0.58, 0.82, 0.50, 1.0)
			}
		"NPC_Station_Officer":
			return {
				"tint": "station-officer-violet",
				"label": "station officer violet",
				"body": Color(0.56, 0.43, 0.82, 1.0),
				"head": Color(0.72, 0.62, 0.94, 1.0)
			}

	var place_key := home_landmark.to_lower()
	if place_key.contains("studio"):
		return {
			"tint": "studio-blue",
			"label": "studio role blue",
			"body": Color(0.36, 0.56, 0.86, 1.0),
			"head": Color(0.58, 0.74, 0.98, 1.0)
		}
	if place_key.contains("park"):
		return {
			"tint": "park-green",
			"label": "park role green",
			"body": Color(0.38, 0.66, 0.34, 1.0),
			"head": Color(0.58, 0.82, 0.52, 1.0)
		}
	if place_key.contains("station"):
		return {
			"tint": "station-violet",
			"label": "station role violet",
			"body": Color(0.56, 0.44, 0.78, 1.0),
			"head": Color(0.72, 0.64, 0.92, 1.0)
		}
	return {
		"tint": "local-amber",
		"label": "local role amber",
		"body": Color(0.88, 0.52, 0.28, 1.0),
		"head": Color(1.0, 0.70, 0.46, 1.0)
	}

func _apply_mesh_color(mesh_instance: MeshInstance3D, color: Color) -> void:
	if mesh_instance == null:
		return
	var material := StandardMaterial3D.new()
	var base := mesh_instance.get_surface_override_material(0)
	if base is StandardMaterial3D:
		material = (base as StandardMaterial3D).duplicate() as StandardMaterial3D
	material.albedo_color = color
	material.roughness = 0.88
	mesh_instance.set_surface_override_material(0, material)

func _color_components(color: Color) -> Array[float]:
	return [color.r, color.g, color.b, color.a]

func _localized(key: String, args: Dictionary = {}, fallback := "") -> String:
	var localization := _localization()
	if localization != null and localization.has_method("text"):
		return str(localization.text(key, args, fallback))
	var translated := str(TranslationServer.translate(StringName(key)))
	if translated == key and not fallback.is_empty():
		translated = fallback
	return translated.format(args)

func _localization() -> Node:
	var nodes := get_tree().get_nodes_in_group("localization_services")
	if nodes.is_empty():
		return null
	return nodes[0]
