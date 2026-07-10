extends RefCounted
class_name PackAtlas
## Runtime access to the Kenney RPG Urban Pack packed atlas (CC0).
##
## Builds AtlasTextures and character SpriteFrames in code so no hand-authored
## .tres/.import fragility sits between the committed PNG and the scenes. The
## packed atlas is a clean 27x18 grid of 16x16 tiles with no margin/spacing.
## Character blocks are 3 rows x 4 columns: columns are left/down/up/right,
## rows are idle/walk frames. See docs/art/asset-pipeline.md.

const ATLAS_PATH := "res://assets/kenney2d/rpg-urban-pack/Tilemap/tilemap_packed.png"
const COLS := 27
const ROWS := 18
const TILE := 16

const DIR_COL := {"down": 24, "up": 25, "left": 23, "right": 26}
const WALK_FPS := 6.0

static var _atlas_cache: Texture2D = null

static func atlas() -> Texture2D:
	if _atlas_cache == null:
		_atlas_cache = load(ATLAS_PATH)
	return _atlas_cache

static func coord_for_index(index: int) -> Vector2i:
	return Vector2i(index % COLS, index / COLS)

static func region_for_index(index: int) -> Rect2i:
	var c := coord_for_index(index)
	return Rect2i(c.x * TILE, c.y * TILE, TILE, TILE)

static func tile_texture(index: int) -> AtlasTexture:
	var tex := AtlasTexture.new()
	tex.atlas = atlas()
	tex.region = region_for_index(index)
	return tex

## Character sprite index for a block (0..5), direction, and frame row (0..2).
static func character_index(block: int, dir: String, frame_row: int) -> int:
	var col: int = DIR_COL.get(dir, 24)
	var row := block * 3 + clampi(frame_row, 0, 2)
	return row * COLS + col

## SpriteFrames with idle_<dir> and walk_<dir> animations for a character block.
static func character_frames(block: int) -> SpriteFrames:
	var frames := SpriteFrames.new()
	if frames.has_animation("default"):
		frames.remove_animation("default")
	for dir in DIR_COL.keys():
		var idle_name := "idle_%s" % dir
		frames.add_animation(idle_name)
		frames.set_animation_loop(idle_name, true)
		frames.set_animation_speed(idle_name, 1.0)
		frames.add_frame(idle_name, tile_texture(character_index(block, dir, 0)))

		var walk_name := "walk_%s" % dir
		frames.add_animation(walk_name)
		frames.set_animation_loop(walk_name, true)
		frames.set_animation_speed(walk_name, WALK_FPS)
		frames.add_frame(walk_name, tile_texture(character_index(block, dir, 1)))
		frames.add_frame(walk_name, tile_texture(character_index(block, dir, 0)))
		frames.add_frame(walk_name, tile_texture(character_index(block, dir, 2)))
		frames.add_frame(walk_name, tile_texture(character_index(block, dir, 0)))
	return frames

## Build a shared TileSet from a set of atlas tile indices (creates those tiles).
static func build_tileset(indices: Array) -> TileSet:
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE, TILE)
	var src := TileSetAtlasSource.new()
	src.texture = atlas()
	src.texture_region_size = Vector2i(TILE, TILE)
	var seen := {}
	for index in indices:
		var coord := coord_for_index(int(index))
		var key := "%d,%d" % [coord.x, coord.y]
		if seen.has(key):
			continue
		seen[key] = true
		src.create_tile(coord)
	ts.add_source(src, 0)
	return ts
