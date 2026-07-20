import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "bun:test";
import {
  assembleObservePacket,
  DEFAULT_ROLE_POLICIES,
} from "../../src/agentloop/context.js";
import { createStudioReceptionScriptedAdapter } from "../../src/providers/testing/studio-reception-script.js";
import type {
  ConversationTurnRequest,
  MergedConversationTurnRequest,
} from "../../src/providers/ports.js";
import { loadRunCast, parseRunCast } from "../../src/runtime/run-cast.js";
import { loadRunLayout } from "../../src/runtime/run-layout.js";
import { RunService, STUDIO_RECEPTIONIST_ID } from "../../src/runtime/run-service.js";
import { createSameOrderWorld } from "../../src/runtime/world/index.js";
import { groundOrdinaryConversation } from "./run-spatial-test-helpers.js";

const castPath = new URL("../../data/cast/m3r-first-person-town.json", import.meta.url);

// These owner-only concepts must not be paraphrased into another resident's
// authored starting context. Runtime speech may spread them later; cast load
// may not grant them before that speech exists.
const OWNER_PRIVATE_MARKERS: Record<string, RegExp[]> = {
  NPC_Studio_Receptionist: [/배정되지 않은 빈 칸/u, /자신의 누락/u, /무예약 방문/u],
  NPC_Studio_Manager: [/출처가 충분하지 않은 예외/u, /예외를 한 번 승인/u],
  NPC_Office_Worker: [/확인 두 건/u, /시간 또는 담당자/u, /어느 쪽이 최신/u],
  NPC_Park_Caretaker: [/개장 전 스테이션 쪽 길/u, /현재 방문자인지는 식별/u],
  NPC_Station_Officer: [/현재 접수의 출발점/u, /자신의 목격이 아니라/u],
  NPC_Roaming_Liaison: [/지나치게 줄여 의미를 바꾸/u, /같은 내용을 다시 말하기 전/u],
};

function rawCast(): any {
  return JSON.parse(readFileSync(castPath, "utf-8"));
}

function deterministicIds() {
  const counts = { run: 0, sess: 0, mem: 0 };
  return (prefix: keyof typeof counts) => `${prefix}-cast-${++counts[prefix]}`;
}

test("backend cast joins exactly to the six layout actors and rejects unsafe relationships", () => {
  const layout = loadRunLayout();
  const cast = loadRunCast(layout);
  assert.equal(cast.worldId, layout.worldId);
  assert.deepEqual(Object.keys(cast.actors).sort(), layout.actors.map(actor => actor.actorId).sort());
  assert.equal(cast.actors.NPC_Studio_Receptionist?.publicIdentity, "미라 — 스튜디오 접수 담당자");
  assert.deepEqual(cast.player.briefKeys, {
    identityKey: "hud.m3r.player_brief.identity",
    arrivalKey: "hud.m3r.player_brief.arrival",
    uncertaintyKey: "hud.m3r.player_brief.uncertainty",
  });
  assert.deepEqual(cast.player.residentKnownFacts, []);
  for (const holderActorId of Object.keys(cast.actors)) {
    for (const [recipientActorId, recipient] of Object.entries(cast.actors)) {
      if (recipientActorId === holderActorId) continue;
      const recipientContext = JSON.stringify(recipient);
      for (const privateMarker of OWNER_PRIVATE_MARKERS[holderActorId] ?? []) {
        assert.ok(
          !privateMarker.test(recipientContext),
          `${recipientActorId} must not receive ${holderActorId}'s owner-only concept ${privateMarker}`,
        );
      }
    }
  }
  assert.match(cast.actors.NPC_Studio_Manager?.voice.register ?? "", /짧고 건조한/);
  assert.match(cast.actors.NPC_Office_Worker?.voice.register ?? "", /해요체/);
  assert.match(
    cast.actors.NPC_Office_Worker?.selfOnlyPressures[0] ?? "",
    /서로 다른 출처.*시간 또는 담당자/,
  );
  assert.match(cast.actors.NPC_Park_Caretaker?.voice.register ?? "", /해요체/);
  assert.match(cast.actors.NPC_Station_Officer?.voice.register ?? "", /평평한 하십시오체/);
  assert.match(cast.actors.NPC_Roaming_Liaison?.voice.register ?? "", /해요체/);
  const authoredCast = JSON.stringify(cast);
  assert.ok(!authoredCast.includes("드러날까 염려"));
  assert.ok(!authoredCast.includes("현재 접수의 출발점이 된 내용을"));
  assert.ok(!authoredCast.includes("확인 내용의 원출처"));

  const missing = rawCast();
  delete missing.actors.NPC_Roaming_Liaison;
  assert.throws(() => parseRunCast(missing, layout), /exact layout actor id set/);

  const extra = rawCast();
  extra.actors.NPC_Extra = structuredClone(extra.actors.NPC_Roaming_Liaison);
  assert.throws(() => parseRunCast(extra, layout), /exact layout actor id set/);

  const selfTarget = rawCast();
  selfTarget.actors.NPC_Studio_Receptionist.known_relationships[0].actor_id =
    "NPC_Studio_Receptionist";
  assert.throws(() => parseRunCast(selfTarget, layout), /cannot target its holder/);

  const unknownTarget = rawCast();
  unknownTarget.actors.NPC_Studio_Receptionist.known_relationships[0].actor_id = "NPC_Unknown";
  assert.throws(() => parseRunCast(unknownTarget, layout), /references an unknown actor/);

  const duplicateTarget = rawCast();
  duplicateTarget.actors.NPC_Studio_Receptionist.known_relationships.push(
    structuredClone(duplicateTarget.actors.NPC_Studio_Receptionist.known_relationships[0]),
  );
  assert.throws(() => parseRunCast(duplicateTarget, layout), /relationships must be unique/);
});

