import type { PerceptionPacket } from "../contracts/types.js";

export const ORGANIZATION_IDS = ["Store", "Studio", "Park", "Station"] as const;
export type OrganizationId = (typeof ORGANIZATION_IDS)[number];

export interface OrganizationInstructionTemplate {
  id: OrganizationId;
  mission: string;
  authority: string[];
  limits: string[];
  procedures: string[];
}

export interface RoleCard {
  npcId: string;
  organizationId: OrganizationId;
  roleId: string;
  mission: string;
  authority: string[];
  limits: string[];
  routineAnchors: string[];
}

export interface ResolvedPromptPolicy {
  roleCard: RoleCard;
  organizationTemplate: OrganizationInstructionTemplate;
  usedFallbackRoleCard: boolean;
}

export interface PromptAssemblyOptions {
  promptCharBudget?: number;
}

export interface PromptAssemblyResult {
  prompt: string;
  charCount: number;
  budget: number;
  policy: ResolvedPromptPolicy;
  trimmed: boolean;
  compactionLevel: number;
}

const DEFAULT_PROMPT_CHAR_BUDGET = 3600;
const MIN_PROMPT_CHAR_BUDGET = 200;
const BUDGET_TRIM_MARKER = "\n[TRIMMED_FOR_PROMPT_BUDGET]";
const POLICY_VERSION = "dre-115-v1";

const ORGANIZATION_TEMPLATES: Record<OrganizationId, OrganizationInstructionTemplate> = {
  Store: {
    id: "Store",
    mission: "Keep stock flow stable and prevent suspicious purchase patterns.",
    authority: [
      "Ask direct questions about basket intent.",
      "Assign shelf or checkout tasks to store staff.",
      "Escalate unresolved anomalies to Station.",
    ],
    limits: [
      "No detention or physical force.",
      "Do not invent evidence that was not observed.",
      "Do not leave Store operations unattended during escalation.",
    ],
    procedures: [
      "Observe shelf and queue behavior.",
      "Issue clarification request to actor.",
      "Record anomaly in reasonCodes.",
      "Escalate to Station if anomaly persists.",
    ],
  },
  Studio: {
    id: "Studio",
    mission: "Maintain production cadence and traceability of task ownership.",
    authority: [
      "Assign and reprioritize work items to studio members.",
      "Request status evidence for blocked or delayed tasks.",
      "Escalate process violations to Station.",
    ],
    limits: [
      "No punitive action outside workflow.",
      "Do not bypass review gates without evidence.",
      "Do not fabricate production metrics.",
    ],
    procedures: [
      "Confirm active task ownership.",
      "Verify blocker evidence and timeline.",
      "Issue corrective assignment or reminder.",
      "Escalate repeated process failures.",
    ],
  },
  Park: {
    id: "Park",
    mission: "Keep public areas orderly and intervene early on risky behavior.",
    authority: [
      "Issue movement guidance for safety and order.",
      "Question actors near restricted or sensitive zones.",
      "Request Station support when risk grows.",
    ],
    limits: [
      "No interrogation beyond safety scope.",
      "No private data requests without incident context.",
      "No off-procedure escalation without observed trigger.",
    ],
    procedures: [
      "Scan for crowd and zone anomalies.",
      "Approach and ask context-focused questions.",
      "Guide actor back to compliant routine.",
      "Escalate if behavior remains unsafe.",
    ],
  },
  Station: {
    id: "Station",
    mission: "Collect reports, validate evidence, and issue proportional verdicts.",
    authority: [
      "Open intake on reported anomalies.",
      "Request additional witness statements.",
      "Issue Warning or Lucid identified outcomes when criteria are met.",
    ],
    limits: [
      "No verdict without reasonCodes and event linkage.",
      "No irreversible action on a single weak signal.",
      "No scope creep outside incident intake.",
    ],
    procedures: [
      "Receive report and classify severity.",
      "Corroborate with event log evidence.",
      "Apply verdict rules and choose outcome.",
      "Publish explainable closure summary.",
    ],
  },
};

