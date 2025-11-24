using System;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 이벤트 한 건을 구성하는 데이터 구조.
    /// 모든 시스템이 같은 포맷을 참조하도록 단순한 직렬화 형태로 둔다.
    /// </summary>
    [Serializable]
    public sealed class EventRecord
    {
        /// <summary>Unity Time 기준 발생 시각.</summary>
        public float timestamp;
        /// <summary>행위자 식별자(Player, NPC ID 등).</summary>
        public string actorId = string.Empty;
        /// <summary>행위자의 역할(Police, Citizen 등) 표기.</summary>
        public string actorRole = string.Empty;
        /// <summary>이벤트 종류.</summary>
        public EventType eventType = EventType.EnteredZone;
        /// <summary>관련 규칙 ID(R4, R5, R10 등).</summary>
        public string ruleId = string.Empty;
        /// <summary>Zone 관련 이벤트라면 Zone 식별자.</summary>
        public string zoneId = string.Empty;
        /// <summary>추가 설명 또는 수치.</summary>
        public string note = string.Empty;
    }
}


