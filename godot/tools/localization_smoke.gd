extends SceneTree

## Verifies the shared locale registry and every M3R table directly. This does
## not call tr() for parity checks, so Godot's Korean fallback cannot conceal a
## missing key, empty value, or changed format-placeholder contract.

const HUD_THEME_PATH := "res://assets/greybox/town_hud_theme.tres"
const EXPORT_FONT_EXPECTATIONS := {
	"ko": {
		"path": "res://assets/fonts/noto_sans_cjk/NotoSansKR-Regular.otf",
		"region": "KR",
		"fontName": "Noto Sans KR",
		"sample": "한글 가나다",
	},
	"en": {
		"path": "res://assets/fonts/noto_sans_cjk/NotoSansKR-Regular.otf",
		"region": "KR",
		"fontName": "Noto Sans KR",
		"sample": "English façade",
	},
	"it": {
		"path": "res://assets/fonts/noto_sans_cjk/NotoSansKR-Regular.otf",
		"region": "KR",
		"fontName": "Noto Sans KR",
		"sample": "Perché l’identità è già qui.",
	},
	"zh": {
		"path": "res://assets/fonts/noto_sans_cjk/NotoSansSC-Regular.otf",
		"region": "SC",
		"fontName": "Noto Sans SC",
		"sample": "简体中文汉字门",
	},
	"fr": {
		"path": "res://assets/fonts/noto_sans_cjk/NotoSansKR-Regular.otf",
		"region": "KR",
		"fontName": "Noto Sans KR",
		"sample": "Élève, où êtes-vous déjà ?",
	},
	"ja": {
		"path": "res://assets/fonts/noto_sans_cjk/NotoSansJP-Regular.otf",
		"region": "JP",
		"fontName": "Noto Sans JP",
		"sample": "日本語かなカナ",
	},
}
const EXPORT_FONT_FALLBACK_EXPECTATIONS := {
	"KR": [
		"res://assets/fonts/noto_sans_cjk/NotoSansSC-Regular.otf",
		"res://assets/fonts/noto_sans_cjk/NotoSansJP-Regular.otf",
	],
	"SC": [
		"res://assets/fonts/noto_sans_cjk/NotoSansKR-Regular.otf",
		"res://assets/fonts/noto_sans_cjk/NotoSansJP-Regular.otf",
	],
	"JP": [
		"res://assets/fonts/noto_sans_cjk/NotoSansKR-Regular.otf",
		"res://assets/fonts/noto_sans_cjk/NotoSansSC-Regular.otf",
	],
}
const LONG_UI_TEXT := {
	"ko": {
		"prompt": "접수 담당자는 주민마다 당신의 도착을 조금씩 다르게 기억하고 있다며, 서로 어긋나는 설명 속에서도 왜 당신을 평범한 방문자로 판단해야 하는지 차분히 묻습니다.",
		"choices": [
			"모순처럼 보이는 부분을 숨기지 않고 제가 기억하는 순서대로 전부 설명하겠습니다.",
			"먼저 다른 주민들이 직접 들은 내용을 확인한 뒤 제 설명과 나란히 비교해 주세요.",
			"간단한 답은 없지만, 확인할 수 있는 사실과 추정은 분명히 나누겠습니다.",
		],
		"input": "한글 조합이 완료된 긴 직접 입력 문장입니다.",
		"why": "설명은 길고 불확실하지만 직접 들은 사실과 다른 주민에게서 전해진 추정을 구분했습니다.",
	},
	"en": {
		"prompt": "The receptionist calmly reconstructs every account and asks why you should be treated as an ordinary visitor when each resident remembers your arrival a little differently.",
		"choices": [
			"I can explain the full sequence without hiding the parts that appear contradictory.",
			"Ask the other residents what they heard first, then compare their accounts with mine.",
			"There is no simple answer, but I can separate verifiable facts from assumptions.",
		],
		"input": "This is a long typed answer with punctuation and a typographic apostrophe.",
		"why": "The explanation remains long and uncertain, but it separates firsthand facts from attributed claims.",
	},
	"it": {
		"prompt": "La receptionist abbassa la voce e ricostruisce con calma ciò che ha sentito: perché la tua identità dovrebbe risultare credibile, se ogni residente ricorda una versione leggermente diversa del tuo arrivo?",
		"choices": [
			"Posso spiegare la sequenza completa senza nascondere i passaggi che sembrano contraddittori.",
			"Chiediamo prima agli altri residenti che cosa ricordano, poi confronteremo le loro parole con le mie.",
			"Non ho una risposta semplice: l’identità che cercate potrebbe dipendere proprio da queste differenze.",
		],
		"input": "È una risposta digitata con accenti e apostrofi tipografici.",
		"why": "La spiegazione rimane lunga e ambigua, ma collega ciò che la receptionist ha sentito alle parole attribuite agli altri residenti.",
	},
	"zh": {
		"prompt": "接待员平静地梳理每个人的说法，并问道：既然居民们对你如何来到这里的记忆并不一致，为什么仍应把你视为一名普通访客？",
		"choices": [
			"我可以按顺序说明全部经过，不隐瞒那些看起来互相矛盾的部分。",
			"请先询问其他居民亲耳听到了什么，再把他们的说法与我的解释对照。",
			"这件事没有简单答案，但我会把可核实的事实与推测明确分开。",
		],
		"input": "这是一段包含简体中文标点的完整输入。",
		"why": "这段解释虽然较长且仍有不确定之处，但区分了亲历事实与转述内容。",
	},
	"fr": {
		"prompt": "La réceptionniste reprend posément chaque témoignage : pourquoi votre identité devrait-elle être reconnue, alors que plusieurs habitants décrivent votre arrivée d’une manière différente ?",
		"choices": [
			"Je peux expliquer toute la chronologie sans dissimuler les passages qui paraissent contradictoires.",
			"Demandons d’abord aux autres habitants ce qu’ils ont retenu, puis comparons leurs paroles aux miennes.",
			"Je n’ai pas de réponse simple : l’identité que vous cherchez dépend peut-être précisément de ces écarts.",
		],
		"input": "C’est une réponse saisie avec des accents et une apostrophe typographique.",
		"why": "L’explication reste longue et ambiguë, mais relie ce que la réceptionniste a entendu aux paroles attribuées aux autres habitants.",
	},
	"ja": {
		"prompt": "受付係は住民ごとにあなたの到着についての記憶が少しずつ違うと整理し、それでも普通の訪問者として扱うべき理由を落ち着いて尋ねます。",
		"choices": [
			"矛盾して見える部分を隠さず、覚えている順番どおりにすべて説明します。",
			"まず他の住民が直接聞いた内容を確認し、それから私の説明と比べてください。",
			"簡単な答えはありませんが、確認できる事実と推測は明確に分けます。",
		],
		"input": "これは日本語入力で確定した長い文章です。",
		"why": "説明は長く不確かですが、直接確認した事実と伝聞による主張を区別しています。",
	},
}

