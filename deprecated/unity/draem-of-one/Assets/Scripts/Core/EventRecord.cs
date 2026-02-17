using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 이벤트 한 건을 구성하는 데이터 구조.
    /// 모든 시스템이 같은 포맷을 참조하도록 단순한 직렬화 형태로 둔다.
    /// </summary>
    [Serializable]
    public sealed class EventRecord
    {
        /// <summary>고유 이벤트 ID. 기본은 GUID 문자열.</summary>
        public string id = string.Empty;

        /// <summary>Unity Time 기준 발생 시각.</summary>
        public float stamp = 0f;

        /// <summary>이벤트 종류.</summary>
        public EventType eventType = EventType.EnteredZone;

        /// <summary>이벤트 카테고리(로그/필터용).</summary>
        public EventCategory category = EventCategory.Zone;

        /// <summary>행위자 식별자(Player, NPC ID 등).</summary>
        public string actorId = string.Empty;

        /// <summary>행위자의 역할(Police, Citizen 등) 표기.</summary>
        public string actorRole = string.Empty;

        /// <summary>대상 식별자(신고/판정 대상 등).</summary>
        public string targetId = string.Empty;

        /// <summary>Zone 관련 이벤트라면 Zone 식별자.</summary>
        public string zoneId = string.Empty;

        /// <summary>사건이 발생한 장소/노드 식별자.</summary>
        public string placeId = string.Empty;

        /// <summary>사건 주제(규칙/업무/가십 토픽 등).</summary>
        public string topic = string.Empty;

        /// <summary>사건이 발생한 위치.</summary>
        public Vector3 position = Vector3.zero;

        /// <summary>가십/증거 신뢰도(0~1).</summary>
        public float trust = 0f;

        /// <summary>출처(가십 원문/증거 생성자 등).</summary>
        public string sourceId = string.Empty;

        /// <summary>표준 payload(규칙/수치/추가 노트).</summary>
        public EventPayload payload = new();

        /// <summary>심각도(0~3). 토스트/우선순위에 사용.</summary>
        public int severity = 0;

        /// <summary>규칙 ID 단축 접근자.</summary>
        public string ruleId
        {
            get => payload.ruleId;
            set => payload.ruleId = value;
        }

        /// <summary>delta 단축 접근자.</summary>
        public float delta
        {
            get => payload.delta;
            set => payload.delta = value;
        }

        /// <summary>note 단축 접근자.</summary>
        public string note
        {
            get => payload.note;
            set => payload.note = value;
        }

        /// <summary>기존 timestamp 이름 호환.</summary>
        public float timestamp
        {
            get => stamp;
            set => stamp = value;
        }
    }

    [Serializable]
    public struct EventPayload
    {
        public string ruleId;
        public float delta;
        public string note;
    }
}
