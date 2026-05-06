class_name BackendBridge
extends RefCounted

const ShellSchema := preload("res://scripts/data/shell_schema.gd")

const DEFAULT_READINESS_URL := "http://127.0.0.1:8787/health/ready"
const DEFAULT_TIMEOUT_MS := 350
const AI_OWNS_STATE := false
const BRIDGE_OWNS_STATE := false

static func preflight_from_report(
	context: Dictionary,
	readiness_report: Dictionary,
	mode := "fixture",
	endpoint := ""
) -> Dictionary:
	var reasons := _extract_reasons(readiness_report)
	var status := str(readiness_report.get("status", "not_ready"))
	var ready := status == "ready" and reasons.is_empty() and _provider_ready(readiness_report) and _storage_ready(readiness_report)
	var fallback_command := {}
	if not ready:
		fallback_command = _fallback_command(context, reasons)

	return {
		"ok": ready,
		"bridgeStatus": "ready" if ready else "fallback",
		"mode": mode,
		"endpoint": endpoint,
		"reasons": reasons,
		"providerReady": _provider_ready(readiness_report),
		"storageReady": _storage_ready(readiness_report),
		"readiness": readiness_report,
		"fallbackCommand": fallback_command,
		"state": _state_contract(),
		"proofs": {
			"apiKeyRequiredBySmoke": false,
			"decisionRequested": false,
			"commandExecuted": false,
			"readinessOnly": true
		}
	}

static func probe_live_readiness(
	tree: SceneTree,
	context: Dictionary,
	endpoint := DEFAULT_READINESS_URL,
	timeout_ms := DEFAULT_TIMEOUT_MS
) -> Dictionary:
	if tree == null:
		return preflight_from_report(
			context,
			_unavailable_report("bridge_scene_tree_missing", 0, "SceneTree is unavailable."),
			"live-http",
			endpoint
		)

	var request := HTTPRequest.new()
	request.timeout = max(0.05, float(timeout_ms) / 1000.0)
	tree.root.add_child(request)

	var error := request.request(
		endpoint,
		PackedStringArray(["Accept: application/json"]),
		HTTPClient.METHOD_GET
	)
	if error != OK:
		request.queue_free()
		return preflight_from_report(
			context,
			_unavailable_report("bridge_request_start_failed", 0, "Unable to start readiness request: %s" % error),
			"live-http",
			endpoint
		)

	var response: Array = await request.request_completed
	request.queue_free()

	var result_code := int(response[0])
	var response_code := int(response[1])
	var body_bytes := response[3] as PackedByteArray
	var body_text := body_bytes.get_string_from_utf8()
	if result_code != HTTPRequest.RESULT_SUCCESS:
		return preflight_from_report(
			context,
			_unavailable_report("bridge_backend_unavailable", response_code, "Readiness endpoint did not complete: %s" % result_code),
			"live-http",
			endpoint
		)

	var parsed = JSON.parse_string(body_text)
	if not parsed is Dictionary:
		return preflight_from_report(
			context,
			_unavailable_report("bridge_invalid_readiness_response", response_code, "Readiness endpoint returned non-JSON body."),
			"live-http",
			endpoint
		)

	var report: Dictionary = parsed
	report["httpStatus"] = response_code
	return preflight_from_report(context, report, "live-http", endpoint)

static func ready_fixture() -> Dictionary:
	return {
		"status": "ready",
		"service": "npc-runtime",
		"reasons": [],
		"checks": {
			"provider": {
				"ok": true,
				"provider": "openai-api",
				"openAi": {
					"ok": true,
					"provider": "openai-api",
					"preferredModel": "mock-local-provider",
					"fallbackModels": ["mock-local-fallback"],
					"selectedModel": "mock-local-provider"
				}
			},
			"codexCommand": {
				"ok": true,
				"command": "__openai_api_proposal_provider__",
				"resolvedPath": "openai-api"
			},
			"threadStorePath": {
				"ok": true,
				"path": "mock/thread-store.json",
				"resolvedPath": "mock/thread-store.json"
			},
			"workspaceRootPath": {
				"ok": true,
				"path": "mock/workspaces",
				"resolvedPath": "mock/workspaces"
			}
		}
	}

static func not_ready_fixture(reason := "openai_api_key_missing") -> Dictionary:
	return {
		"status": "not_ready",
		"service": "npc-runtime",
		"reasons": [reason],
		"checks": {
			"provider": {
				"ok": false,
				"provider": "openai-api",
				"reason": reason,
				"openAi": {
					"ok": false,
					"provider": "openai-api",
					"reason": reason,
					"preferredModel": "mock-local-provider",
					"fallbackModels": ["mock-local-fallback"]
				}
			},
			"codexCommand": {
				"ok": true,
				"command": "__openai_api_proposal_provider__",
				"resolvedPath": "openai-api"
			},
			"threadStorePath": {
				"ok": true,
				"path": "mock/thread-store.json",
				"resolvedPath": "mock/thread-store.json"
			},
			"workspaceRootPath": {
				"ok": true,
				"path": "mock/workspaces",
				"resolvedPath": "mock/workspaces"
			}
		}
	}

