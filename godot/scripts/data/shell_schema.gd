class_name ShellSchema
extends RefCounted

const ISSUE_ID := "DRE-171"
const WORLD_ID := "dre_171_godot_shell"
const WORLD_REVISION := "rev-social-stealth-v1"
const EVIDENCE_SCHEMA := "godot-runtime-v1"

const REQUIRED_LANDMARKS: Array[String] = [
	"Store",
	"Studio",
	"Park",
	"Station"
]

const REQUIRED_TEXT_SURFACES: Array[String] = [
	"TS_Store_QueueRules",
	"TS_Studio_ApprovalCriteria",
	"TS_Park_NoticeBoard",
	"TS_Station_IntakeRules"
]

const REQUIRED_GROUP_COUNTS := {
	"landmarks": 4,
	"text_surfaces": 4,
	"npc_placeholders": 4,
	"routes": 3,
	"interaction_zones": 4,
	"free_visual_assets": 100
}

static func missing_values(required: Array[String], actual: Array[String]) -> Array[String]:
	var missing: Array[String] = []
	for value in required:
		if not actual.has(value):
			missing.append(value)
	return missing
