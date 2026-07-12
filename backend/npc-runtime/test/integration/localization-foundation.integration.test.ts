import assert from "node:assert/strict";
import { test } from "bun:test";
import { assembleObservePacket, DEFAULT_ROLE_POLICIES } from "../../src/agentloop/context.js";
import {
  exactFallbackSuggestedReplyIntent,
  fallbackContent,
  loadFallbackContentBank,
} from "../../src/localization/fallback-content.js";
import {
  SUPPORTED_GAMEPLAY_LOCALES,
  SUPPORTED_LOCALE_REGISTRY,
  gameplayLocaleSchema,
} from "../../src/localization/supported-locales.js";
import {
  conversationJudgmentSchemaForLocale,
} from "../../src/providers/envelope.js";
import { RuleFallbackNpcAdapter } from "../../src/providers/fallback.js";
import type { HearingJudgmentRequest } from "../../src/providers/ports.js";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import { RunError, RunService } from "../../src/runtime/run-service.js";
import {
  JUDGMENT_REPORT_DELTA_CAP,
  JUDGMENT_SUSPICION_DELTA_CAP,
} from "../../src/runtime/conversation-suspicion.js";
import { startRequestSchema as legacyStartRequestSchema } from "../../src/api/session-schemas.js";
import {
  runSessionStartRequestSchema,
  runSnapshotSchema,
  runStartRequestSchema,
} from "../../src/runtime/run-schema.js";

const EXACT_GAMEPLAY_LOCALES = [
  "ko-KR",
  "en-US",
  "it-IT",
  "zh-CN",
  "fr-FR",
  "ja-JP",
] as const;

function observePacket() {
  const packet = assembleObservePacket(createSameOrderWorld(), {
    actor: {
      actorId: "NPC_Store_Clerk",
      role: "store_clerk",
      landmarkId: "Store",
      knownActorIds: ["player", "NPC_Store_Manager"],
      knownLandmarkIds: ["Store", "Station"],
    },
    goals: ["confirm the local routine"],
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: { actorId: "NPC_Store_Clerk", ownActionNotes: [], observedLedgerEventIds: [] },
    heardSpeech: [],
  });
  packet.audibleActorIds = ["player", "NPC_Store_Manager"];
  return packet;
}

test("the shared registry is the exact API locale source for run and conversation schemas", () => {
  assert.deepEqual(SUPPORTED_GAMEPLAY_LOCALES, EXACT_GAMEPLAY_LOCALES);
  assert.deepEqual(
    SUPPORTED_LOCALE_REGISTRY.locales.map(locale => locale.presentationId),
    ["ko", "en", "it", "zh", "fr", "ja"],
  );

  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    assert.equal(gameplayLocaleSchema.parse(locale), locale);
    assert.equal(runStartRequestSchema.parse({ startId: `start-${locale}`, locale }).locale, locale);
    assert.equal(
      runSessionStartRequestSchema.parse({
        runId: "run-locale",
        actorId: "NPC_Studio_Receptionist",
        interactionZoneId: "StudioReceptionConversation",
        locale,
      }).locale,
      locale,
    );
  }
  for (const unsupported of ["ko", "en", "zh-TW", "de-DE", "EN-us"]) {
    assert.equal(gameplayLocaleSchema.safeParse(unsupported).success, false);
  }
  assert.equal(
    legacyStartRequestSchema.safeParse({ storyletId: "same-order", locale: "ko-KR" }).success,
    true,
  );
  assert.equal(
    legacyStartRequestSchema.safeParse({ storyletId: "same-order", locale: "en-US" }).success,
    false,
    "the retained Korean-only regression storylet must not advertise six-locale content",
  );
});

