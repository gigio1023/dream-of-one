import { assembleObservePacket, DEFAULT_ROLE_POLICIES } from "../agentloop/context.js";
import { createProviderFromEnvironment } from "../providers/registry.js";
import { createSameOrderWorld } from "../runtime/world/index.js";

const profileIndex = process.argv.indexOf("--profile");
const requestedProfile = profileIndex >= 0 ? process.argv[profileIndex + 1] : undefined;
const env = { ...process.env };
if (requestedProfile) env.NPC_PROVIDER_PROFILE = requestedProfile;

const { proposalPort, profileId } = createProviderFromEnvironment(env);
const actor = {
  actorId: "NPC_Store_Clerk",
  role: "store_clerk" as const,
  landmarkId: "Store",
  knownActorIds: ["player", "NPC_Store_Manager"],
  knownLandmarkIds: ["Store", "Station"],
};
const observePacket = assembleObservePacket(createSameOrderWorld(), {
  actor,
  goals: ["평소 주문을 자연스럽게 확인한다"],
  policy: DEFAULT_ROLE_POLICIES.store_clerk,
  memory: { actorId: actor.actorId, ownActionNotes: [], observedLedgerEventIds: [] },
  heardSpeech: [],
});

const result = await proposalPort.proposeConversationTurn({
  sessionId: "provider-smoke",
  locale: "ko-KR",
  beatId: "routine",
  actorId: actor.actorId,
  objective: "평소 주문을 자연스럽게 확인한다.",
  sceneFacts: ["플레이어는 단골로 취급된다.", "평소 주문 표식이 카운터에 보인다."],
  observePacket,
  conversationHistory: [],
});

console.log(JSON.stringify({
  profileId,
  transport: result.meta.transport,
  usedFallback: result.meta.usedFallback,
  fallbackReason: result.meta.fallbackReason,
  utterance: result.proposal.utterance,
  suggestedReplyCount: result.proposal.suggestedReplies.length,
  usage: result.meta.usage,
}, null, 2));

if (result.meta.transport !== "live") process.exitCode = 2;
