using System;
using System.Collections.Generic;
using DreamOfOne.NPC;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 규칙 위반 이벤트를 받아 목격자들의 의심 수치를 갱신한다.
    /// </summary>
    public sealed class ViolationResponseSystem : MonoBehaviour
    {
        [System.Serializable]
        private struct RuleDelta
        {
            public string ruleId;
            public float delta;
        }

        [SerializeField]
        [Tooltip("이벤트를 구독할 WEL")]
        private WorldEventLog eventLog = null;

        [SerializeField]
        [Tooltip("기본 의심 증가량")]
        private float defaultSuspicionDelta = 20f;

        [SerializeField]
        [Tooltip("규칙 위반 반응 전역 배율(기본값)")]
        private float baseDeltaMultiplier = 1f;

        [SerializeField]
        [Tooltip("거리 감쇠 적용 여부")]
        private bool useDistanceFalloff = false;

        [SerializeField]
        [Tooltip("감쇠 기준 거리")]
        private float maxDistance = 8f;

        [SerializeField]
        [Tooltip("거리 기반 목격자 스코프를 적용한다.")]
        private bool scopeWitnessesByDistance = true;

        [SerializeField]
        [Tooltip("위반 이벤트를 인지하는 목격 반경(미터)")]
        private float witnessRadius = 9f;

        [SerializeField]
        [Tooltip("위반 1건에 반응할 최대 목격자 수 (0 이하 = 제한 없음)")]
        private int maxWitnessesPerViolation = 3;

        [SerializeField]
        [Tooltip("event.actorId와 동일한 NPC는 거리 밖이어도 포함한다.")]
        private bool includeActorWitness = true;

        [SerializeField]
        [Tooltip("규칙별 의심 증가량")]
        private List<RuleDelta> ruleDeltas = new();

        [SerializeField]
        [Tooltip("의심을 갱신할 NPC 리스트")]
        private List<SuspicionComponent> witnesses = new();

        private readonly Dictionary<string, float> ruleDeltaLookup = new();
        private readonly Dictionary<string, Transform> zoneLookup = new();
        private readonly Dictionary<string, SuspicionComponent> witnessLookup = new(StringComparer.OrdinalIgnoreCase);
        private readonly List<SuspicionComponent> witnessBuffer = new();
        private float runtimeDeltaMultiplier = 1f;

        private void Awake()
        {
            BuildLookup();
            CacheZones();
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (witnesses.Count == 0)
            {
                witnesses.AddRange(FindObjectsByType<SuspicionComponent>(FindObjectsInactive.Include, FindObjectsSortMode.None));
            }

            RebuildWitnessLookup();
        }

        private void OnEnable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void OnDisable()
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }
        }

        private void HandleEvent(EventRecord record)
        {
            if (record.eventType != EventType.ViolationDetected)
            {
                return;
            }

            HandleViolation(record);
        }

        public void HandleViolation(EventRecord record)
        {
            float delta = GetDelta(record.ruleId) * Mathf.Max(0f, baseDeltaMultiplier) * Mathf.Max(0f, runtimeDeltaMultiplier);
            if (delta <= 0f)
            {
                return;
            }

            bool hasEventPosition = TryResolveEventPosition(record.position, record.zoneId, out var eventPosition);
            var targets = ResolveTargets(record.actorId, hasEventPosition, eventPosition);
            if (targets.Count == 0)
            {
                return;
            }

            for (int i = 0; i < targets.Count; i++)
            {
                var witness = targets[i];
                if (witness == null)
                {
                    continue;
                }

                float factor = useDistanceFalloff
                    ? GetDistanceFactor(witness.transform.position, hasEventPosition, eventPosition)
                    : 1f;
                float appliedDelta = delta * factor;
                if (appliedDelta <= 0f)
                {
                    continue;
                }

                witness.AddSuspicion(appliedDelta, record.ruleId, record.id);
            }
        }

        private float GetDelta(string ruleId)
        {
            if (!string.IsNullOrEmpty(ruleId) && ruleDeltaLookup.TryGetValue(ruleId, out float delta))
            {
                return delta;
            }

            return defaultSuspicionDelta;
        }

        private float GetDistanceFactor(Vector3 witnessPosition, bool hasEventPosition, Vector3 eventPosition)
        {
            if (!hasEventPosition || maxDistance <= 0f)
            {
                return 1f;
            }

            float dist = Vector3.Distance(witnessPosition, eventPosition);
            return Mathf.Clamp01(1f - Mathf.InverseLerp(0f, maxDistance, dist));
        }

        private void BuildLookup()
        {
            ruleDeltaLookup.Clear();
            for (int i = 0; i < ruleDeltas.Count; i++)
            {
                var entry = ruleDeltas[i];
                if (string.IsNullOrEmpty(entry.ruleId))
                {
                    continue;
                }

                ruleDeltaLookup[entry.ruleId] = entry.delta;
            }
        }

        private void CacheZones()
        {
            zoneLookup.Clear();
            foreach (var zone in FindObjectsByType<Zone>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (zone == null || string.IsNullOrEmpty(zone.ZoneId))
                {
                    continue;
                }

                zoneLookup[zone.ZoneId] = zone.transform;
            }
        }

        public void RegisterWitness(SuspicionComponent component)
        {
            if (component != null && !witnesses.Contains(component))
            {
                witnesses.Add(component);
                string npcId = component.NpcId;
                if (!string.IsNullOrEmpty(npcId))
                {
                    witnessLookup[npcId] = component;
                }
            }
        }

        public void ConfigureRuleDelta(string ruleId, float delta)
        {
            if (string.IsNullOrEmpty(ruleId))
            {
                return;
            }

            ruleDeltaLookup[ruleId] = delta;
        }

        public void SetRuntimeDeltaMultiplier(float multiplier)
        {
            runtimeDeltaMultiplier = Mathf.Max(0f, multiplier);
        }

        public float CurrentDeltaMultiplier => Mathf.Max(0f, baseDeltaMultiplier) * Mathf.Max(0f, runtimeDeltaMultiplier);

        public void Configure(WorldEventLog log)
        {
            if (eventLog != null)
            {
                eventLog.OnEventRecorded -= HandleEvent;
            }

            eventLog = log;

            if (isActiveAndEnabled && eventLog != null)
            {
                eventLog.OnEventRecorded += HandleEvent;
            }
        }

        private void RebuildWitnessLookup()
        {
            witnessLookup.Clear();
            for (int i = 0; i < witnesses.Count; i++)
            {
                var witness = witnesses[i];
                if (witness == null)
                {
                    continue;
                }

                string npcId = witness.NpcId;
                if (!string.IsNullOrEmpty(npcId) && !witnessLookup.ContainsKey(npcId))
                {
                    witnessLookup.Add(npcId, witness);
                }
            }
        }

        private bool TryResolveEventPosition(Vector3 recordPosition, string zoneId, out Vector3 eventPosition)
        {
            if (recordPosition != Vector3.zero)
            {
                eventPosition = recordPosition;
                return true;
            }

            if (!string.IsNullOrEmpty(zoneId) && zoneLookup.TryGetValue(zoneId, out var zoneTransform))
            {
                eventPosition = zoneTransform.position;
                return true;
            }

            eventPosition = Vector3.zero;
            return false;
        }

        private List<SuspicionComponent> ResolveTargets(string actorId, bool hasEventPosition, Vector3 eventPosition)
        {
            witnessBuffer.Clear();

            for (int i = 0; i < witnesses.Count; i++)
            {
                var witness = witnesses[i];
                if (witness == null)
                {
                    continue;
                }

                if (scopeWitnessesByDistance && hasEventPosition && witnessRadius > 0f)
                {
                    float distance = Vector3.Distance(witness.transform.position, eventPosition);
                    if (distance > witnessRadius)
                    {
                        continue;
                    }
                }

                witnessBuffer.Add(witness);
            }

            if (includeActorWitness && !string.IsNullOrEmpty(actorId) && witnessLookup.TryGetValue(actorId, out var actorWitness))
            {
                if (actorWitness != null && !witnessBuffer.Contains(actorWitness))
                {
                    witnessBuffer.Add(actorWitness);
                }
            }

            if (witnessBuffer.Count == 0 && hasEventPosition)
            {
                var nearest = FindNearestWitness(eventPosition);
                if (nearest != null)
                {
                    witnessBuffer.Add(nearest);
                }
            }

            witnessBuffer.Sort((a, b) => CompareWitness(a, b, actorId, hasEventPosition, eventPosition));

            if (maxWitnessesPerViolation > 0 && witnessBuffer.Count > maxWitnessesPerViolation)
            {
                witnessBuffer.RemoveRange(maxWitnessesPerViolation, witnessBuffer.Count - maxWitnessesPerViolation);
            }

            return witnessBuffer;
        }

        private SuspicionComponent FindNearestWitness(Vector3 eventPosition)
        {
            SuspicionComponent nearest = null;
            float nearestDistance = float.MaxValue;
            for (int i = 0; i < witnesses.Count; i++)
            {
                var witness = witnesses[i];
                if (witness == null)
                {
                    continue;
                }

                float distance = Vector3.Distance(witness.transform.position, eventPosition);
                if (distance < nearestDistance)
                {
                    nearestDistance = distance;
                    nearest = witness;
                }
            }

            return nearest;
        }

        private static int CompareWitness(SuspicionComponent a, SuspicionComponent b, string actorId, bool hasEventPosition, Vector3 eventPosition)
        {
            bool aIsActor = !string.IsNullOrEmpty(actorId) && string.Equals(a.NpcId, actorId, StringComparison.OrdinalIgnoreCase);
            bool bIsActor = !string.IsNullOrEmpty(actorId) && string.Equals(b.NpcId, actorId, StringComparison.OrdinalIgnoreCase);
            if (aIsActor != bIsActor)
            {
                return aIsActor ? -1 : 1;
            }

            if (hasEventPosition)
            {
                float ad = Vector3.Distance(a.transform.position, eventPosition);
                float bd = Vector3.Distance(b.transform.position, eventPosition);
                int distanceCompare = ad.CompareTo(bd);
                if (distanceCompare != 0)
                {
                    return distanceCompare;
                }
            }

            return string.CompareOrdinal(a.NpcId, b.NpcId);
        }
    }
}
