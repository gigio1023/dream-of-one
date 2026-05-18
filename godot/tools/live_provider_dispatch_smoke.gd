extends SceneTree

const BackendBridge := preload("res://scripts/runtime/backend_bridge.gd")
const ShellSchema := preload("res://scripts/data/shell_schema.gd")
const MAIN_SCENE := "res://scenes/main.tscn"
const OUTPUT_PATH := "res://../data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json"
const ARTIFACT_PATH := "data/evidence/godot/live-provider-dispatch/dre_171_live_provider_dispatch_smoke.json"
const OUTPUT_ENV := "DREAM_OF_ONE_LIVE_PROVIDER_DISPATCH_OUTPUT"
const MAX_ROUTE_PROVIDER_ESTIMATED_COST_USD := 0.01
const MAX_ROUTE_PROVIDER_TOTAL_ESTIMATED_COST_USD := 0.01

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var failures: Array[String] = []
	var context := _mock_context()
	var before_fingerprint := JSON.stringify(context)
	var ready_endpoint := OS.get_environment("DREAM_LIVE_BACKEND_READY_URL")
	if ready_endpoint.is_empty():
		ready_endpoint = BackendBridge.DEFAULT_READINESS_URL
	var decision_endpoint := OS.get_environment("DREAM_LIVE_BACKEND_DECISION_URL")
	if decision_endpoint.is_empty():
		decision_endpoint = BackendBridge.DEFAULT_DECISION_URL

	var readiness := await BackendBridge.probe_live_readiness(
		self,
		context,
		ready_endpoint,
		BackendBridge.DEFAULT_DECISION_TIMEOUT_MS
	)
	_require(readiness["ok"], failures, "Live backend readiness must pass before spending a provider decision request.")
	_require(readiness.get("providerReady", false), failures, "Live backend provider must be ready.")
	_require(not bool(readiness["state"]["aiOwnsState"]), failures, "AI must not own Godot state in readiness.")
	_require(not bool(readiness["state"]["bridgeOwnsState"]), failures, "Bridge must not own Godot state in readiness.")

	var session: Node = null
	var provider_packet := {}
	var route_before := {}
	var route_after := {}
	var route_final := {}
	var route_before_fingerprint := ""
	var route_after_fingerprint := ""
	var route_after_customer_fingerprint := ""
	var customer_provider_mutated_route := false
	var customer_provider_packet := {}
	var customer_decision_report := {}
	if failures.is_empty():
		session = await _load_playable_session(failures)
	if failures.is_empty():
		await _drive_session(session, "focus.store_counter", {}, failures)
		await _drive_session(session, "conversation.start", {}, failures)
		provider_packet = session.call(
			"debug_live_provider_packet",
			"godot-live-playable-route-provider-%d-%d" % [
				Time.get_unix_time_from_system(),
				Time.get_ticks_msec()
			]
		)
		route_before = _session_summary(session)
		route_before_fingerprint = _route_fingerprint(route_before)

	var decision_report := {}
	if failures.is_empty():
		decision_report = await BackendBridge.probe_live_decision(
			self,
			provider_packet,
			decision_endpoint,
			BackendBridge.DEFAULT_DECISION_TIMEOUT_MS
		)
		_validate_decision_report(decision_report, provider_packet, failures)
	if failures.is_empty():
		route_after = _session_summary(session)
		route_after_fingerprint = _route_fingerprint(route_after)
		_require(route_before_fingerprint == route_after_fingerprint, failures, "Live provider decision mutated PlayableSession route state.")
		await _drive_session(session, "dialogue.choice.by_id", {"choiceId": "store.same_order.safe"}, failures)
		await _drive_session(session, "dialogue.choice.by_id", {"choiceId": "store.same_order.probe.safe"}, failures)
		route_final = _session_summary(session)
		_validate_route_parity(route_final, failures)
	if failures.is_empty():
		var route_final_fingerprint := _route_fingerprint(route_final)
		var clerk_live_observation := _live_observation_event(decision_report)
		customer_provider_packet = session.call(
			"debug_live_provider_packet",
			"godot-live-playable-route-provider-customer-%d-%d" % [
				Time.get_unix_time_from_system(),
				Time.get_ticks_msec()
			],
			"NPC_Waiting_Customer",
			[clerk_live_observation]
		)
		_require(
			_recent_events_have(customer_provider_packet, clerk_live_observation),
			failures,
			"Waiting Customer provider packet must observe the Store Clerk live utterance."
		)
		customer_decision_report = await BackendBridge.probe_live_decision(
			self,
			customer_provider_packet,
			decision_endpoint,
			BackendBridge.DEFAULT_DECISION_TIMEOUT_MS
		)
		_validate_decision_report(customer_decision_report, customer_provider_packet, failures)
		route_final = _session_summary(session)
		route_after_customer_fingerprint = _route_fingerprint(route_final)
		customer_provider_mutated_route = route_final_fingerprint != route_after_customer_fingerprint
		_require(not customer_provider_mutated_route, failures, "Waiting Customer live provider decision mutated PlayableSession route state.")

	var usage_totals := _provider_usage_totals([
		decision_report.get("decision", {}).get("meta", {}).get("providerUsage", {}),
		customer_decision_report.get("decision", {}).get("meta", {}).get("providerUsage", {})
	])
	if not decision_report.is_empty() and not customer_decision_report.is_empty():
		_require(float(usage_totals.get("estimatedCostUsd", 1.0)) <= MAX_ROUTE_PROVIDER_TOTAL_ESTIMATED_COST_USD, failures, "Two-actor live provider proof must stay under the total estimated cap.")

	var after_fingerprint := JSON.stringify(context)
	_require(before_fingerprint == after_fingerprint, failures, "Live provider dispatch smoke mutated runtime context.")

	var decision: Dictionary = decision_report.get("decision", {})
	var meta: Dictionary = decision.get("meta", {})
	var intent: Dictionary = decision.get("intent", {})
	var provider_usage: Dictionary = meta.get("providerUsage", {})
	var live_decisions: Array[Dictionary] = []
	if not decision_report.is_empty():
		live_decisions.append(_summarize_decision(decision_report))
	if not customer_decision_report.is_empty():
		live_decisions.append(_summarize_decision(customer_decision_report))
	var pack := {
		"ok": failures.is_empty(),
		"runId": "dre-live-provider-dispatch-smoke",
		"schemaVersion": ShellSchema.EVIDENCE_SCHEMA,
		"adapter": "godot",
		"checks": {
			"readiness": _summarize_readiness(readiness),
			"decision": _summarize_decision(decision_report),
			"liveDecisions": live_decisions,
			"playableRoute": {
				"before": _summarize_route(route_before),
				"afterProviderDecision": _summarize_route(route_after),
				"final": _summarize_route(route_final),
				"stateMutatedByProviderDecision": route_before_fingerprint != route_after_fingerprint or customer_provider_mutated_route
			}
		},
		"proofs": {
			"decisionRequested": not decision_report.is_empty(),
			"decisionCount": live_decisions.size(),
			"liveActorIds": _live_actor_ids(live_decisions),
			"commandExecuted": false,
			"contextMutated": before_fingerprint != after_fingerprint,
			"providerMode": "openai-codex",
			"selectedModel": str(provider_usage.get("model", "")),
			"usedFallback": bool(meta.get("usedFallback", true)),
			"transport": str(meta.get("transport", "")),
			"utterance": str(intent.get("utterance", "")),
			"estimatedCostUsd": float(provider_usage.get("estimatedCostUsd", 0.0)),
			"actualInputTokens": int(provider_usage.get("actualInputTokens", 0)),
			"actualOutputTokens": int(provider_usage.get("actualOutputTokens", 0)),
			"actualTotalTokens": int(provider_usage.get("actualTotalTokens", 0)),
			"totalEstimatedCostUsd": float(usage_totals.get("estimatedCostUsd", 0.0)),
			"totalActualInputTokens": int(usage_totals.get("actualInputTokens", 0)),
			"totalActualOutputTokens": int(usage_totals.get("actualOutputTokens", 0)),
			"totalActualTokens": int(usage_totals.get("actualTotalTokens", 0)),
			"chatGptProQuotaRemaining": "not_exposed_by_codex_response",
			"productProviderStateChanged": false,
			"playableSessionPacket": not provider_packet.is_empty(),
			"multiActorLiveProviderPackets": not provider_packet.is_empty() and not customer_provider_packet.is_empty(),
			"npcToNpcLiveObservation": not customer_provider_packet.is_empty() and _recent_events_have(customer_provider_packet, _live_observation_event(decision_report)),
			"providerDecisionMutatedRouteState": route_before_fingerprint != route_after_fingerprint or customer_provider_mutated_route,
			"fallbackParityRouteOutcome": str(route_final.get("routeOutcome", "")),
			"fallbackParitySessionOutcome": str(route_final.get("sessionOutcome", ""))
		},
		"artifactPath": ARTIFACT_PATH,
		"failures": failures
	}

	var output_path := _evidence_output_path()
	DirAccess.make_dir_recursive_absolute(output_path.get_base_dir())
	var file := FileAccess.open(output_path, FileAccess.WRITE)
	if file == null:
		failures.append("Unable to write live provider dispatch evidence: %s" % error_string(FileAccess.get_open_error()))
		pack["ok"] = false
		pack["failures"] = failures
	else:
		file.store_string(JSON.stringify(pack, "\t"))
		file.close()

	if failures.is_empty():
		print(JSON.stringify(pack, "\t"))
		quit(0)
	else:
		printerr(JSON.stringify(pack, "\t"))
		quit(1)