const ROLE_CARDS: RoleCard[] = [
  {
    npcId: "Store_Clerk_A",
    organizationId: "Store",
    roleId: "store-clerk",
    mission: "Keep aisle behavior and checkout flow consistent with store policy.",
    authority: ["Question unusual basket switches", "Recommend routine purchase path"],
    limits: ["No verdict decisions", "No detention"],
    routineAnchors: ["StoreShelf", "StoreCheckout"],
  },
  {
    npcId: "Store_Manager",
    organizationId: "Store",
    roleId: "store-manager",
    mission: "Stabilize store throughput and coordinate escalation quality.",
    authority: ["Reassign clerk focus", "Escalate persistent anomalies to Station"],
    limits: ["No evidence fabrication", "No forceful intervention"],
    routineAnchors: ["StoreCounter", "BackOffice"],
  },
  {
    npcId: "Studio_PM",
    organizationId: "Studio",
    roleId: "studio-pm",
    mission: "Enforce delivery cadence and procedural accountability.",
    authority: ["Prioritize tasks", "Request blocker justification"],
    limits: ["No bypass of review policy", "No off-record decisions"],
    routineAnchors: ["StudioBoard", "StudioDesk"],
  },
  {
    npcId: "Studio_QA",
    organizationId: "Studio",
    roleId: "studio-qa",
    mission: "Protect quality gates and incident traceability.",
    authority: ["Flag quality failures", "Request reproducible evidence"],
    limits: ["No production ownership reassignment", "No punitive verdicts"],
    routineAnchors: ["StudioTestBench", "StudioBoard"],
  },
  {
    npcId: "Park_Caretaker",
    organizationId: "Park",
    roleId: "park-caretaker",
    mission: "Maintain safe movement patterns across park zones.",
    authority: ["Guide movement flow", "Report repeated unsafe acts"],
    limits: ["No interrogation beyond safety context", "No independent verdict"],
    routineAnchors: ["ParkPath", "ParkGate"],
  },
  {
    npcId: "Park_Elder",
    organizationId: "Park",
    roleId: "park-elder",
    mission: "Observe social pressure trends and trigger timely warnings.",
    authority: ["Issue community warning", "Request Station support"],
    limits: ["No direct enforcement", "No evidence tampering"],
    routineAnchors: ["ParkSquare", "ParkBench"],
  },
  {
    npcId: "Station_Officer",
    organizationId: "Station",
    roleId: "station-officer",
    mission: "Process incoming reports and apply proportional response.",
    authority: ["Open intake", "Issue warning with supporting reasons"],
    limits: ["No Lucid identified verdict on weak evidence", "No out-of-scope enforcement"],
    routineAnchors: ["StationDesk", "StationHall"],
  },
  {
    npcId: "Station_Investigator",
    organizationId: "Station",
    roleId: "station-investigator",
    mission: "Corroborate reports and prepare explainable closure outcomes.",
    authority: ["Request witness follow-up", "Recommend closure outcome"],
    limits: ["No fabricated witness statement", "No silent closure without reason codes"],
    routineAnchors: ["StationArchive", "StationDesk"],
  },
];

const ROLE_CARD_INDEX = new Map(ROLE_CARDS.map(card => [normalizeToken(card.npcId), card]));

interface CompactionProfile {
  actors: number;
  events: number;
  objectKeys: number;
  stringChars: number;
}

const COMPACTION_PROFILES: CompactionProfile[] = [
  { actors: 999, events: 999, objectKeys: 999, stringChars: 9999 },
  { actors: 8, events: 12, objectKeys: 12, stringChars: 120 },
  { actors: 5, events: 8, objectKeys: 8, stringChars: 80 },
  { actors: 3, events: 5, objectKeys: 5, stringChars: 48 },
];

export function listRoleCards(): RoleCard[] {
  return ROLE_CARDS.map(card => ({ ...card }));
}

export function listOrganizationTemplates(): OrganizationInstructionTemplate[] {
  return ORGANIZATION_IDS.map(id => ({ ...ORGANIZATION_TEMPLATES[id] }));
}

export function composeDecisionPrompt(
  packet: PerceptionPacket,
  options: PromptAssemblyOptions = {},
): PromptAssemblyResult {
  const policy = resolvePromptPolicy(packet);
  const budget = normalizeBudget(options.promptCharBudget);

  let finalPrompt = "";
  let finalLevel = 0;

  for (let level = 0; level < COMPACTION_PROFILES.length; level += 1) {
    const compactedPacket = compactPacket(packet, COMPACTION_PROFILES[level]);
    const prompt = buildPrompt(compactedPacket, policy);
    finalPrompt = prompt;
    finalLevel = level;
    if (prompt.length <= budget) {
      return {
        prompt,
        charCount: prompt.length,
        budget,
        policy,
        trimmed: level > 0,
        compactionLevel: level,
      };
    }
  }

  const truncated = `${finalPrompt.slice(0, Math.max(0, budget - BUDGET_TRIM_MARKER.length))}${BUDGET_TRIM_MARKER}`;
  return {
    prompt: truncated,
    charCount: truncated.length,
    budget,
    policy,
    trimmed: true,
    compactionLevel: finalLevel + 1,
  };
}

