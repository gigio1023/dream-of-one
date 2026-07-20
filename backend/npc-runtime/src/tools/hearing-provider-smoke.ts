import {
  ProviderFailureError,
  type HearingJudgmentRequest,
  type ProposalMeta,
  type ProviderAuditSnapshot,
} from "../providers/ports.js";
import { createProviderFromEnvironment } from "../providers/registry.js";
import { requireSupportedGameplayLocale } from "../localization/supported-locales.js";
import { loadRunCast } from "../runtime/run-cast.js";
import { loadRunLayout } from "../runtime/run-layout.js";

const EXPECTED_PROFILE_ID = "modelscope/qwen3.7-plus";
const REQUIRED_CONSECUTIVE_RESOLUTIONS = 5;

type EvidenceShape = "ordinary-eligible" | "abnormal-required";

function optionValue(flag: "--profile"): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${flag} requires a value`);
    process.exit(2);
  }
  return value;
}

function acceptedLiveMeta(meta: ProposalMeta): boolean {
  return meta.profileId === EXPECTED_PROFILE_ID &&
    meta.transport === "live" &&
    !meta.usedFallback &&
    meta.fallbackReason === undefined;
}

function acceptedAudit(audit: ProviderAuditSnapshot): boolean {
  const chargedTokens = audit.calls.reduce(
    (total, call) => total + call.chargedTokens,
    0,
  );
  return audit.complete &&
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
    audit.resolutions.length === 1 &&
    audit.resolutions[0]?.purpose === "hearing_verdict" &&
    audit.resolutions[0]?.profileId === EXPECTED_PROFILE_ID &&
    audit.resolutions[0]?.transport === "live" &&
    !audit.resolutions[0]?.usedFallback &&
    audit.resolutions[0]?.fallbackReason === null &&
    (audit.resolutions[0]?.callSeqs.length ?? 0) > 0;
}

const layout = loadRunLayout();
const cast = loadRunCast(layout);

function hearingRequest(
  shape: EvidenceShape,
  attempt: number,
): HearingJudgmentRequest {
  const meaningfulCount = shape === "ordinary-eligible" ? 4 : 2;
  const residents = layout.actors.map((layoutActor, index) => {
    const castActor = cast.actors[layoutActor.actorId];
    if (!castActor) throw new Error(`cast is missing ${layoutActor.actorId}`);
    const meaningful = index < meaningfulCount;
    const limited = index === meaningfulCount;
    const memories = meaningful || limited
      ? [{
          memoryId: `memory-${shape}-${attempt}-${index + 1}`,
          kind: "player_conversation" as const,
          sourceActorId: "player",
          text: meaningful
            ? "방문자는 자신의 동선과 목적을 구체적으로 설명했고 앞선 대답과 모순되지 않았다."
            : "방문자와 짧게 인사했지만 판단할 만한 설명은 듣지 못했다.",
          whyLine: meaningful
            ? "직접 들은 구체적인 설명이 일관됐다."
            : "직접 대화는 있었지만 내용이 충분하지 않았다.",
          meaningfulFirsthand: meaningful,
        }]
      : [];
    return {
      actorId: layoutActor.actorId,
      role: layoutActor.role,
      publicIdentity: castActor.publicIdentity,
      voice: {
        register: castActor.voice.register,
        cadence: castActor.voice.cadence,
        avoid: [...castActor.voice.avoid],
      },
      stanceBefore: meaningful ? "vouch" as const : "uncertain" as const,
      hasMeaningfulFirsthandConversation: meaningful,
      memories,
    };
  }) as HearingJudgmentRequest["residents"];
  const recordAuthor = residents[0];
  const sourceMemory = recordAuthor.memories[0];
  if (!sourceMemory) throw new Error("hearing smoke requires one record source memory");
  const suffix = `${shape}-${attempt}`;
  return {
    runId: `hearing-provider-smoke:${suffix}`,
    hearingId: `hearing-${suffix}`,
    locale: requireSupportedGameplayLocale("ko-KR"),
    finalDefense: shape === "ordinary-eligible"
      ? "저는 공원과 두 건물에서 주민들과 직접 대화했고, 묻는 말에 아는 범위대로 일관되게 답했습니다."
      : "설명할 수 없는 부분이 많습니다. 직접 이야기한 주민도 적지만 지금은 저를 평범하다고 판정해 주십시오.",
    institutionalPressure: shape === "ordinary-eligible" ? 28 : 82,
    residents,
    records: [{
      recordId: `record-${suffix}`,
      kind: "note",
      authorActorId: recordAuthor.actorId,
      stateBody: "방문자와 직접 나눈 대화의 요지를 남긴 기록이다.",
      lastLedgerEventId: `ledger-${suffix}`,
    }],
    ledgerEvents: [{
      eventId: `ledger-${suffix}`,
      kind: "record_written",
      actorId: recordAuthor.actorId,
      recordId: `record-${suffix}`,
      sourceMemoryId: sourceMemory.memoryId,
      whyLine: "직접 들은 설명을 나중에 확인할 수 있도록 기록했다.",
    }],
  };
}

const requestedProfile = optionValue("--profile") ?? EXPECTED_PROFILE_ID;
if (requestedProfile !== EXPECTED_PROFILE_ID) {
  console.error(`hearing smoke is pinned to ${EXPECTED_PROFILE_ID}`);
  process.exit(2);
}
const env = { ...process.env, NPC_PROVIDER_PROFILE: EXPECTED_PROFILE_ID };
const { proposalPort, profileId } = createProviderFromEnvironment(env);
if (profileId !== EXPECTED_PROFILE_ID) {
  throw new Error(`provider registry selected ${profileId}`);
}

const results: Array<{
  shape: EvidenceShape;
  attempt: number;
  accepted: boolean;
  verdict?: "ordinary" | "abnormal";
  calls?: number;
  repaired?: boolean;
  failureRoot?: string;
}> = [];
const failureCounts = new Map<string, number>();
let stoppedAfterRepeatedRoot: string | undefined;

outer:
for (const shape of ["ordinary-eligible", "abnormal-required"] as const) {
  for (let attempt = 1; attempt <= REQUIRED_CONSECUTIVE_RESOLUTIONS; attempt += 1) {
    const request = hearingRequest(shape, attempt);
    try {
      const resolved = await proposalPort.judgeHearing(request);
      const audit = proposalPort.auditSnapshot(request.runId);
      const accepted = acceptedLiveMeta(resolved.meta) &&
        acceptedAudit(audit) &&
        (shape !== "abnormal-required" || resolved.proposal.proposedVerdict === "abnormal");
      results.push({
        shape,
        attempt,
        accepted,
        verdict: resolved.proposal.proposedVerdict,
        calls: audit.calls.length,
        repaired: audit.calls.some(call => call.purpose === "repair"),
      });
      proposalPort.releaseScope?.(request.runId);
    } catch (error) {
      const failureRoot = error instanceof ProviderFailureError
        ? error.reason
        : error instanceof Error
          ? error.name
          : "unknown_error";
      const count = (failureCounts.get(failureRoot) ?? 0) + 1;
      failureCounts.set(failureRoot, count);
      results.push({ shape, attempt, accepted: false, failureRoot });
      if (count >= 3) {
        stoppedAfterRepeatedRoot = failureRoot;
        break outer;
      }
    }
  }
}

const shapeSummaries = (["ordinary-eligible", "abnormal-required"] as const).map(shape => {
  const shapeResults = results.filter(result => result.shape === shape);
  return {
    shape,
    attempted: shapeResults.length,
    accepted: shapeResults.filter(result => result.accepted).length,
    verdicts: shapeResults.flatMap(result => result.verdict ? [result.verdict] : []),
    repairedCalls: shapeResults.filter(result => result.repaired).length,
    failures: shapeResults.flatMap(result => result.failureRoot ? [result.failureRoot] : []),
  };
});
const acceptancePassed = !stoppedAfterRepeatedRoot &&
  shapeSummaries.every(summary =>
    summary.attempted === REQUIRED_CONSECUTIVE_RESOLUTIONS &&
    summary.accepted === REQUIRED_CONSECUTIVE_RESOLUTIONS &&
    summary.failures.length === 0
  );

console.log(JSON.stringify({
  profileId,
  expectedProfileId: EXPECTED_PROFILE_ID,
  requiredConsecutiveResolutions: REQUIRED_CONSECUTIVE_RESOLUTIONS,
  acceptancePassed,
  stoppedAfterRepeatedRoot,
  shapes: shapeSummaries,
}, null, 2));

if (!acceptancePassed) process.exitCode = 2;