test("legacy observe packets carry no M3R actor or self context", () => {
  const packet = assembleObservePacket(createSameOrderWorld(), {
    actor: {
      actorId: "NPC_Store_Clerk",
      role: "store_clerk",
      landmarkId: "Store",
      knownActorIds: ["player"],
      knownLandmarkIds: ["Store", "Station"],
    },
    goals: ["serve"],
    policy: DEFAULT_ROLE_POLICIES.store_clerk,
    memory: {
      actorId: "NPC_Store_Clerk",
      ownActionNotes: [],
      observedLedgerEventIds: [],
      evidence: [],
    },
    heardSpeech: [],
  });
  assert.equal(packet.actorContext, null);
  assert.equal(packet.selfContext, null);
});

test("run opening and merged player turn receive only the speaking resident's private cast context", async () => {
  const adapter = createStudioReceptionScriptedAdapter();
  const openings: ConversationTurnRequest[] = [];
  const mergedTurns: MergedConversationTurnRequest[] = [];
  const originalOpening = adapter.proposeConversationTurn.bind(adapter);
  const originalMerged = adapter.judgeAndProposeConversationTurn.bind(adapter);
  adapter.proposeConversationTurn = async request => {
    openings.push(structuredClone(request));
    return originalOpening(request);
  };
  adapter.judgeAndProposeConversationTurn = async request => {
    mergedTurns.push(structuredClone(request));
    return originalMerged(request);
  };
  const service = new RunService({ proposalPort: adapter, idFactory: deterministicIds() });
  const started = service.start("cast-player-context", "ko-KR");

  assert.deepEqual(started.playerBrief, {
    identityKey: "hud.m3r.player_brief.identity",
    arrivalKey: "hud.m3r.player_brief.arrival",
    uncertaintyKey: "hud.m3r.player_brief.uncertainty",
  });
  const publicSnapshot = JSON.stringify(started);
  assert.ok(!publicSnapshot.includes("미라 —"));
  assert.ok(!publicSnapshot.includes("담당자가 배정되지 않은 빈 칸"));
  assert.ok(!publicSnapshot.includes("출처가 충분하지 않은 예외"));

  await service.preloadConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  const opening = openings.at(-1);
  assert.ok(opening);
  assert.equal(opening.observePacket.actorContext?.publicIdentity, "미라 — 스튜디오 접수 담당자");
  assert.ok(opening.observePacket.selfContext?.selfOnlyPressures[0]?.includes("빈 칸"));
  assert.deepEqual(
    opening.observePacket.selfContext?.knownRelationships.map(relationship => relationship.actorId),
    ["NPC_Park_Caretaker"],
  );
  assert.deepEqual(opening.observePacket.selfContext?.residentKnownFacts, []);
  assert.deepEqual(
    opening.observePacket.actorPolicy.stableGoals,
    loadRunCast(loadRunLayout()).actors[STUDIO_RECEPTIONIST_ID]?.stableGoals,
  );
  const openingJson = JSON.stringify(opening.observePacket);
  assert.ok(!openingJson.includes("출처가 충분하지 않은 예외"));
  assert.ok(!openingJson.includes("hud.m3r.player_brief.uncertainty"));

  await groundOrdinaryConversation(
    service,
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "cast-ground-player-turn",
  );
  const conversation = await service.startConversation(
    started.runId,
    STUDIO_RECEPTIONIST_ID,
    "StudioReceptionConversation",
    "ko-KR",
  );
  await service.answer(
    started.runId,
    conversation.sessionId,
    conversation.nextTurn.turnId,
    { type: "choice", choiceId: conversation.nextTurn.choices[0].choiceId },
  );
  const merged = mergedTurns.at(-1);
  assert.ok(merged);
  assert.deepEqual(merged.observePacket.actorContext, opening.observePacket.actorContext);
  assert.deepEqual(merged.observePacket.selfContext, opening.observePacket.selfContext);
  assert.ok(!JSON.stringify(merged.observePacket).includes("출처가 충분하지 않은 예외"));
});
