import type {
  AgentStepProposal,
  AgentStepRequest,
  ConversationProposal,
  ConversationTurnRequest,
  MergedConversationTurn,
  MergedConversationTurnRequest,
} from "../ports.js";
import { ScriptedNpcAdapter } from "./scripted-npc-adapter.js";

function opening(request: ConversationTurnRequest): ConversationProposal {
  const roleOpenings: Record<string, string> = {
    NPC_Studio_Receptionist: "접수를 도와드리겠습니다. 이곳에 오신 이유를 말씀해 주세요.",
    NPC_Studio_Manager: "스튜디오 관리 업무 중입니다. 저를 찾아온 이유를 말씀해 주세요.",
    NPC_Office_Worker: "확인 업무를 맡고 있습니다. 어떤 일로 오셨는지 말씀해 주세요.",
    NPC_Park_Caretaker: "공원을 돌보는 중입니다. 제게 하실 말씀이 있나요?",
    NPC_Station_Officer: "스테이션 담당관입니다. 어떤 일로 말을 거셨습니까?",
    NPC_Roaming_Liaison: "마을을 오가며 연락을 맡고 있습니다. 무엇을 확인하고 싶으신가요?",
  };
  const utterance = roleOpenings[request.actorId];
  if (!utterance) throw new Error(`town fixture cannot speak for ${request.actorId}`);
  return {
    utterance,
    suggestedReplies: [
      { text: "안내받은 절차를 확인하러 왔습니다.", intent: "safe/local" },
      { text: "먼저 어떤 접수인지 설명해 주세요.", intent: "uncertain/repair" },
      { text: "여기 사람이 아니라서 잘 모르겠습니다.", intent: "risky/weird" },
    ],
    continueConversation: true,
  };
}

function mergedTurn(request: MergedConversationTurnRequest): MergedConversationTurn {
  if (request.playerLine.includes("안내받은 절차")) {
    return {
      suspicionDelta: -10,
      reportDelta: 0,
      signals: [],
      whyLine: "방문 이유를 접수 절차에 맞게 분명히 설명했습니다.",
      stance: "vouch",
      meaningfulFirsthand: true,
      utterance: "방문 목적을 확인했습니다. 접수 내용을 정리해 두겠습니다.",
      suggestedReplies: [
        { text: "확인해 주셔서 감사합니다.", intent: "safe/local" },
        { text: "다음 절차도 알려 주세요.", intent: "uncertain/repair" },
        { text: "더 말할 내용은 없습니다.", intent: "risky/weird" },
      ],
      continueConversation: false,
    };
  }
  if (request.playerLine.includes("여기 사람이 아니라서")) {
    return {
      suspicionDelta: 35,
      reportDelta: 15,
      signals: ["role_script_break"],
      whyLine: "이곳 사람의 절차를 전혀 모른다는 답이 의문을 남겼습니다.",
      stance: "oppose",
      meaningfulFirsthand: true,
      utterance: "그렇다면 방문 경위를 더 확인해야겠습니다.",
      suggestedReplies: [
        { text: "안내받은 내용을 차근히 설명하겠습니다.", intent: "safe/local" },
        { text: "어떤 부분부터 확인할까요?", intent: "uncertain/repair" },
        { text: "확인할 필요는 없습니다.", intent: "risky/weird" },
      ],
      continueConversation: false,
    };
  }
  return {
    suspicionDelta: 5,
    reportDelta: 0,
    signals: [],
    whyLine: "접수 목적이 아직 분명하지 않아 판단을 보류했습니다.",
    stance: "uncertain",
    meaningfulFirsthand: true,
    utterance: "알겠습니다. 지금 확인할 수 있는 내용부터 정리하겠습니다.",
    suggestedReplies: [
      { text: "제가 아는 내용을 말씀드리겠습니다.", intent: "safe/local" },
      { text: "필요한 질문을 해 주세요.", intent: "uncertain/repair" },
      { text: "그냥 지나가다 들어왔습니다.", intent: "risky/weird" },
    ],
    continueConversation: false,
  };
}

function nextStep(request: AgentStepRequest): AgentStepProposal {
  const targetActorId = request.observePacket.visibleActors[0];
  if (targetActorId) {
    return {
      toolCall: { tool: "talk_to", args: { actorId: targetActorId } },
      utterance:
        request.observePacket.heardSpeech.length > 0
          ? "네, 말씀하신 내용을 들었습니다. 주변을 살피며 필요한 일만 이어 가겠습니다."
          : "오늘 공원 일정은 예정대로 진행하겠습니다. 서로 확인할 일이 있으면 지금 말씀해 주세요.",
      rationale: "함께 도착한 주민에게 직접 말합니다.",
      done: true,
    };
  }
  return { rationale: "첫 접수 대화에는 후속 세계 행동이 없습니다.", done: true };
}

/** Fixture-only deterministic Studio conversation; never selectable from provider config. */
export function createStudioReceptionScriptedAdapter(): ScriptedNpcAdapter {
  return new ScriptedNpcAdapter({ conversation: opening, mergedTurn, nextStep });
}