func _mock_context() -> Dictionary:
	return {
		"sessionId": "dre-live-provider-dispatch-smoke-session",
		"worldId": ShellSchema.WORLD_ID,
		"worldRevision": ShellSchema.WORLD_REVISION,
		"actorIds": ["NPC_Store_Clerk", "player"],
		"landmarkIds": ShellSchema.REQUIRED_LANDMARKS,
		"zoneIds": ["StoreCounterZone"],
		"textSurfaceIds": ShellSchema.REQUIRED_TEXT_SURFACES,
		"completedCommandIds": [],
		"inFlightActorIds": []
	}

func _validate_decision_report(report: Dictionary, provider_packet: Dictionary, failures: Array[String]) -> void:
	_require(report.get("ok", false), failures, "Live provider decision must return ok=true.")
	_require(int(report.get("httpStatus", 0)) == 200, failures, "Decision endpoint must return HTTP 200.")
	_require(not bool(report["state"]["aiOwnsState"]), failures, "AI must not own Godot state in decision.")
	_require(not bool(report["state"]["bridgeOwnsState"]), failures, "Bridge must not own Godot state in decision.")
	var decision: Dictionary = report.get("decision", {})
	var intent: Dictionary = decision.get("intent", {})
	var meta: Dictionary = decision.get("meta", {})
	var provider_usage: Dictionary = meta.get("providerUsage", {})
	_require(not bool(meta.get("usedFallback", true)), failures, "Live provider decision must not use fallback.")
	_require(str(meta.get("transport", "")) == "codex", failures, "Live provider decision must use codex transport.")
	_require(str(provider_usage.get("model", "")) == "gpt-5.4-mini", failures, "Live provider decision must use gpt-5.4-mini.")
	_require(float(provider_usage.get("estimatedCostUsd", 1.0)) <= MAX_ROUTE_PROVIDER_ESTIMATED_COST_USD, failures, "Live provider decision must stay under the per-request estimated cap.")
	_require(int(provider_usage.get("actualTotalTokens", 0)) > 0, failures, "Live provider decision must report actual token usage.")
	_require(str(intent.get("npcId", "")) == str(provider_packet.get("npcId", "")), failures, "Live provider decision must target the requested NPC.")
	_require(str(intent.get("utterance", "")).length() > 0, failures, "Live provider decision must include bounded wording.")
	_require(Array(intent.get("reasonCodes", [])).has("openai_text_proposal"), failures, "Live provider decision must mark wording-only proposal reason.")
	_validate_role_voice_decision(intent, failures)

