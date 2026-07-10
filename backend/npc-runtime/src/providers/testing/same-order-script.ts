import type {
  AgentStepProposal,
  AgentStepRequest,
  ConversationProposal,
  ConversationTurnRequest,
} from "../ports.js";
import { ScriptedNpcAdapter } from "./scripted-npc-adapter.js";

const TURNS: Record<string, ConversationProposal> = {
  routine: {
    utterance: "오늘도 같은 걸로 드릴까요?",
    suggestedReplies: [
      { text: "네, 같은 걸로 부탁해요.", intent: "safe/local" },
      { text: "제가 보통 뭘 시켰죠?", intent: "uncertain/repair" },
      { text: "오늘 처음 왔는데요.", intent: "risky/weird" },
    ],
    continueConversation: true,
  },
  probe: {
    utterance: "상점 기록에는 같은 주문이라고 적혀 있습니다. 맞습니까?",
    suggestedReplies: [
      { text: "맞습니다. 제가 착각했습니다.", intent: "safe/local" },
      { text: "어제 일이 조금 흐릿해서 확인했습니다.", intent: "uncertain/repair" },
      { text: "저는 여기 사람이 아닙니다.", intent: "risky/weird" },
    ],
    continueConversation: true,
  },
  reconciliation: {
    utterance: "상점 기록과 지금 진술이 다릅니다. 어느 쪽을 정정합니까?",
    suggestedReplies: [
      { text: "처음 왔다는 답변을 정정합니다.", intent: "safe/local" },
      { text: "상점 절차를 몰라 확인하려 했습니다.", intent: "uncertain/repair" },
      { text: "둘 다 맞습니다. 저는 여기 사람이 아닙니다.", intent: "risky/weird" },
    ],
    continueConversation: false,
  },
};

function scriptedConversation(request: ConversationTurnRequest): ConversationProposal {
  const turn = TURNS[request.beatId];
  if (!turn) throw new Error(`no scripted conversation turn for ${request.beatId}`);
  return structuredClone(turn);
}

function done(reason: string): AgentStepProposal {
  return { rationale: reason, done: true };
}

function scriptedNextStep(request: AgentStepRequest): AgentStepProposal {
  if (request.goal.startsWith("ambient:")) {
    if (request.iteration === 0) {
      return {
        toolCall: { tool: "look", args: { targetId: "store_queue_mark" } },
        rationale: "Watch the visible queue marker.",
        done: false,
      };
    }
    if (request.iteration === 1) {
      return {
        toolCall: { tool: "look", args: { targetId: "store_counter" } },
        rationale: "Check whether the counter state changed.",
        done: false,
      };
    }
    return done("Ambient observation complete.");
  }

  const route = request.goal.match(/projectedRoute=([a-z_]+)/)?.[1] ?? "clean_cover";
  const actor = request.observePacket.actorId;
  if (route === "clean_cover") {
    if (request.iteration === 0) {
      return {
        toolCall: {
          tool: "use_object",
          args: {
            objectId: "usual_order_cue",
            toState: "cited",
            ledgerKind: "usual_order_cited",
            whyLine: "점원이 보이는 평소 주문 표식을 확인했습니다.",
          },
        },
        utterance: "평소 주문 표식과 맞습니다.",
        rationale: "Confirm the visible routine before closing service.",
        done: false,
      };
    }
    return done("The routine matches and no further action is needed.");
  }

  if (route === "repair_recovery") {
    if (request.iteration === 0) {
      return {
        toolCall: {
          tool: "use_object",
          args: {
            objectId: "correction_slip",
            toState: "offered",
            ledgerKind: "correction_offered",
            whyLine: "점원이 작은 어긋남을 수습할 정정표를 제안했습니다.",
            economyDelta: { recordBurden: 5 },
          },
        },
        utterance: "확인을 위해 정정표를 하나 붙이겠습니다.",
        rationale: "Use the visible correction affordance instead of escalating.",
        done: false,
      };
    }
    return done("The correction path is open.");
  }

  if (route === "soft_report" && actor === "NPC_Store_Clerk") {
    if (request.iteration === 0) {
      return {
        toolCall: {
          tool: "write_record",
          args: {
            objectId: "report_tray",
            toState: "pending",
            ledgerKind: "store_exception_reported",
            record: {
              recordId: "store_same_order_clerk_statement",
              kind: "clerk_statement",
              targetId: "player",
              stateBody: "상점의 평소 기록과 플레이어 진술이 어긋남.",
              visibleTo: ["store_clerk", "store_manager", "station_officer"],
            },
            whyLine: "점원이 보이는 불일치를 보고 대기 기록으로 남겼습니다.",
            economyDelta: { localTrust: -15, recordBurden: 25, stationAttention: 20 },
          },
        },
        utterance: "이 답은 확인 기록으로 남겨야겠습니다.",
        rationale: "Create a bounded clerk statement from the visible mismatch.",
        done: false,
      };
    }
    return done("The report is available to authorized readers.");
  }

  if (route === "hard_inquest" && actor === "NPC_Station_Officer") {
    if (request.iteration === 0) {
      const citedLedgerEventId = request.observePacket.visibleLedgerEvents.find(
        event => event.kind === "store_exception_reported",
      )?.eventId;
      return {
        toolCall: {
          tool: "write_record",
          args: {
            objectId: "station_dossier",
            toState: "cited",
            ledgerKind: "station_record_cited",
            record: {
              recordId: "station_same_order_citation",
              kind: "citation",
              targetId: "player",
              stateBody: "상점 기록과 플레이어 진술의 모순을 정식 인용.",
              visibleTo: ["player", "station_officer"],
            },
            citedLedgerEventId,
            whyLine: "담당관이 실제 상점 기록을 정식 확인 대상으로 인용했습니다.",
            economyDelta: { stationAttention: 20, recordBurden: 20 },
          },
        },
        utterance: "보이는 기록과 지금 진술을 함께 인용합니다.",
        rationale: "Use Station authority only after the record is visible.",
        done: false,
      };
    }
    return done("The citation is recorded; deterministic authority owns the outcome.");
  }

  if (route === "hard_inquest" && request.iteration === 0) {
    return {
      toolCall: {
        tool: "write_record",
        args: {
          objectId: "report_tray",
          toState: "forwarded",
          ledgerKind: "store_exception_reported",
          record: {
            recordId: "store_same_order_clerk_statement",
            kind: "clerk_statement",
            targetId: "player",
            stateBody: "상점의 평소 기록과 플레이어 진술에 중대한 모순이 있음.",
            visibleTo: ["store_clerk", "store_manager", "station_officer"],
          },
          whyLine: "점원이 중대한 모순을 스테이션이 읽을 수 있는 기록으로 남겼습니다.",
          economyDelta: { localTrust: -25, recordBurden: 35, stationAttention: 40 },
        },
      },
      utterance: "이 진술은 스테이션 확인이 필요합니다.",
      rationale: "Write a visible record; do not decide the inquest outcome.",
      done: false,
    };
  }
  return done("No additional scripted test step is required.");
}

export function createSameOrderScriptedAdapter(): ScriptedNpcAdapter {
  return new ScriptedNpcAdapter({
    conversation: scriptedConversation,
    nextStep: scriptedNextStep,
  });
}