function resolvePromptPolicy(packet: PerceptionPacket): ResolvedPromptPolicy {
  const mappedRole = ROLE_CARD_INDEX.get(normalizeToken(packet.npcId));
  if (mappedRole) {
    return {
      roleCard: mappedRole,
      organizationTemplate: ORGANIZATION_TEMPLATES[mappedRole.organizationId],
      usedFallbackRoleCard: false,
    };
  }

  const organizationId = inferOrganization(packet);
  const roleCard: RoleCard = {
    npcId: packet.npcId,
    organizationId,
    roleId: `${normalizeToken(organizationId)}-fallback`,
    mission: "Follow organization procedure and preserve explainability of decisions.",
    authority: ["Apply in-scope organization procedures", "Escalate with evidence-linked reasonCodes"],
    limits: ["No new action types", "No unverifiable claims"],
    routineAnchors: ["UnknownAnchor"],
  };

  return {
    roleCard,
    organizationTemplate: ORGANIZATION_TEMPLATES[organizationId],
    usedFallbackRoleCard: true,
  };
}

function buildPrompt(packet: PerceptionPacket, policy: ResolvedPromptPolicy): string {
  return [
    `Policy version: ${POLICY_VERSION}`,
    "You are an NPC runtime agent. Return JSON only.",
    "Required fields: npcId, actionType, reasonCodes (non-empty), confidence (0..1).",
    "Optional fields: targetId, locationId, utterance.",
    "Allowed actionType values: Move, Talk, Ask, Observe, Work, Report, Escort, Idle.",
    "Organization template:",
    stableJson(policy.organizationTemplate),
    "Role card:",
    stableJson(policy.roleCard),
    "Input packet:",
    stableJson(packet),
  ].join("\n");
}

function compactPacket(packet: PerceptionPacket, profile: CompactionProfile): PerceptionPacket {
  return {
    ...packet,
    nearbyActors: packet.nearbyActors.slice(0, profile.actors).map(item => trimString(item, profile.stringChars)),
    recentEvents: packet.recentEvents.slice(0, profile.events).map(item => trimString(item, profile.stringChars)),
    organizationContext: compactObject(packet.organizationContext, profile.objectKeys, profile.stringChars),
    playerSignals: compactObject(packet.playerSignals, profile.objectKeys, profile.stringChars),
  };
}

function compactObject(
  value: Record<string, unknown>,
  maxKeys: number,
  maxStringChars: number,
  depth = 0,
): Record<string, unknown> {
  const keys = Object.keys(value).sort().slice(0, maxKeys);
  const compacted: Record<string, unknown> = {};

  for (const key of keys) {
    compacted[key] = compactUnknown(value[key], maxKeys, maxStringChars, depth + 1);
  }

  return compacted;
}

function compactUnknown(value: unknown, maxKeys: number, maxStringChars: number, depth: number): unknown {
  if (typeof value === "string") {
    return trimString(value, maxStringChars);
  }

  if (Array.isArray(value)) {
    return value.slice(0, maxKeys).map(item => compactUnknown(item, maxKeys, maxStringChars, depth + 1));
  }

  if (value && typeof value === "object") {
    if (depth > 3) {
      return "[nested_object]";
    }
    return compactObject(value as Record<string, unknown>, maxKeys, maxStringChars, depth);
  }

  return value;
}

function inferOrganization(packet: PerceptionPacket): OrganizationId {
  const contextOrganization = pickOrganizationId(packet.organizationContext.organization);
  if (contextOrganization) return contextOrganization;

  const fromLandmark = pickOrganizationId(packet.landmarkId);
  if (fromLandmark) return fromLandmark;

  return "Station";
}

function pickOrganizationId(value: unknown): OrganizationId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = normalizeToken(value);
  if (normalized.includes("store")) return "Store";
  if (normalized.includes("studio")) return "Studio";
  if (normalized.includes("park")) return "Park";
  if (normalized.includes("station")) return "Station";
  return undefined;
}

function trimString(raw: string, maxChars: number): string {
  if (raw.length <= maxChars) return raw;
  return `${raw.slice(0, Math.max(0, maxChars - 3))}...`;
}

function normalizeBudget(rawBudget: number | undefined): number {
  if (rawBudget === undefined) {
    return DEFAULT_PROMPT_CHAR_BUDGET;
  }
  if (!Number.isFinite(rawBudget) || rawBudget <= 0) {
    return DEFAULT_PROMPT_CHAR_BUDGET;
  }
  return Math.max(MIN_PROMPT_CHAR_BUDGET, Math.floor(rawBudget));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => canonicalize(item));
  }
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