func _validate_role_voice_decision(intent: Dictionary, failures: Array[String]) -> void:
	var npc_id := str(intent.get("npcId", ""))
	var utterance := str(intent.get("utterance", "")).replace(" ", "")
	if npc_id != "NPC_Waiting_Customer":
		return
	var forbidden_player_blame := ["제가착각", "제가잘못", "제주문", "제가주문"]
	for phrase in forbidden_player_blame:
		_require(not utterance.contains(phrase), failures, "Waiting Customer live wording must not confess as the player or take blame for the player's order.")

func _validate_route_parity(summary: Dictionary, failures: Array[String]) -> void:
	_require(str(summary.get("routeOutcome", "")) == "clean_cover", failures, "PlayableSession route outcome must remain clean_cover after the live provider probe.")
	_require(str(summary.get("sessionOutcome", "")) == "cover_held", failures, "PlayableSession session outcome must remain cover_held after the live provider probe.")
	var provider_state: Dictionary = summary.get("providerState", {})
	_require(str(provider_state.get("mode", "")) == "fallback_only_m1", failures, "PlayableSession product provider state must remain fallback_only_m1.")
	_require(not bool(provider_state.get("liveVerified", true)), failures, "PlayableSession product provider state must remain liveVerified=false.")
	var agent_actions: Array = summary.get("agentActionLog", [])
	_require(_agent_log_has(agent_actions, "NPC_Store_Clerk", "create_receipt"), failures, "Fallback parity route must still create the deterministic receipt.")
	_require(_agent_log_has(agent_actions, "NPC_Waiting_Customer", "accept_routine"), failures, "Fallback parity route must still run the waiting customer routine acceptance.")