static func owns_state() -> bool:
	return AI_OWNS_STATE or BRIDGE_OWNS_STATE

static func _extract_reasons(readiness_report: Dictionary) -> Array[String]:
	var reasons: Array[String] = []
	var raw_reasons = readiness_report.get("reasons", [])
	if raw_reasons is Array:
		for reason in raw_reasons:
			var reason_text := str(reason)
			if not reason_text.is_empty():
				reasons.append(reason_text)
	if reasons.is_empty() and str(readiness_report.get("status", "not_ready")) != "ready":
		reasons.append("bridge_not_ready")
	return reasons

static func _provider_ready(readiness_report: Dictionary) -> bool:
	var checks = readiness_report.get("checks", {})
	if not checks is Dictionary:
		return false
	var provider = checks.get("provider", {})
	if provider is Dictionary:
		return bool(provider.get("ok", false))
	var codex_command = checks.get("codexCommand", {})
	if codex_command is Dictionary:
		return bool(codex_command.get("ok", false))
	return false

static func _storage_ready(readiness_report: Dictionary) -> bool:
	var checks = readiness_report.get("checks", {})
	if not checks is Dictionary:
		return false
	var thread_store = checks.get("threadStorePath", {})
	var workspace_root = checks.get("workspaceRootPath", {})
	return thread_store is Dictionary \
		and workspace_root is Dictionary \
		and bool(thread_store.get("ok", false)) \
		and bool(workspace_root.get("ok", false))

static func _fallback_command(context: Dictionary, reasons: Array[String]) -> Dictionary:
	var fallback_reason_codes: Array[String] = []
	for reason in reasons:
		fallback_reason_codes.append(_fallback_reason_code(reason))
	if fallback_reason_codes.is_empty():
		fallback_reason_codes.append("fallback:bridge_not_ready")

	return {
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"commandId": "bridge-preflight-fallback-%s" % _reason_slug(fallback_reason_codes),
		"sessionId": str(context.get("sessionId", "")),
		"worldId": str(context.get("worldId", ShellSchema.WORLD_ID)),
		"worldRevision": str(context.get("worldRevision", ShellSchema.WORLD_REVISION)),
		"npcId": _fallback_actor_id(context),
		"issuedAtMs": 0,
		"timeoutMs": 1000,
		"actionType": "Idle",
		"target": {},
		"reasonCodes": fallback_reason_codes,
		"expectedStage": "intake",
		"source": "fallback"
	}

static func _fallback_actor_id(context: Dictionary) -> String:
	var actor_ids = context.get("actorIds", [])
	if actor_ids is Array:
		if actor_ids.has("NPC_Station_Officer"):
			return "NPC_Station_Officer"
		for actor_id in actor_ids:
			var actor_text := str(actor_id)
			if not actor_text.is_empty() and actor_text != "player":
				return actor_text
	return "NPC_Station_Officer"

static func _fallback_reason_code(reason: String) -> String:
	if reason.begins_with("fallback:"):
		return reason
	if reason.is_empty():
		return "fallback:bridge_not_ready"
	return "fallback:%s" % reason

static func _reason_slug(reasons: Array[String]) -> String:
	var reason := "bridge-not-ready"
	if not reasons.is_empty():
		reason = reasons[0]
	return reason.replace("fallback:", "").replace("_", "-").replace(":", "-").replace("/", "-")

static func _state_contract() -> Dictionary:
	return {
		"authority": "godot-runtime",
		"aiOwnsState": AI_OWNS_STATE,
		"bridgeOwnsState": BRIDGE_OWNS_STATE,
		"stateMutationAllowed": false
	}

static func _unavailable_report(reason: String, http_status: int, detail: String) -> Dictionary:
	return {
		"status": "not_ready",
		"service": "npc-runtime",
		"reasons": [reason],
		"httpStatus": http_status,
		"detail": detail,
		"checks": {
			"provider": {
				"ok": false,
				"provider": "unknown",
				"reason": reason
			},
			"codexCommand": {
				"ok": false,
				"command": "",
				"reason": reason
			},
			"threadStorePath": {
				"ok": false,
				"path": "",
				"resolvedPath": "",
				"reason": reason
			},
			"workspaceRootPath": {
				"ok": false,
				"path": "",
				"resolvedPath": "",
				"reason": reason
			}
		}
	}
