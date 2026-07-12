import { DEFAULT_ROLE_POLICIES, type ObservePacket } from "../agentloop/context.js";
import { recordKindsForRole, toolCatalogForRole } from "../agentloop/tools.js";
import {
  DEFAULT_GAMEPLAY_LOCALE,
  SUPPORTED_GAMEPLAY_LOCALES,
  gameplayLocaleSchema,
} from "../localization/supported-locales.js";
import type { ProposalMeta } from "../providers/ports.js";
import { createProviderFromEnvironment } from "../providers/registry.js";

const EXPECTED_PROFILE_ID = "modelscope/qwen3.7-plus";
const PLAYER_ANSWERS: Record<string, string> = {
  "ko-KR": "청문회 전에 필요한 절차를 확인하려고 왔습니다.",
  "en-US": "I came to confirm the steps I need before the hearing.",
  "it-IT": "Sono qui per verificare i passaggi necessari prima dell'udienza.",
  "zh-CN": "我来确认听证会前需要完成的手续。",
  "fr-FR": "Je suis venu confirmer les démarches à suivre avant l'audience.",
  "ja-JP": "聴聞会の前に必要な手続きを確認しに来ました。",
};

function optionValue(flag: "--profile" | "--locale"): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} requires a value`);
    process.exit(2);
  }
  return value;
}

const requestedProfile = optionValue("--profile");
const localeResult = gameplayLocaleSchema.safeParse(
  optionValue("--locale") ?? DEFAULT_GAMEPLAY_LOCALE,
);
if (!localeResult.success) {
  console.error(
    `unsupported --locale; expected one of ${SUPPORTED_GAMEPLAY_LOCALES.join(", ")}`,
  );
  process.exit(2);
}
const locale = localeResult.data;
const playerLine = PLAYER_ANSWERS[locale];
if (!playerLine) {
  throw new Error(`provider smoke has no localized player answer for ${locale}`);
}
for (const supportedLocale of SUPPORTED_GAMEPLAY_LOCALES) {
  if (!PLAYER_ANSWERS[supportedLocale]) {
    throw new Error(`provider smoke is missing player input for ${supportedLocale}`);
  }
}

const env = { ...process.env };
if (requestedProfile) env.NPC_PROVIDER_PROFILE = requestedProfile;
const { proposalPort, profileId } = createProviderFromEnvironment(env);

const actorId = "NPC_Studio_Receptionist";
const role = "studio_receptionist" as const;
const rolePolicy = DEFAULT_ROLE_POLICIES[role];
const goals = [...rolePolicy.stableGoals];
const observePacket: ObservePacket = {
  actorId,
  role,
  landmarkId: "Studio",
  goals,
  actorPolicy: {
    role: rolePolicy.role,
    stableGoals: [...rolePolicy.stableGoals],
    priorityShifts: [...rolePolicy.priorityShifts],
    forbiddenClaims: [...rolePolicy.forbiddenClaims],
  },
  actorMemory: {
    actorId,
    ownActionNotes: [],
    observedLedgerEventIds: [],
  },
  visibleObjects: [],
  visibleRecords: [],
  visibleLedgerEvents: [],
  visibleActors: ["player"],
  audibleActorIds: ["player"],
  reachableAnchorRefs: ["Studio.reception_desk"],
  playerContact: null,
  heardSpeech: [],
  toolCatalog: toolCatalogForRole(role),
  administrativeSources: [],
  administrativeAuthority: {
    allowedRecordKinds: recordKindsForRole(role),
    writableTextSurfaceIds: [],
  },
};

const scopeId = `provider-smoke:${locale}`;
const beatId = "resident_opening_studio_receptionist";
const objective =
  "Understand why the outsider arrived and explain the first reception step without inventing approval.";
const sceneFacts = [
  "The visitor and receptionist are face to face at the Studio reception desk.",
  "The visitor is an outsider asking about the procedure before the scheduled hearing.",
  "No approval, administrative record, or hidden resident belief is visible here.",
];

const opening = await proposalPort.proposeConversationTurn({
  sessionId: scopeId,
  locale,
  beatId,
  actorId,
  objective,
  sceneFacts,
  observePacket,
  conversationHistory: [],
});

const answer = await proposalPort.judgeAndProposeConversationTurn({
  sessionId: scopeId,
  locale,
  beatId,
  promptId: "studio.reception.first_contact",
  actorId,
  playerLine,
  conversationHistory: [{ speakerId: actorId, line: opening.proposal.utterance }],
  observePacket,
  suspicionBefore: 0,
  reportPressureBefore: 0,
  objective,
  sceneFacts,
  stanceBefore: "uncertain",
  hasMeaningfulFirsthandConversation: false,
});

const audit = proposalPort.auditSnapshot(scopeId);
const isAcceptedLiveMeta = (meta: ProposalMeta): boolean =>
  meta.profileId === EXPECTED_PROFILE_ID &&
  meta.transport === "live" &&
  !meta.usedFallback &&
  meta.fallbackReason === undefined;
const chargedTokens = audit.calls.reduce((total, call) => total + call.chargedTokens, 0);
const acceptancePassed =
  profileId === EXPECTED_PROFILE_ID &&
  isAcceptedLiveMeta(opening.meta) &&
  isAcceptedLiveMeta(answer.meta) &&
  audit.complete &&
  !audit.truncated &&
  audit.droppedCount === 0 &&
  audit.inFlightCalls === 0 &&
  audit.inFlightTokens === 0 &&
  audit.callsUsed > 0 &&
  audit.callsUsed === audit.calls.length &&
  audit.tokensUsed === chargedTokens &&
  audit.calls.every(call =>
    call.profileId === EXPECTED_PROFILE_ID &&
    call.transport === "live" &&
    !call.usedFallback &&
    call.outcome === "success" &&
    call.failureReason === null
  ) &&
  audit.resolutions.length === 2 &&
  audit.resolutions.map(resolution => resolution.purpose).join(",") ===
    "conversation,conversation_turn" &&
  audit.resolutions.every(resolution =>
    resolution.profileId === EXPECTED_PROFILE_ID &&
    resolution.transport === "live" &&
    !resolution.usedFallback &&
    resolution.fallbackReason === null &&
    resolution.callSeqs.length > 0
  );

console.log(JSON.stringify({
  profileId,
  expectedProfileId: EXPECTED_PROFILE_ID,
  locale,
  acceptancePassed,
  opening: {
    utterance: opening.proposal.utterance,
    suggestedReplies: opening.proposal.suggestedReplies,
    continueConversation: opening.proposal.continueConversation,
    meta: opening.meta,
  },
  answer: {
    playerLine,
    judgment: {
      suspicionDelta: answer.proposal.suspicionDelta,
      reportDelta: answer.proposal.reportDelta,
      signals: answer.proposal.signals,
      whyLine: answer.proposal.whyLine,
      stance: answer.proposal.stance,
      meaningfulFirsthand: answer.proposal.meaningfulFirsthand,
    },
    nextNpcLine: answer.proposal.utterance,
    suggestedReplies: answer.proposal.suggestedReplies,
    continueConversation: answer.proposal.continueConversation,
    meta: answer.meta,
  },
  audit,
}, null, 2));

if (!acceptancePassed) process.exitCode = 2;