test("a run accepts every supported locale once and keeps it immutable for child conversations", async () => {
  let runCount = 0;
  const service = new RunService({
    proposalPort: new RuleFallbackNpcAdapter(),
    idFactory: prefix => `${prefix}-locale-${++runCount}`,
  });
  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    const snapshot = service.start(`start-${locale}`, locale);
    assert.equal(snapshot.locale, locale);
    assert.equal(runSnapshotSchema.parse(snapshot).locale, locale);
  }

  const english = service.start("immutable-English-run", "en-US");
  await assert.rejects(
    service.preloadConversation(
      english.runId,
      "NPC_Studio_Receptionist",
      "StudioReceptionConversation",
      "fr-FR",
    ),
    (error: unknown) => error instanceof RunError && error.code === "invalid_locale",
  );
  assert.equal(service.snapshot(english.runId).locale, "en-US");
  assert.throws(
    () => service.start("unsupported-run", "zh-TW"),
    (error: unknown) => error instanceof RunError && error.code === "invalid_locale",
  );
});

test("deterministic fallback has exact six-locale parity and selects the run locale", async () => {
  const bank = loadFallbackContentBank();
  assert.deepEqual(Object.keys(bank), EXACT_GAMEPLAY_LOCALES);
  assert.equal(
    new Set(EXACT_GAMEPLAY_LOCALES.map(locale => bank[locale]?.hesitationMarker)).size,
    EXACT_GAMEPLAY_LOCALES.length,
  );
  const fallback = new RuleFallbackNpcAdapter();

  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    const content = fallbackContent(locale);
    assert.deepEqual(
      Object.keys(content.hearing).sort(),
      [
        "abnormalOfficerLine",
        "abnormalVerdictWhy",
        "memoryGroundedTestimony",
        "missingEvidenceTestimony",
        "neverMetTestimony",
        "opening",
        "ordinaryOfficerLine",
        "ordinaryVerdictWhy",
      ],
    );
    assert.equal(
      Object.values(content.hearing).every(line => line.trim().length > 0),
      true,
      `${locale} hearing fallback lines must all be nonempty`,
    );
    assert.deepEqual(
      content.hearing.memoryGroundedTestimony.match(/\{[^{}]+\}/g),
      ["{memory}"],
      `${locale} hearing testimony must keep exact placeholder parity`,
    );
    const hearingResidents = ([
      ["NPC_Studio_Receptionist", "studio_receptionist"],
      ["NPC_Studio_Manager", "studio_manager"],
      ["NPC_Office_Worker", "office_worker"],
      ["NPC_Park_Caretaker", "park_caretaker"],
      ["NPC_Station_Officer", "station_officer"],
      ["NPC_Roaming_Liaison", "roaming_liaison"],
    ] as const).map(([actorId, role], index) => ({
      actorId,
      role,
      stanceBefore: index < 4 ? "vouch" as const : "uncertain" as const,
      hasMeaningfulFirsthandConversation: index < 5,
      memories: index < 5
        ? [{
            memoryId: `memory-${locale}-${index}`,
            kind: "player_conversation" as const,
            sourceActorId: "player",
            text: content.whyLines.none,
            whyLine: content.whyLines.none,
            meaningfulFirsthand: true,
          }]
        : [],
    })) as HearingJudgmentRequest["residents"];
    const hearing = await fallback.judgeHearing({
      runId: `fallback-hearing-${locale}`,
      hearingId: `hearing-${locale}`,
      locale,
      finalDefense: content.whyLines.none,
      institutionalPressure: 0,
      residents: hearingResidents,
      records: [],
      ledgerEvents: [],
    });
    assert.equal(hearing.proposal.proposedVerdict, "ordinary");
    assert.equal(
      hearing.proposal.residentAssessments[0].testimonyLine,
      content.hearing.memoryGroundedTestimony.replace("{memory}", content.whyLines.none),
    );
    assert.equal(
      hearing.proposal.residentAssessments[5].testimonyLine,
      content.hearing.neverMetTestimony,
    );
    assert.equal(hearing.proposal.officerLine, content.hearing.ordinaryOfficerLine);
    const conversation = await fallback.proposeConversationTurn({
      sessionId: `fallback-${locale}`,
      locale,
      beatId: "opening",
      actorId: "NPC_Studio_Receptionist",
      objective: "register the visitor",
      sceneFacts: ["face-to-face at Studio reception"],
      observePacket: observePacket(),
      conversationHistory: [],
    });
    assert.equal(conversation.proposal.utterance, content.conversation.studioReception.opening);
    assert.deepEqual(
      conversation.proposal.suggestedReplies,
      content.conversation.studioReception.suggestedReplies,
    );
    for (const variant of Object.values(content.conversation)) {
      for (const reply of variant.suggestedReplies) {
        assert.equal(exactFallbackSuggestedReplyIntent(locale, reply.text), reply.intent);
      }
    }
    assert.equal(
      exactFallbackSuggestedReplyIntent(locale, `${content.hesitationMarker} extra`),
      undefined,
      "near matches and arbitrary provider text must not inherit fallback intent",
    );

    const judgmentRequest = {
      sessionId: `fallback-${locale}`,
      locale,
      beatId: "opening",
      promptId: "resident_first_question",
      actorId: "NPC_Studio_Receptionist",
      playerLine: content.hesitationMarker,
      conversationHistory: [] as Array<{ speakerId: string; line: string }>,
      observePacket: observePacket(),
      suspicionBefore: 0,
      reportPressureBefore: 0,
    };
    const judgment = await fallback.judgeConversationTurn(judgmentRequest);
    assert.equal(judgment.proposal.whyLine, content.whyLines.none);

    const merged = await fallback.judgeAndProposeConversationTurn({
      ...judgmentRequest,
      objective: "register the visitor",
      sceneFacts: ["face-to-face at Studio reception"],
      stanceBefore: "uncertain",
      hasMeaningfulFirsthandConversation: false,
    });
    assert.equal(
      merged.proposal.meaningfulFirsthand,
      false,
      `${locale} must compare against its own hesitation marker`,
    );
    assert.equal(merged.proposal.whyLine, content.whyLines.none);

    const studioReplies = content.conversation.studioReception.suggestedReplies;
    const safeReply = studioReplies.find(reply => reply.intent === "safe/local");
    const repairReply = studioReplies.find(reply => reply.intent === "uncertain/repair");
    assert.ok(safeReply);
    assert.ok(repairReply);
    const safe = await fallback.judgeAndProposeConversationTurn({
      ...judgmentRequest,
      playerLine: safeReply.text,
      objective: "register the visitor",
      sceneFacts: ["face-to-face at Studio reception"],
    });
    assert.equal(safe.proposal.signals.includes("role_script_break"), false);
    assert.equal(safe.proposal.stance, "vouch");
    const repair = await fallback.judgeAndProposeConversationTurn({
      ...judgmentRequest,
      playerLine: repairReply.text,
      objective: "register the visitor",
      sceneFacts: ["face-to-face at Studio reception"],
    });
    assert.equal(repair.proposal.signals.includes("role_script_break"), false);
    assert.equal(repair.proposal.stance, "uncertain");

    for (const variant of Object.values(content.conversation)) {
      const riskyReply = variant.suggestedReplies.find(reply => reply.intent === "risky/weird");
      assert.ok(riskyReply);
      const risky = await fallback.judgeAndProposeConversationTurn({
        ...judgmentRequest,
        playerLine: riskyReply.text,
        objective: "register the visitor",
        sceneFacts: ["face-to-face at Studio reception"],
      });
      assert.equal(risky.proposal.signals[0], "role_script_break");
      assert.ok(risky.proposal.suspicionDelta > 0);
      assert.ok(risky.proposal.suspicionDelta <= JUDGMENT_SUSPICION_DELTA_CAP);
      assert.ok(risky.proposal.reportDelta > 0);
      assert.ok(risky.proposal.reportDelta <= JUDGMENT_REPORT_DELTA_CAP);
      assert.equal(risky.proposal.whyLine, content.whyLines.role_script_break);
      assert.notEqual(risky.proposal.stance, "vouch");
    }

    const ambient = await fallback.proposeNextStep({
      sessionId: `ambient-${locale}`,
      locale,
      iteration: 0,
      goal: "speak to the visible resident",
      observePacket: observePacket(),
      blockedSignatures: [],
      requiredToolCall: { tool: "talk_to", actorId: "NPC_Store_Manager" },
      requireUtterance: true,
    });
    assert.equal(ambient.proposal.utterance, content.agent.talkUtterance);
    assert.equal(ambient.proposal.rationale, content.agent.talkRationale);
    const listenerPacket = observePacket();
    listenerPacket.visibleActors = ["NPC_Store_Manager"];
    listenerPacket.audibleActorIds = ["NPC_Store_Manager"];
    listenerPacket.heardSpeech = ["NPC_Store_Manager: exact source utterance"];
    const ambientReply = await fallback.judgeAndProposeAmbientReply({
      sessionId: `ambient-reply-${locale}`,
      locale,
      wakeId: `wake-${locale}`,
      conversationId: `ambient:${locale}`,
      sourceSpeakerActorId: "NPC_Store_Manager",
      sourceUtterance: "exact source utterance",
      listenerActorId: listenerPacket.actorId,
      targetActorId: "NPC_Store_Manager",
      stanceBefore: "uncertain",
      suspicionBefore: 0,
      hasMeaningfulFirsthandConversation: false,
      observePacket: listenerPacket,
    });
    assert.equal(ambientReply.proposal.whyLine, content.agent.ambientNoChangeWhy);
    assert.notEqual(ambientReply.proposal.whyLine, content.whyLines.none);
    assert.equal(ambientReply.proposal.suspicionDelta, 0);
    assert.equal(ambientReply.proposal.proposedStance, "uncertain");
  }
});

