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
    citedRecordIds: [],
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
      openQuestion: {
        status: "resolved",
        text: "방문 목적은 접수 절차와 맞는가?",
        whyLine: "방문 목적을 분명히 설명해 의문이 해소되었습니다.",
      },
      utterance: "방문 목적을 확인했습니다. 접수 내용을 정리해 두겠습니다.",
      citedRecordIds: [],
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
      openQuestion: {
        status: "open",
        text: "이 방문자는 왜 마을 절차를 전혀 모르는가?",
        whyLine: "외부인이라고 밝힌 진술의 경위를 더 확인해야 합니다.",
      },
      utterance: "그렇다면 방문 경위를 더 확인해야겠습니다.",
      citedRecordIds: [],
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
    openQuestion: {
      status: "open",
      text: "접수 목적은 무엇인가?",
      whyLine: "방문 목적이 아직 분명하지 않습니다.",
    },
    utterance: "알겠습니다. 지금 확인할 수 있는 내용부터 정리하겠습니다.",
    citedRecordIds: [],
    suggestedReplies: [
      { text: "제가 아는 내용을 말씀드리겠습니다.", intent: "safe/local" },
      { text: "필요한 질문을 해 주세요.", intent: "uncertain/repair" },
      { text: "그냥 지나가다 들어왔습니다.", intent: "risky/weird" },
    ],
    continueConversation: false,
  };
}

function nextStep(request: AgentStepRequest): AgentStepProposal {
  if (request.previousResult?.reason === "already_read") {
    return { rationale: "이미 읽은 기록을 반복하지 않습니다.", done: true };
  }
  if (request.observePacket.playerContact?.available) {
    return {
      toolCall: { tool: "move_to", args: { targetId: "player" } },
      rationale: "현재 역할과 기억을 바탕으로 방문자에게 직접 확인할 필요가 있습니다.",
      done: true,
    };
  }
  const visibleRecord = request.observePacket.visibleRecords[0];
  if (visibleRecord && request.observePacket.role === "studio_manager") {
    return {
      toolCall: {
        tool: "read_record",
        args: {
          recordId: visibleRecord.recordId,
          whyLine: "관리자가 접수 기록의 출처와 내용을 직접 확인했습니다.",
          institutionalPressureDelta: 10,
          openQuestion: {
            status: "open",
            text: "관리자가 확인한 방문 경위는 누구에게 다시 물어야 하는가?",
            whyLine: "관리자가 기록을 읽고 추가 확인 대상을 정해야 한다고 판단했습니다.",
          },
        },
      },
      rationale: "보이는 접수 기록을 직접 읽어 사실 기억으로 남깁니다.",
      done: true,
    };
  }
  const pressureSource = request.observePacket.administrativeSources.find(
    source => source.reportDelta > 0,
  );
  const textSurfaceId = request.observePacket.administrativeAuthority.writableTextSurfaceIds[0];
  if (
    pressureSource &&
    textSurfaceId &&
    request.observePacket.administrativeAuthority.allowedRecordKinds.includes("note")
  ) {
    return {
      toolCall: {
        tool: "write_record",
        args: {
          recordKind: "note",
          sourceMemoryId: pressureSource.memoryId,
          stateBody: "방문자가 마을 절차를 모른다고 밝혀 방문 경위를 추가 확인해야 함.",
          whyLine: "접수 담당자가 직접 들은 진술을 확인 기록으로 남겼습니다.",
          institutionalPressureDelta: pressureSource.reportDelta,
          textSurfaceId,
          openQuestion: {
            status: "open",
            text: "접수 기록에 남은 방문 경위는 무엇인가?",
            whyLine: "접수 담당자의 기록이 방문 경위에 관한 구체적인 의문을 남겼습니다.",
          },
        },
      },
      utterance: "이 진술은 접수 확인 기록으로 남겨 두겠습니다.",
      citedRecordIds: [],
      rationale: "직접 들은 의심 진술을 권한 안에서 기록합니다.",
      done: true,
    };
  }
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