func _live_observation_event(report: Dictionary) -> String:
	var decision: Dictionary = report.get("decision", {})
	var intent: Dictionary = decision.get("intent", {})
	return "live_utterance:%s:%s" % [
		str(intent.get("npcId", "")),
		str(intent.get("utterance", ""))
	]

func _recent_events_have(packet: Dictionary, expected: String) -> bool:
	for event in Array(packet.get("recentEvents", [])):
		if str(event) == expected:
			return true
	return false

func _agent_log_has(actions: Array, actor_id: String, affordance: String) -> bool:
	for action in actions:
		if not action is Dictionary:
			continue
		var item: Dictionary = action
		if str(item.get("actorId", "")) == actor_id and str(item.get("affordance", "")) == affordance and bool(item.get("accepted", false)):
			return true
	return false

func _summarize_readiness(readiness: Dictionary) -> Dictionary:
	return {
		"ok": readiness.get("ok", false),
		"bridgeStatus": readiness.get("bridgeStatus", "unknown"),
		"providerReady": readiness.get("providerReady", false),
		"storageReady": readiness.get("storageReady", false),
		"endpoint": readiness.get("endpoint", ""),
		"reasons": readiness.get("reasons", []),
		"provider": readiness.get("readiness", {}).get("checks", {}).get("provider", {})
	}

func _summarize_decision(report: Dictionary) -> Dictionary:
	var decision: Dictionary = report.get("decision", {})
	var intent: Dictionary = decision.get("intent", {})
	var meta: Dictionary = decision.get("meta", {})
	return {
		"ok": report.get("ok", false),
		"httpStatus": report.get("httpStatus", 0),
		"reason": report.get("reason", ""),
		"endpoint": report.get("endpoint", ""),
		"npcId": intent.get("npcId", ""),
		"actionType": intent.get("actionType", ""),
		"utterance": intent.get("utterance", ""),
		"usedFallback": meta.get("usedFallback", true),
		"transport": meta.get("transport", ""),
		"threadId": meta.get("threadId", ""),
		"providerUsage": meta.get("providerUsage", {})
	}

func _load_playable_session(failures: Array[String]) -> Node:
	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		failures.append("Unable to load %s" % MAIN_SCENE)
		return null
	var scene := packed.instantiate()
	root.add_child(scene)
	await _settle_frames(3)
	var session := scene.find_child("PlayableSession", true, false)
	if session == null:
		failures.append("PlayableSession missing from main scene.")
		return null
	if not session.has_method("debug_codex_gameplay_action"):
		failures.append("PlayableSession is missing debug_codex_gameplay_action.")
	if not session.has_method("debug_codex_gameplay_snapshot"):
		failures.append("PlayableSession is missing debug_codex_gameplay_snapshot.")
	if not session.has_method("debug_live_provider_packet"):
		failures.append("PlayableSession is missing debug_live_provider_packet.")
	return session