var _failures: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	await process_frame
	var localization := root.get_node_or_null("Localization")
	if localization == null:
		_failures.append("Localization autoload is missing")
		_finish()
		return
	for method_name in [
		"supported_locales",
		"default_locale",
		"presentation_locale",
		"api_locale",
		"set_locale",
		"locale",
		"content_keys",
		"content_message",
		"export_font_path",
		"export_font_region",
		"export_font",
		"apply_export_font",
		"font_selection_snapshot",
	]:
		if not localization.has_method(method_name):
			_failures.append("Localization does not expose %s()" % method_name)
	if not _failures.is_empty():
		_finish()
		return

	var locales_value: Variant = localization.call("supported_locales")
	if not locales_value is Array or (locales_value as Array).is_empty():
		_failures.append("supported locale registry is empty or invalid")
		_finish()
		return
	var locales := locales_value as Array
	var default_locale := str(localization.call("default_locale"))
	var presentation_ids: Dictionary = {}
	var api_locales: Dictionary = {}
	var registry_order: Array[String] = []
	var registry_has_default := false
	for entry_value in locales:
		if not entry_value is Dictionary:
			_failures.append("supported locale entry is not a Dictionary")
			continue
		var entry := entry_value as Dictionary
		var presentation_id := str(entry.get("presentationId", ""))
		var api_locale_name := str(entry.get("apiLocale", ""))
		var label_key := str(entry.get("labelKey", ""))
		if presentation_id.is_empty() or api_locale_name.is_empty() or label_key.is_empty():
			_failures.append("supported locale entry has an empty required field")
			continue
		if presentation_ids.has(presentation_id):
			_failures.append("duplicate presentation locale: %s" % presentation_id)
		if api_locales.has(api_locale_name):
			_failures.append("duplicate API locale: %s" % api_locale_name)
		presentation_ids[presentation_id] = true
		api_locales[api_locale_name] = true
		registry_order.append(presentation_id)
		registry_has_default = registry_has_default or presentation_id == default_locale
		if str(localization.call("presentation_locale", api_locale_name)) != presentation_id:
			_failures.append("API locale does not round-trip: %s" % api_locale_name)
		if (
			str(localization.call("presentation_locale", api_locale_name.replace("-", "_")))
			!= presentation_id
		):
			_failures.append("underscore API locale does not round-trip: %s" % api_locale_name)
		if str(localization.call("api_locale", presentation_id)) != api_locale_name:
			_failures.append("presentation locale loses exact API tag: %s" % presentation_id)
	if not registry_has_default:
		_failures.append("default locale is absent from the supported registry: %s" % default_locale)

	var reference_keys := _string_array(localization.call("content_keys", default_locale))
	if reference_keys.is_empty():
		_failures.append("default M3R locale table has no keys: %s" % default_locale)
		_finish()
		return
	for entry_value in locales:
		if not entry_value is Dictionary:
			continue
		var entry := entry_value as Dictionary
		var presentation_id := str(entry.get("presentationId", ""))
		var api_locale_name := str(entry.get("apiLocale", ""))
		var label_key := str(entry.get("labelKey", ""))
		var locale_keys := _string_array(localization.call("content_keys", presentation_id))
		var missing := _difference(reference_keys, locale_keys)
		var extra := _difference(locale_keys, reference_keys)
		if not missing.is_empty():
			_failures.append("%s is missing M3R keys: %s" % [presentation_id, missing])
		if not extra.is_empty():
			_failures.append("%s has extra M3R keys: %s" % [presentation_id, extra])
		if label_key not in locale_keys:
			_failures.append("%s locale label key is absent: %s" % [presentation_id, label_key])
		for key in reference_keys:
			var reference_text := str(
				localization.call("content_message", default_locale, key)
			)
			var localized_text := str(
				localization.call("content_message", presentation_id, key)
			)
			if localized_text.strip_edges().is_empty():
				_failures.append("%s M3R key is empty: %s" % [presentation_id, key])
				continue
			var expected_placeholders := _placeholders(reference_text)
			var actual_placeholders := _placeholders(localized_text)
			if actual_placeholders != expected_placeholders:
				_failures.append(
					"%s placeholder mismatch for %s: expected %s, got %s"
					% [presentation_id, key, expected_placeholders, actual_placeholders]
				)
		if not bool(localization.call("set_locale", api_locale_name)):
			_failures.append("cannot switch with full API locale: %s" % api_locale_name)
		elif str(localization.call("locale")) != presentation_id:
			_failures.append("active presentation locale is not %s" % presentation_id)
		_check_export_font(localization, presentation_id, locale_keys)

	localization.call("set_locale", default_locale)
	await _check_hud_registry(localization, locales, registry_order, default_locale)
	if _failures.is_empty():
		print(
			"PASS localization_smoke: %d locales share %d exact M3R keys/placeholders; bundled KR/SC/JP glyph routes, source-excerpt logs, and long six-locale 1280x720 HUD at 100/150%% are valid"
			% [locales.size(), reference_keys.size()]
		)
	_finish()