test("all six RunService conversations show a bounded localized consequence for the fallback risky choice", async () => {
  const service = new RunService({ proposalPort: new RuleFallbackNpcAdapter() });

  for (const locale of EXACT_GAMEPLAY_LOCALES) {
    const content = fallbackContent(locale);
    const run = service.start(`fallback-risky-run-${locale}`, locale);
    await service.preloadConversation(
      run.runId,
      "NPC_Studio_Receptionist",
      "StudioReceptionConversation",
      locale,
    );
    const conversation = await service.startConversation(
      run.runId,
      "NPC_Studio_Receptionist",
      "StudioReceptionConversation",
      locale,
    );
    assert.equal(conversation.nextTurn.prompt, content.conversation.studioReception.opening);
    assert.equal(conversation.nextTurn.proposalMeta.transport, "fallback");
    const riskyChoice = conversation.nextTurn.choices.find(
      choice => choice.intent === "risky/weird",
    );
    assert.ok(riskyChoice);
    assert.equal(
      riskyChoice.line,
      content.conversation.studioReception.suggestedReplies.find(
        reply => reply.intent === "risky/weird",
      )?.text,
    );

    const answered = await service.answer(
      run.runId,
      conversation.sessionId,
      conversation.nextTurn.turnId,
      { type: "choice", choiceId: riskyChoice.choiceId },
    );
    assert.equal(answered.judgment.signals[0], "role_script_break");
    assert.ok(answered.judgment.suspicionDelta > 0);
    assert.ok(answered.judgment.suspicionDelta <= JUDGMENT_SUSPICION_DELTA_CAP);
    assert.ok(answered.judgment.reportDelta > 0);
    assert.ok(answered.judgment.reportDelta <= JUDGMENT_REPORT_DELTA_CAP);
    assert.equal(answered.judgment.whyLine, content.whyLines.role_script_break);
    assert.equal(answered.memoryDelta.whyLine, content.whyLines.role_script_break);
    assert.equal(answered.proposalMeta.transport, "fallback");
    assert.notEqual(answered.actor.stance, "vouch");
    assert.equal(answered.nextTurn?.prompt, content.conversation.studioReception.followUp);
  }
});

test("all envelopes stay structural while the Hangul-specific guard applies only to ko-KR", () => {
  const chineseJudgment = {
    suspicionDelta: 5,
    reportDelta: 0,
    signals: [],
    whyLine: "这个回答仍有需要核实之处。",
  };
  assert.equal(
    conversationJudgmentSchemaForLocale("zh-CN").safeParse(chineseJudgment).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("ko-KR").safeParse(chineseJudgment).success,
    false,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("en-US").safeParse({
      ...chineseJudgment,
      whyLine: "That answer leaves more to be checked.",
    }).success,
    true,
  );
  assert.equal(
    conversationJudgmentSchemaForLocale("fr-FR").safeParse({
      ...chineseJudgment,
      whyLine: "Cette réponse laisse encore des points à vérifier.",
    }).success,
    true,
  );
});