func _drive_session(session: Node, action_id: String, payload: Dictionary, failures: Array[String]) -> void:
	if session == null:
		failures.append("Cannot drive missing PlayableSession.")
		return
	var result: Dictionary = session.call("debug_codex_gameplay_action", action_id, payload)
	if not bool(result.get("accepted", false)):
		failures.append("PlayableSession action %s failed: %s" % [action_id, str(result.get("reason", ""))])
	await _settle_frames(2)

func _session_summary(session: Node) -> Dictionary:
	if session == null:
		return {}
	var snapshot: Dictionary = session.call("debug_codex_gameplay_snapshot")
	return snapshot.get("summary", {})

func _route_fingerprint(summary: Dictionary) -> String:
	return JSON.stringify({
		"stage": summary.get("stage", ""),
		"sessionOutcome": summary.get("sessionOutcome", ""),
		"routeOutcome": summary.get("routeOutcome", ""),
		"suspicion": summary.get("suspicion", 0),
		"reportWeight": summary.get("reportWeight", 0),
		"recordObjects": summary.get("recordObjects", {}),
		"civicEconomy": summary.get("civicEconomy", {}),
		"civicLedger": summary.get("civicLedger", []),
		"agentActionLog": summary.get("agentActionLog", [])
	})

func _summarize_route(summary: Dictionary) -> Dictionary:
	return {
		"stage": summary.get("stage", ""),
		"sessionOutcome": summary.get("sessionOutcome", ""),
		"routeOutcome": summary.get("routeOutcome", ""),
		"suspicion": summary.get("suspicion", 0),
		"reportWeight": summary.get("reportWeight", 0),
		"providerState": summary.get("providerState", {}),
		"latestLedgerEvent": _latest_ledger_event(summary),
		"agentActionCount": Array(summary.get("agentActionLog", [])).size()
	}

func _latest_ledger_event(summary: Dictionary) -> Dictionary:
	var ledger: Array = summary.get("civicLedger", [])
	if ledger.is_empty():
		return {}
	var latest = ledger[ledger.size() - 1]
	return latest if latest is Dictionary else {}

func _provider_usage_totals(usages: Array) -> Dictionary:
	var totals := {
		"estimatedCostUsd": 0.0,
		"actualInputTokens": 0,
		"actualOutputTokens": 0,
		"actualTotalTokens": 0
	}
	for usage in usages:
		if not usage is Dictionary:
			continue
		totals["estimatedCostUsd"] = float(totals["estimatedCostUsd"]) + float(usage.get("estimatedCostUsd", 0.0))
		totals["actualInputTokens"] = int(totals["actualInputTokens"]) + int(usage.get("actualInputTokens", 0))
		totals["actualOutputTokens"] = int(totals["actualOutputTokens"]) + int(usage.get("actualOutputTokens", 0))
		totals["actualTotalTokens"] = int(totals["actualTotalTokens"]) + int(usage.get("actualTotalTokens", 0))
	return totals

func _live_actor_ids(decisions: Array[Dictionary]) -> Array[String]:
	var actor_ids: Array[String] = []
	for decision in decisions:
		var npc_id := str(decision.get("npcId", ""))
		if not npc_id.is_empty() and not actor_ids.has(npc_id):
			actor_ids.append(npc_id)
	return actor_ids

func _settle_frames(count: int) -> void:
	for _i in range(max(1, count)):
		await process_frame

func _require(condition: bool, failures: Array[String], message: String) -> void:
	if not condition:
		failures.append(message)

func _evidence_output_path() -> String:
	var override_path := OS.get_environment(OUTPUT_ENV)
	if not override_path.is_empty():
		if override_path.begins_with("res://") or override_path.begins_with("user://"):
			return ProjectSettings.globalize_path(override_path)
		return ProjectSettings.globalize_path(override_path)
	return ProjectSettings.globalize_path(OUTPUT_PATH)
