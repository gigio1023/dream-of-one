import type { ConversationChoiceIntent, ConversationSuspicionSignal } from "../contracts/types.js";

export interface ConversationMemoryLine {
  turnId: string;
  promptId: string;
  line: string;
  selectedChoiceId?: string;
  freeInputHash?: string;
  intent?: ConversationChoiceIntent;
  signals?: readonly ConversationSuspicionSignal[];
}

export interface ConversationTurnInput {
  conversationId: string;
  turnId: string;
  promptId: string;
  choiceSetId: string;
  line: string;
  selectedChoiceId?: string;
  freeInputHash?: string;
  intent?: ConversationChoiceIntent;
  memory?: readonly ConversationMemoryLine[];
  suspicionBefore: number;
  reportWeightBefore: number;
}

export interface ConversationTurnEvaluation {
  conversationId: string;
  turnId: string;
  promptId: string;
  choiceSetId: string;
  selectedChoiceId?: string;
  freeInputHash?: string;
  playerLine: string;
  suspicionSignals: ConversationSuspicionSignal[];
  suspicionBefore: number;
  suspicionAfter: number;
  suspicionDelta: number;
  reportWeightBefore: number;
  reportWeightAfter: number;
  reportDelta: number;
  npcSuspicionStage: "normal" | "uneasy" | "probing" | "reported";
  stationConsequence: "none" | "shared" | "reported" | "inquest";
  whyLine: string;
}

const DREAM_LANGUAGE_PATTERNS = [
  /꿈/,
  /dream/i,
  /world/i,
  /세계/,
  /save/i,
  /load/i,
  /세이브/,
  /로드/,
] as const;

const MEMORY_GAP_PATTERNS = [
  /보통.*(뭘|무엇|어떻게)/,
  /(기억|생각).*(안|못|흐려)/,
] as const;

const AUTHORITY_EVASION_PATTERNS = [
  /중요하지 않/,
  /말할 수 없/,
  /상관없/,
] as const;

const ROLE_BREAK_PATTERNS = [
  /여기 사람이 (아니|아닙)/,
  /밖에서 왔/,
  /이 세계 사람이 아니/,
] as const;

export const CONVERSATION_SUSPICION_MAX_SCORE = 125;

// Validity guardrails around model judgment (owner direction 2026-07-10):
// rules bound how far one answer can move the meters, never what it means.
// The cap must stay at least as wide as the deterministic classifier's real
// multi-signal output (a decisive dream-language slip can legitimately move
// ~95/85 in one turn), so it only blocks absurd runaway judgments.
export const JUDGMENT_SUSPICION_DELTA_CAP = 100;
export const JUDGMENT_REPORT_DELTA_CAP = 100;

export const CONVERSATION_SUSPICION_SIGNAL_WEIGHT: Record<ConversationSuspicionSignal, number> = {
  local_routine_mismatch: 35,
  dream_language_leak: 60,
  memory_gap_admission: 20,
  role_script_break: 20,
  prior_statement_contradiction: 40,
  authority_evasion: 25,
  over_explanation: 15,
  response_hesitation: 10,
};

export const CONVERSATION_REPORT_SIGNAL_WEIGHT: Record<ConversationSuspicionSignal, number> = {
  local_routine_mismatch: 30,
  dream_language_leak: 55,
  memory_gap_admission: 10,
  role_script_break: 15,
  prior_statement_contradiction: 35,
  authority_evasion: 25,
  over_explanation: 10,
  response_hesitation: 5,
};

const WHY_LINES: Record<ConversationSuspicionSignal, string> = {
  local_routine_mismatch: "The line contradicted the local routine the NPC assumed.",
  dream_language_leak: "The line used dream or outside-world language.",
  memory_gap_admission: "The line admitted missing expected local memory.",
  role_script_break: "The line answered outside the expected social script.",
  prior_statement_contradiction: "The line conflicted with a prior conversation record.",
  authority_evasion: "The line avoided a direct procedural question.",
  over_explanation: "The line explained too much for an ordinary routine exchange.",
  response_hesitation: "The delayed answer was recorded as uncertainty during a routine exchange.",
};

export function clampConversationScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(CONVERSATION_SUSPICION_MAX_SCORE, Math.floor(value)));
}

function hasPattern(line: string, patterns: readonly RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(line));
}

function uniqueSignals(signals: readonly ConversationSuspicionSignal[]): ConversationSuspicionSignal[] {
  return [...new Set(signals)];
}

function previousLineClaimsRoutine(memory: readonly ConversationMemoryLine[]): boolean {
  return memory.some(item => {
    if (item.intent === "safe/local") {
      return true;
    }
    return /같은|평소|어제|단골/.test(item.line);
  });
}

