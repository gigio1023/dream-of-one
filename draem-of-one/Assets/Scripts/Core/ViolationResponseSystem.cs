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
        [Tooltip("거리 감쇠 적용 여부")]
        private bool useDistanceFalloff = false;

        [SerializeField]
        [Tooltip("감쇠 기준 거리")]
        private float maxDistance = 8f;

        [SerializeField]
        [Tooltip("규칙별 의심 증가량")]
        private List<RuleDelta> ruleDeltas = new();

        [SerializeField]
        [Tooltip("의심을 갱신할 NPC 리스트")]
        private List<SuspicionComponent> witnesses = new();

        private readonly Dictionary<string, float> ruleDeltaLookup = new();
        private readonly Dictionary<string, Transform> zoneLookup = new();

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
            float delta = GetDelta(record.ruleId);
            if (delta <= 0f)
            {
                return;
            }

            float factor = 1f;
            if (useDistanceFalloff)
            {
                factor = GetDistanceFactor(record.zoneId);
            }

            float appliedDelta = delta * factor;
            for (int i = 0; i < witnesses.Count; i++)
            {
                var witness = witnesses[i];
                if (witness == null)
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

        private float GetDistanceFactor(string zoneId)
        {
            if (string.IsNullOrEmpty(zoneId) || !zoneLookup.TryGetValue(zoneId, out var zoneTransform))
            {
                return 1f;
            }

            float closest = float.MaxValue;
            for (int i = 0; i < witnesses.Count; i++)
            {
                var witness = witnesses[i];
                if (witness == null)
                {
                    continue;
                }

                float dist = Vector3.Distance(witness.transform.position, zoneTransform.position);
                if (dist < closest)
                {
                    closest = dist;
                }
            }

            if (closest == float.MaxValue)
            {
                return 1f;
            }

            return Mathf.Clamp01(1f - Mathf.InverseLerp(0f, maxDistance, closest));
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
    }
}
