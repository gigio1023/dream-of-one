class_name AssetScales
extends RefCounted

## Raw source packs use different miniature scales. These are the only M3R
## world-space multipliers; placement code must not invent per-model scales.
const FURNITURE := 2.0
const NATURE := 2.5
const CITY_KITS := 5.0
const CHARACTERS := 1.0


static func for_path(path: String) -> float:
	if path.begins_with("res://assets/kenney3d/furniture/"):
		return FURNITURE
	if path.begins_with("res://assets/kenney3d/nature/"):
		return NATURE
	if path.begins_with("res://assets/kenney3d/city_"):
		return CITY_KITS
	if path.begins_with("res://assets/quaternius/"):
		return CHARACTERS
	push_error("No validated 3D asset scale for %s" % path)
	return 1.0
