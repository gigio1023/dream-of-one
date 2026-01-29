using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// SpatialBlackboard에 저장되는 최근 사건 요약.
    /// </summary>
    [Serializable]
    public struct BlackboardEntry
    {
        public string eventId;
        public string text;
        public string actorId;
        public string topic;
        public EventCategory category;
        public int severity;
        public float delta;
        public float timestamp;
        public Vector3 position;
        public float trust;
        public string sourceId;
    }
}