func _string_array(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not value is Array:
		return result
	for item in value as Array:
		result.append(str(item))
	result.sort()
	return result


func _difference(left: Array[String], right: Array[String]) -> Array[String]:
	var right_set: Dictionary = {}
	for value in right:
		right_set[value] = true
	var result: Array[String] = []
	for value in left:
		if not right_set.has(value):
			result.append(value)
	return result


func _placeholders(text: String) -> Array[String]:
	var result: Array[String] = []
	var cursor := 0
	while cursor < text.length():
		var opening := text.find("{", cursor)
		if opening < 0:
			break
		var closing := text.find("}", opening + 1)
		if closing < 0:
			result.append(text.substr(opening))
			break
		result.append(text.substr(opening, closing - opening + 1))
		cursor = closing + 1
	result.sort()
	return result


func _check_export_font(
	localization: Node,
	presentation_id: String,
	locale_keys: Array[String]
) -> void:
	var expectation_value: Variant = EXPORT_FONT_EXPECTATIONS.get(presentation_id)
	if not expectation_value is Dictionary:
		_failures.append("no export-font smoke expectation for %s" % presentation_id)
		return
	var expectation := expectation_value as Dictionary
	var expected_path := str(expectation.get("path", ""))
	var expected_region := str(expectation.get("region", ""))
	var expected_name := str(expectation.get("fontName", ""))
	if str(localization.call("export_font_path", presentation_id)) != expected_path:
		_failures.append("%s export-font path does not select %s" % [presentation_id, expected_path])
	if str(localization.call("export_font_region", presentation_id)) != expected_region:
		_failures.append("%s export-font region is not %s" % [presentation_id, expected_region])
	var font_value: Variant = localization.call("export_font", presentation_id)
	if not font_value is Font:
		_failures.append("%s export font is not a loaded Font" % presentation_id)
		return
	var font := font_value as Font
	if not font is FontVariation:
		_failures.append("%s export font is not a locale-aware FontVariation" % presentation_id)
	elif _primary_font_path(font) != expected_path:
		_failures.append(
			"%s loaded export-font primary path is %s"
			% [presentation_id, _primary_font_path(font)]
		)
	if font.get_face_count() != 1:
		_failures.append("%s export font is not a discrete single-face file" % presentation_id)
	if font.get_font_name() != expected_name:
		_failures.append(
			"%s export font family is %s, expected %s"
			% [presentation_id, font.get_font_name(), expected_name]
		)
	_check_font_glyphs(
		font,
		str(expectation.get("sample", "")),
		"%s representative sample" % presentation_id
	)
	for key in locale_keys:
		_check_font_glyphs(
			font,
			str(localization.call("content_message", presentation_id, key)),
			"%s content key %s" % [presentation_id, key]
		)
	var expected_fallbacks := _ordered_string_array(
		EXPORT_FONT_FALLBACK_EXPECTATIONS.get(expected_region, [])
	)
	if _ordered_string_array(_font_paths(font.fallbacks)) != expected_fallbacks:
		_failures.append("%s export font has the wrong bundled fallback order" % presentation_id)
	if ThemeDB.fallback_font == null or _primary_font_path(ThemeDB.fallback_font) != expected_path:
		_failures.append("%s does not select its font through ThemeDB" % presentation_id)
	var hud_theme := load(HUD_THEME_PATH) as Theme
	if (
		hud_theme == null
		or hud_theme.default_font == null
		or _primary_font_path(hud_theme.default_font) != expected_path
	):
		_failures.append("%s does not select its font on the shared HUD theme" % presentation_id)
	var snapshot_value: Variant = localization.call("font_selection_snapshot")
	if not snapshot_value is Dictionary:
		_failures.append("%s export-font selection snapshot is invalid" % presentation_id)
		return
	var snapshot := snapshot_value as Dictionary
	if (
		str(snapshot.get("locale", "")) != presentation_id
		or str(snapshot.get("region", "")) != expected_region
		or str(snapshot.get("path", "")) != expected_path
		or not bool(snapshot.get("loaded", false))
		or int(snapshot.get("faceCount", 0)) != 1
		or _ordered_string_array(snapshot.get("fallbackPaths", [])) != expected_fallbacks
	):
		_failures.append("%s export-font selection snapshot is inconsistent" % presentation_id)


func _check_font_glyphs(font: Font, text: String, label: String) -> void:
	var missing: Dictionary = {}
	for index in text.length():
		var codepoint := text.unicode_at(index)
		if codepoint <= 0x20 or codepoint == 0x7F:
			continue
		if not font.has_char(codepoint):
			missing["U+%04X" % codepoint] = true
	if not missing.is_empty():
		var codepoints := missing.keys()
		codepoints.sort()
		_failures.append("missing glyphs in %s: %s" % [label, codepoints])


func _primary_font_path(font: Font) -> String:
	if font is FontVariation:
		var base_font := (font as FontVariation).base_font
		return base_font.resource_path if base_font != null else ""
	return font.resource_path if font != null else ""


func _font_paths(fonts: Array[Font]) -> Array[String]:
	var result: Array[String] = []
	for font in fonts:
		result.append(font.resource_path)
	return result


func _check_hud_registry(
	localization: Node,
	locales: Array,
	registry_order: Array[String],
	default_locale: String
) -> void:
	# The project window is resizable. Protect the smallest supported desktop
	# layout directly instead of allowing a 1080p-only smoke to hide clipping.
	root.size = Vector2i(1280, 720)
	var hud_scene := load("res://scenes/ui/hud_3d.tscn") as PackedScene
	if hud_scene == null:
		_failures.append("HUD3D scene could not load for locale registry smoke")
		return
	var hud := hud_scene.instantiate()
	root.add_child(hud)
	var onboarding_scene := load("res://scenes/ui/onboarding_overlay.tscn") as PackedScene
	var onboarding: Node = null
	if onboarding_scene == null:
		_failures.append("Onboarding scene could not load for export-font smoke")
	else:
		onboarding = onboarding_scene.instantiate()
		root.add_child(onboarding)
	var dynamic_world_label := Label.new()
	dynamic_world_label.name = "DynamicWorldLabelFontProbe"
	root.add_child(dynamic_world_label)
	await process_frame
	await process_frame
	if onboarding != null:
		await _check_onboarding_dialogue_hint(hud, onboarding)
	var snapshot: Dictionary = hud.call("presentation_snapshot")
	if _ordered_string_array(snapshot.get("languageOptions", [])) != registry_order:
		_failures.append("HUD language options do not come from the registry")
	if str(snapshot.get("locale", "")) != default_locale:
		_failures.append("HUD active locale does not match the registry default")
	if str(snapshot.get("selectedLocale", "")) != default_locale:
		_failures.append("HUD default language selection does not match the registry")
	if not locales.is_empty() and locales[-1] is Dictionary:
		var last_api_locale := str((locales[-1] as Dictionary).get("apiLocale", ""))
		hud.call("configure_preferences", 1.0, 0.8, 0.8, last_api_locale)
		snapshot = hud.call("presentation_snapshot")
		if str(snapshot.get("selectedLocale", "")) != str(
			localization.call("presentation_locale", last_api_locale)
		):
			_failures.append("HUD cannot select a language from its full API locale")
	hud.call("set_language_applies_next_run", true)
	snapshot = hud.call("presentation_snapshot")
	if not bool(snapshot.get("languageAppliesNextRun", false)):
		_failures.append("HUD does not expose the immutable-run language state")
	var language_label := hud.find_child("LanguageLabel", true, false) as Label
	if (
		language_label == null
		or language_label.text.strip_edges().is_empty()
		or language_label.text == "hud.settings.language_next_run"
	):
		_failures.append("HUD next-run language label is not localized")

	# HUD3D creates a private theme copy for UI scaling. Initialize that seam
	# before locale changes, then prove the actual Overlay follows every
	# regional face rather than retaining its initial KR font.
	hud.call("set_ui_scale", 1.5)
	var provenance_revision := 10
	for entry_value in locales:
		if not entry_value is Dictionary:
			continue
		var presentation_id := str((entry_value as Dictionary).get("presentationId", ""))
		if not bool(localization.call("set_locale", presentation_id)):
			_failures.append("HUD font route cannot select locale %s" % presentation_id)
			continue
		await process_frame
		hud.call("refresh_localized_text")
		hud.call("set_ui_scale", 1.5)
		await process_frame
		_check_control_font_routes(
			localization,
			hud,
			onboarding,
			dynamic_world_label,
			presentation_id
		)
		provenance_revision += 1
		await _check_provenance_log(
			localization,
			hud,
			presentation_id,
			provenance_revision
		)

	var revision := 100
	for presentation_id in ["ko", "en", "it", "zh", "fr", "ja"]:
		for scale in [1.0, 1.5]:
			revision += 1
			await _check_long_locale_hud(
				localization,
				hud,
				presentation_id,
				scale,
				revision
			)

	localization.call("set_locale", default_locale)
	await process_frame
	hud.call("refresh_localized_text")
	hud.call("set_ui_scale", 1.0)
	hud.queue_free()
	if onboarding != null:
		onboarding.queue_free()
	dynamic_world_label.queue_free()
	await process_frame


func _check_onboarding_dialogue_hint(hud: Node, onboarding: Node) -> void:
	# Make the timing probe deterministic: a provider wait longer than the hint
	# duration must not consume the one-time dialogue lesson before controls exist.
	onboarding.set_process(false)
	hud.call("begin_conversation", {"actorId": "NPC_Studio_Receptionist"})
	onboarding.call("_poll_hud_surface")
	onboarding.call("_process", 9.0)
	var waiting_snapshot_value: Variant = onboarding.call("presentation_snapshot")
	var waiting_snapshot := (
		waiting_snapshot_value as Dictionary
		if waiting_snapshot_value is Dictionary
		else {}
	)
	if bool(waiting_snapshot.get("dialogueHintShown", false)):
		_failures.append("dialogue onboarding hint was consumed during provider wait")
	if bool(waiting_snapshot.get("conversationTurnActionable", true)):
		_failures.append("busy conversation was exposed as an actionable turn")

	var shown := bool(hud.call("show_turn", {
		"prompt": "Onboarding timing probe",
		"choices": [
			{"choiceId": "probe_1", "line": "One"},
			{"choiceId": "probe_2", "line": "Two"},
			{"choiceId": "probe_3", "line": "Three"},
		],
		"acceptsFreeInput": true,
	}))
	if not shown:
		_failures.append("dialogue onboarding timing probe could not show a turn")
	onboarding.call("_poll_hud_surface")
	onboarding.call("_process", 0.01)
	var ready_snapshot_value: Variant = onboarding.call("presentation_snapshot")
	var ready_snapshot := (
		ready_snapshot_value as Dictionary
		if ready_snapshot_value is Dictionary
		else {}
	)
	if not bool(ready_snapshot.get("dialogueHintShown", false)):
		_failures.append("dialogue onboarding hint was not acknowledged by actionable controls")
	if not bool(ready_snapshot.get("conversationTurnActionable", false)):
		_failures.append("dialogue onboarding did not expose an actionable turn")
	if bool(ready_snapshot.get("visible", false)):
		_failures.append("detached dialogue onboarding card overlaps actionable controls")
	var choice_buttons: Array[Node] = [
		hud.get_node_or_null("Overlay/ConversationShade/ConversationPanel/ConversationMargin/ConversationColumns/ConversationChoices/ConversationChoice1"),
		hud.get_node_or_null("Overlay/ConversationShade/ConversationPanel/ConversationMargin/ConversationColumns/ConversationChoices/ConversationChoice2"),
		hud.get_node_or_null("Overlay/ConversationShade/ConversationPanel/ConversationMargin/ConversationColumns/ConversationChoices/ConversationChoice3"),
	]
	for index in choice_buttons.size():
		var choice_button := choice_buttons[index] as Button
		if choice_button == null or not choice_button.text.begins_with("%d — " % (index + 1)):
			_failures.append("dialogue choice %d does not expose its inline shortcut" % (index + 1))
	hud.call("close_conversation")
	onboarding.call("_poll_hud_surface")


func _check_provenance_log(
	localization: Node,
	hud: Node,
	presentation_id: String,
	revision: int
) -> void:
	var speech_source := str(localization.call(
		"content_message",
		presentation_id,
		"hud.m3r.onboarding.talk"
	))
	var record_source := str(localization.call(
		"content_message",
		presentation_id,
		"hud.m3r.onboarding.dialogue"
	))
	var hidden_speech_id := "localization-hidden-speech-id-%s" % presentation_id
	var hidden_record_id := "localization-hidden-record-id-%s" % presentation_id
	hud.call("set_social_view", {
		"revision": revision,
		"hearing": {"due": false, "atSeconds": 900.0},
		"pressure": {"band": "low", "latestEncounteredWhyLine": null},
		"encounteredResidents": [{
			"actorId": "NPC_Studio_Receptionist",
			"stance": "uncertain",
			"stanceRevision": revision,
			"whyLine": speech_source,
			"provenance": {
				"originKind": "speech",
				"originActorId": "player",
				"recipientActorId": "NPC_Studio_Receptionist",
				"sourceMemoryId": hidden_speech_id,
				"sourceExcerpt": speech_source,
				"whyLine": speech_source,
			},
		}],
		"openQuestions": [],
		"encounteredRecords": [{
			"recordId": hidden_record_id,
			"kind": "note",
			"authorActorId": "NPC_Studio_Receptionist",
			"targetId": "player",
			"stateBody": record_source,
			"recordRevision": 1,
			"lastLedgerEventId": "localization-hidden-ledger-id-%s" % presentation_id,
			"provenance": {
				"originKind": "record",
				"originActorId": "NPC_Studio_Receptionist",
				"recipientActorId": "player",
				"sourceMemoryId": hidden_record_id,
				"sourceExcerpt": record_source,
				"whyLine": record_source,
			},
		}],
	})
	hud.call("open_log")
	await process_frame
	var log_text := str((hud.call("presentation_snapshot").get("log", {}) as Dictionary).get(
		"body",
		""
	))
	if speech_source.is_empty() or not log_text.contains(speech_source):
		_failures.append("%s log omitted its localized speech excerpt" % presentation_id)
	elif log_text.count(speech_source) != 2:
		# The stance summary owns one copy; its provenance must not repeat an
		# identical why-line as though it were a second source.
		_failures.append("%s log repeated identical speech provenance" % presentation_id)
	if record_source.is_empty() or not log_text.contains(record_source):
		_failures.append("%s log omitted its localized record excerpt" % presentation_id)
	elif log_text.count(record_source) != 2:
		# The record body owns one copy; its provenance must not echo the same
		# why-line a third time.
		_failures.append("%s log repeated identical record provenance" % presentation_id)
	if log_text.contains(hidden_speech_id) or log_text.contains(hidden_record_id):
		_failures.append("%s log leaked a raw provenance id" % presentation_id)
	hud.call("close_log")
	await process_frame


func _check_control_font_routes(
	localization: Node,
	hud: Node,
	onboarding: Node,
	dynamic_world_label: Label,
	presentation_id: String
) -> void:
	var expectation_value: Variant = EXPORT_FONT_EXPECTATIONS.get(presentation_id)
	if not expectation_value is Dictionary:
		return
	var expected_path := str((expectation_value as Dictionary).get("path", ""))
	var overlay := hud.get_node_or_null("Overlay") as Control
	if overlay == null or overlay.theme == null:
		_failures.append("HUD Overlay has no runtime theme for %s" % presentation_id)
	else:
		_check_font_path(
			overlay.theme.default_font,
			expected_path,
			"HUD Overlay runtime theme for %s" % presentation_id
		)
	for control_name in ["StartHint", "ConversationChoice1", "ConversationFreeInput"]:
		var control := hud.find_child(control_name, true, false) as Control
		if control == null:
			_failures.append("HUD font probe control is missing: %s" % control_name)
			continue
		_check_font_path(
			control.get_theme_font(&"font"),
			expected_path,
			"HUD %s resolved font for %s" % [control_name, presentation_id]
		)
	var log_body := hud.find_child("LogBody", true, false) as RichTextLabel
	if log_body == null:
		_failures.append("HUD LogBody is missing for font route smoke")
	else:
		_check_font_path(
			log_body.get_theme_font(&"normal_font"),
			expected_path,
			"HUD LogBody resolved font for %s" % presentation_id
		)

	if onboarding != null:
		var onboarding_overlay := onboarding.get_node_or_null("Overlay") as Control
		if onboarding_overlay == null or onboarding_overlay.theme == null:
			_failures.append("Onboarding Overlay has no shared theme for %s" % presentation_id)
		else:
			_check_font_path(
				onboarding_overlay.theme.default_font,
				expected_path,
				"Onboarding shared theme for %s" % presentation_id
			)
		var hint_label := onboarding.find_child("HintLabel", true, false) as Label
		if hint_label == null:
			_failures.append("Onboarding HintLabel is missing for font route smoke")
		else:
			_check_font_path(
				hint_label.get_theme_font(&"font"),
				expected_path,
				"Onboarding resolved font for %s" % presentation_id
			)

	dynamic_world_label.text = str((expectation_value as Dictionary).get("sample", ""))
	if not bool(localization.call("apply_export_font", dynamic_world_label, &"font")):
		_failures.append("dynamic world Label could not apply the active export font")
	_check_font_path(
		dynamic_world_label.get_theme_font(&"font"),
		expected_path,
		"dynamic unthemed world Label for %s" % presentation_id
	)


func _check_font_path(font: Font, expected_path: String, label: String) -> void:
	if font == null:
		_failures.append("%s has no resolved Font" % label)
	elif _primary_font_path(font) != expected_path:
		_failures.append(
			"%s resolved %s instead of %s"
			% [label, _primary_font_path(font), expected_path]
		)


func _check_long_locale_hud(
	localization: Node,
	hud: Node,
	presentation_id: String,
	scale: float,
	revision: int
) -> void:
	var text_value: Variant = LONG_UI_TEXT.get(presentation_id)
	if not text_value is Dictionary:
		_failures.append("no long-form UI sample for %s" % presentation_id)
		return
	var text := text_value as Dictionary
	if not bool(localization.call("set_locale", presentation_id)):
		_failures.append("cannot select %s for long-form HUD smoke" % presentation_id)
		return
	await process_frame
	hud.call("refresh_localized_text")
	hud.call("set_ui_scale", scale)
	var why_line := str(text.get("why", ""))
	var source_choices_value: Variant = text.get("choices", [])
	var source_choices: Array = (
		source_choices_value as Array if source_choices_value is Array else []
	)
	var source_excerpt := str(source_choices[0]) if not source_choices.is_empty() else ""
	hud.call("set_social_view", {
		"revision": revision,
		"hearing": {"due": false, "atSeconds": 720.0},
		"pressure": {
			"band": "raised",
			"latestEncounteredWhyLine": why_line,
		},
		"encounteredResidents": [{
			"actorId": "NPC_Studio_Receptionist",
			"stance": "uncertain",
			"whyLine": why_line,
			"provenance": {
				"originKind": "speech",
				"originActorId": "NPC_Studio_Receptionist",
				"recipientActorId": "player",
				"sourceMemoryId": "localization-hidden-memory-id",
				"sourceExcerpt": source_excerpt,
				"whyLine": why_line,
			},
		}],
		"openQuestions": [{
			"status": "open",
			"text": str(text.get("prompt", "")),
			"whyLine": why_line,
		}],
		"encounteredRecords": [{
			"authorActorId": "NPC_Studio_Receptionist",
			"stateBody": str(text.get("prompt", "")),
		}],
	})
	hud.call("open_log")
	await process_frame
	await process_frame
	var log_body := hud.find_child("LogBody", true, false) as RichTextLabel
	var log_text := log_body.text if log_body != null else ""
	if source_excerpt.is_empty() or not log_text.contains(source_excerpt):
		_failures.append("%s log omitted the localized source excerpt" % presentation_id)
	if log_text.contains("localization-hidden-memory-id"):
		_failures.append("%s log leaked a raw source memory id" % presentation_id)
	_check_visible_and_in_viewport(
		hud.find_child("LogPanel", true, false) as Control,
		"%s log panel at %d%%" % [presentation_id, roundi(scale * 100.0)]
	)
	_check_visible_and_in_viewport(
		hud.find_child("CloseLogButton", true, false) as Control,
		"%s log close control at %d%%" % [presentation_id, roundi(scale * 100.0)]
	)
	_check_no_visible_raw_keys(
		hud,
		"%s log at %d%%" % [presentation_id, roundi(scale * 100.0)]
	)
	hud.call("close_log")

	hud.call("begin_conversation", {"actorId": "NPC_Studio_Receptionist"})
	var choices_value: Variant = text.get("choices", [])
	var choices: Array = choices_value as Array if choices_value is Array else []
	if choices.size() != 3:
		_failures.append("%s long-form conversation does not have three choices" % presentation_id)
		hud.call("close_conversation")
		return
	var turn_choices: Array[Dictionary] = []
	for index in choices.size():
		turn_choices.append({
			"choiceId": "long_%s_%d" % [presentation_id, index + 1],
			"line": str(choices[index]),
		})
	var shown := bool(hud.call("show_turn", {
		"prompt": str(text.get("prompt", "")),
		"choices": turn_choices,
		"acceptsFreeInput": true,
	}))
	if not shown:
		_failures.append("%s long-form conversation was rejected" % presentation_id)
	var input := hud.find_child("ConversationFreeInput", true, false) as LineEdit
	if input != null:
		input.text = str(text.get("input", ""))
	await process_frame
	await process_frame
	var panel := hud.find_child("ConversationPanel", true, false) as Control
	_check_visible_and_in_viewport(
		panel,
		"%s conversation panel at %d%%" % [presentation_id, roundi(scale * 100.0)]
	)
	for control_name in [
		"ConversationChoice1",
		"ConversationChoice2",
		"ConversationChoice3",
		"ConversationInputRow",
		"ConversationFreeInput",
		"ConversationSubmitButton",
		"ConversationStatusLabel",
	]:
		var control := hud.find_child(control_name, true, false) as Control
		_check_visible_and_in_viewport(
			control,
			"%s %s at %d%%" % [presentation_id, control_name, roundi(scale * 100.0)]
		)
		if panel != null and control != null and not panel.get_global_rect().grow(1.0).encloses(
			control.get_global_rect()
		):
			_failures.append(
				"%s %s escapes the conversation panel at %d%%"
				% [presentation_id, control_name, roundi(scale * 100.0)]
			)
	if input == null or input.text != str(text.get("input", "")):
		_failures.append("%s Unicode LineEdit round-trip failed at %d%%" % [presentation_id, roundi(scale * 100.0)])
	if input != null:
		input.text = "한".repeat(input.max_length + 8)
		await process_frame
		var status := hud.find_child("ConversationStatusLabel", true, false) as Label
		var expected_limit_warning := str(localization.call(
			"content_message",
			presentation_id,
			"hud.m3r.conversation.input_limit_reached"
		)).format({"limit": input.max_length})
		if input.text.length() != input.max_length:
			_failures.append(
				"%s conversation input did not retain the explicit %d-character boundary"
				% [presentation_id, input.max_length]
			)
		if (
			status == null
			or not status.visible
			or status.text != expected_limit_warning
		):
			_failures.append(
				"%s conversation input truncated overflow without localized feedback"
				% presentation_id
			)
	_check_no_visible_raw_keys(
		hud,
		"%s conversation at %d%%" % [presentation_id, roundi(scale * 100.0)]
	)
	hud.call("close_conversation")
	await process_frame
	hud.call("show_provider_failure", {
		"profileId": "localization-smoke-profile",
		"reason": "timeout",
		"purpose": "conversation_turn",
		"operationKey": "localization-smoke:%s:%s" % [presentation_id, scale],
	}, true, true)
	await process_frame
	await process_frame
	for control_name in [
		"ProviderFailurePanel",
		"ProviderFailureTitle",
		"ProviderFailureBody",
		"ProviderFailureReason",
		"ProviderFailureRetryButton",
		"ProviderFailureRestartButton",
	]:
		_check_visible_and_in_viewport(
			hud.find_child(control_name, true, false) as Control,
			"%s %s at %d%%" % [
				presentation_id,
				control_name,
				roundi(scale * 100.0),
			]
		)
	hud.call("show_provider_failure_restart_error")
	await process_frame
	_check_visible_and_in_viewport(
		hud.find_child("ProviderFailureStatus", true, false) as Control,
		"%s provider restart error at %d%%" % [
			presentation_id,
			roundi(scale * 100.0),
		]
	)
	_check_no_visible_raw_keys(
		hud,
		"%s provider failure at %d%%" % [presentation_id, roundi(scale * 100.0)]
	)
	hud.call("clear_provider_failure")
	await process_frame


func _check_visible_and_in_viewport(control: Control, label: String) -> void:
	if control == null:
		_failures.append("%s is missing" % label)
		return
	if not control.is_visible_in_tree():
		_failures.append("%s is not visible" % label)
		return
	var rect := control.get_global_rect()
	var viewport_rect := control.get_viewport_rect()
	if rect.size.x <= 0.0 or rect.size.y <= 0.0:
		_failures.append("%s has no layout size" % label)
	elif not viewport_rect.grow(1.0).encloses(rect):
		_failures.append("%s escapes the viewport: %s outside %s" % [label, rect, viewport_rect])


func _check_no_visible_raw_keys(node: Node, label: String) -> void:
	var raw_entries: Array[String] = []
	_collect_visible_raw_keys(node, raw_entries)
	if not raw_entries.is_empty():
		_failures.append("raw localization keys visible in %s: %s" % [label, raw_entries])


func _collect_visible_raw_keys(node: Node, result: Array[String]) -> void:
	if node is Control and not (node as Control).is_visible_in_tree():
		return
	var texts: Array[String] = []
	if node is RichTextLabel:
		texts.append((node as RichTextLabel).text)
	elif node is Label:
		texts.append((node as Label).text)
	elif node is LineEdit:
		texts.append((node as LineEdit).text)
		texts.append((node as LineEdit).placeholder_text)
	elif node is Button:
		texts.append((node as Button).text)
	for value in texts:
		for prefix in ["hud.", "npc.", "world.", "choice.", "why.", "action.", "state.", "route."]:
			if value.find(prefix) >= 0:
				result.append("%s=%s" % [node.name, value.left(96)])
				break
	for child in node.get_children():
		_collect_visible_raw_keys(child, result)


func _ordered_string_array(value: Variant) -> Array[String]:
	var result: Array[String] = []
	if not value is Array:
		return result
	for item in value as Array:
		result.append(str(item))
	return result


func _finish() -> void:
	if _failures.is_empty():
		quit(0)
		return
	for failure in _failures:
		print("FAIL localization_smoke: %s" % failure)
	quit(1)