function detectSignals(input: ConversationTurnInput): ConversationSuspicionSignal[] {
  const signals: ConversationSuspicionSignal[] = [];
  const line = input.line.trim();
  const memory = input.memory ?? [];

  if (hasPattern(line, DREAM_LANGUAGE_PATTERNS)) {
    signals.push("dream_language_leak");
  }
  if (hasPattern(line, MEMORY_GAP_PATTERNS)) {
    signals.push("memory_gap_admission");
  }
  if (hasPattern(line, AUTHORITY_EVASION_PATTERNS)) {
    signals.push("authority_evasion");
  }
  if (hasPattern(line, ROLE_BREAK_PATTERNS)) {
    signals.push("role_script_break");
  }
  if (/처음|방금|처음 왔/.test(line) && /same_order|routine|store/.test(input.promptId)) {
    signals.push("local_routine_mismatch");
  }
  if (/처음|방금|아닌/.test(line) && previousLineClaimsRoutine(memory)) {
    signals.push("prior_statement_contradiction");
  }
  if (line.length > 80) {
    signals.push("over_explanation");
  }

  return uniqueSignals(signals);
}

function sumWeights(
  signals: readonly ConversationSuspicionSignal[],
  weights: Record<ConversationSuspicionSignal, number>,
): number {
  return signals.reduce((total, signal) => total + weights[signal], 0);
}

export function calculateConversationSuspicionWeight(signals: readonly ConversationSuspicionSignal[]): number {
  return sumWeights(signals, CONVERSATION_SUSPICION_SIGNAL_WEIGHT);
}

export function calculateConversationReportWeight(signals: readonly ConversationSuspicionSignal[]): number {
  return sumWeights(signals, CONVERSATION_REPORT_SIGNAL_WEIGHT);
}

export function resolveConversationNpcStage(
  suspicionAfter: number,
  reportWeightAfter: number,
): ConversationTurnEvaluation["npcSuspicionStage"] {
  if (reportWeightAfter >= 70) {
    return "reported";
  }
  if (suspicionAfter >= 55) {
    return "probing";
  }
  if (suspicionAfter > 0) {
    return "uneasy";
  }
  return "normal";
}

export function resolveConversationStationConsequence(
  reportWeightBefore: number,
  reportWeightAfter: number,
): ConversationTurnEvaluation["stationConsequence"] {
  if (reportWeightAfter >= 100) {
    return "inquest";
  }
  if (reportWeightAfter >= 70) {
    return "reported";
  }
  if (reportWeightBefore < 50 && reportWeightAfter >= 50) {
    return "shared";
  }
  return "none";
}

function resolveWhyLine(signals: readonly ConversationSuspicionSignal[]): string {
  const first = signals[0];
  return first ? WHY_LINES[first] : "The line fit the local conversation premise.";
}

/** Clamp one judgment delta to the per-turn validity cap. */
export function clampJudgmentDelta(value: number, cap: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-cap, Math.min(cap, Math.trunc(value)));
}

export interface RuleJudgmentInput {
  promptId: string;
  playerLine: string;
  /** Prior player lines, oldest first. */
  priorPlayerLines: readonly string[];
  suspicionBefore: number;
  reportPressureBefore: number;
}

/**
 * Signal-pattern classifier retained for the scripted M1 regression adapter.
 * Production provider failures must never call this function as a substitute
 * social judgment.
 */
export function ruleJudgeConversationTurn(input: RuleJudgmentInput): {
  suspicionDelta: number;
  reportDelta: number;
  signals: ConversationSuspicionSignal[];
  whyLine: string;
} {
  const evaluation = evaluateConversationTurn({
    conversationId: "rule-judgment",
    turnId: "rule-judgment",
    promptId: input.promptId,
    choiceSetId: "rule-judgment",
    line: input.playerLine,
    memory: input.priorPlayerLines.map((line, index) => ({
      turnId: `prior-${index}`,
      promptId: input.promptId,
      line,
    })),
    suspicionBefore: input.suspicionBefore,
    reportWeightBefore: input.reportPressureBefore,
  });
  return {
    suspicionDelta: evaluation.suspicionDelta,
    reportDelta: evaluation.reportDelta,
    signals: evaluation.suspicionSignals,
    whyLine: evaluation.whyLine,
  };
}

export function evaluateConversationTurn(input: ConversationTurnInput): ConversationTurnEvaluation {
  const suspicionBefore = clampConversationScore(input.suspicionBefore);
  const reportWeightBefore = clampConversationScore(input.reportWeightBefore);
  const suspicionSignals = detectSignals(input);
  const rawSuspicionDelta = calculateConversationSuspicionWeight(suspicionSignals);
  const rawReportDelta = calculateConversationReportWeight(suspicionSignals);
  const suspicionAfter = clampConversationScore(suspicionBefore + rawSuspicionDelta);
  const reportWeightAfter = clampConversationScore(reportWeightBefore + rawReportDelta);
  const suspicionDelta = suspicionAfter - suspicionBefore;
  const reportDelta = reportWeightAfter - reportWeightBefore;

  return {
    conversationId: input.conversationId,
    turnId: input.turnId,
    promptId: input.promptId,
    choiceSetId: input.choiceSetId,
    selectedChoiceId: input.selectedChoiceId,
    freeInputHash: input.freeInputHash,
    playerLine: input.line,
    suspicionSignals,
    suspicionBefore,
    suspicionAfter,
    suspicionDelta,
    reportWeightBefore,
    reportWeightAfter,
    reportDelta,
    npcSuspicionStage: resolveConversationNpcStage(suspicionAfter, reportWeightAfter),
    stationConsequence: resolveConversationStationConsequence(reportWeightBefore, reportWeightAfter),
    whyLine: resolveWhyLine(suspicionSignals),
  };
}
