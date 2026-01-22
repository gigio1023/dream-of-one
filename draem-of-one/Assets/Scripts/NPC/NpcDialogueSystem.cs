using System.Collections.Generic;
using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
using DreamOfOne.LLM;
using DreamOfOne.UI;
using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 월드 이벤트를 받아 NPC 역할에 맞는 한 줄 대사를 생성한다.
    /// </summary>
    public sealed class NpcDialogueSystem : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("이벤트 소스")]
        private WorldEventLog eventLog = null;

        [SerializeField]
        [Tooltip("LLM 클라이언트")]
        private LLMClient llmClient = null;

        [SerializeField]
        [Tooltip("UI 매니저(토스트 출력용)")]
        private UIManager uiManager = null;

        [SerializeField]
        [Tooltip("SemanticShaper 요약을 상황으로 사용")]
        private SemanticShaper semanticShaper = null;

        [SerializeField]
        [Tooltip("전역 발화 쿨다운(초)")]
        private float globalCooldownSeconds = 3f;

        [SerializeField]
        [Tooltip("한 줄 최대 글자 수")]
        private int maxChars = 80;

        [SerializeField]
        [Tooltip("발화 로그를 WEL에 기록")]
        private bool logUtterance = true;

        [SerializeField]
        [Tooltip("UI 토스트 표시")]
        private bool showToast = true;

        private readonly List<NpcPersona> personas = new();
        private readonly Dictionary<string, Zone> zoneLookup = new();
        private float lastGlobalLineTime = -999f;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (llmClient == null)
            {
                llmClient = FindFirstObjectByType<LLMClient>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }

            if (semanticShaper == null)
            {
                semanticShaper = FindFirstObjectByType<SemanticShaper>();
            }

            CachePersonas();
            CacheZones();
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

        private void CachePersonas()
        {
            personas.Clear();
            personas.AddRange(FindObjectsByType<NpcPersona>(FindObjectsInactive.Include, FindObjectsSortMode.None));
        }

        private void CacheZones()
        {
            zoneLookup.Clear();
            foreach (var zone in FindObjectsByType<Zone>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (zone != null && !string.IsNullOrEmpty(zone.ZoneId))
                {
                    zoneLookup[zone.ZoneId] = zone;
                }
            }
        }

        private void HandleEvent(EventRecord record)
        {
            if (record.eventType == CoreEventType.NpcUtterance)
            {
                return;
            }

            if (!ShouldReact(record))
            {
                return;
            }

            if (llmClient == null)
            {
                return;
            }

            if (Time.time - lastGlobalLineTime < globalCooldownSeconds)
            {
                return;
            }

            var speaker = ResolveSpeaker(record);
            if (speaker == null)
            {
                return;
            }

            if (!speaker.CanSpeak(Time.time))
            {
                return;
            }

            lastGlobalLineTime = Time.time;
            speaker.MarkSpoke(Time.time);

            var request = new LLMClient.LineRequest
            {
                role = speaker.Role,
                persona = speaker.Persona,
                situation = BuildSituation(record),
                tone = speaker.Tone,
                constraints = "한 줄, 60자 이내"
            };

            llmClient.RequestLine(request, line =>
            {
                if (string.IsNullOrEmpty(line))
                {
                    line = BuildSituation(record);
                }

                string sanitized = DialogueLineLimiter.ClampLine(line, maxChars);
                if (string.IsNullOrEmpty(sanitized))
                {
                    return;
                }

                if (showToast && uiManager != null)
                {
                    uiManager.ShowToast($"{speaker.NpcId}: {sanitized}");
                }

                if (logUtterance && eventLog != null)
                {
                    eventLog.RecordEvent(new EventRecord
                    {
                        actorId = speaker.NpcId,
                        actorRole = speaker.Role,
                        eventType = CoreEventType.NpcUtterance,
                        category = EventCategory.Dialogue,
                        note = sanitized,
                        severity = 1,
                        position = speaker.transform.position,
                        topic = "Dialogue"
                    });
                }
            });
        }

        private bool ShouldReact(EventRecord record)
        {
            return record.eventType switch
            {
                CoreEventType.ViolationDetected => true,
                CoreEventType.SuspicionUpdated => record.severity >= 2,
                CoreEventType.ReportFiled => true,
                CoreEventType.InterrogationStarted => true,
                CoreEventType.VerdictGiven => true,
                CoreEventType.RumorShared => true,
                CoreEventType.RumorConfirmed => true,
                CoreEventType.RumorDebunked => true,
                CoreEventType.EvidenceCaptured => true,
                CoreEventType.CctvCaptured => true,
                CoreEventType.TicketIssued => true,
                _ => false
            };
        }

        private NpcPersona ResolveSpeaker(EventRecord record)
        {
            if (personas.Count == 0)
            {
                return null;
            }

            if (record.eventType is CoreEventType.InterrogationStarted or CoreEventType.VerdictGiven)
            {
                var bystander = FindNonPolice();
                if (bystander != null)
                {
                    return bystander;
                }

                return FindByRole("Police");
            }

            if (!string.IsNullOrEmpty(record.actorId))
            {
                var byId = FindById(record.actorId);
                if (byId != null)
                {
                    return byId;
                }
            }

            if (!string.IsNullOrEmpty(record.zoneId) && zoneLookup.TryGetValue(record.zoneId, out var zone))
            {
                return FindNearest(zone.transform.position);
            }

            return personas[0];
        }

        private NpcPersona FindById(string npcId)
        {
            for (int i = 0; i < personas.Count; i++)
            {
                if (personas[i] != null && personas[i].NpcId == npcId)
                {
                    return personas[i];
                }
            }

            return null;
        }

        private NpcPersona FindByRole(string role)
        {
            for (int i = 0; i < personas.Count; i++)
            {
                if (personas[i] != null && personas[i].Role == role)
                {
                    return personas[i];
                }
            }

            return personas[0];
        }

        private NpcPersona FindNonPolice()
        {
            for (int i = 0; i < personas.Count; i++)
            {
                var persona = personas[i];
                if (persona != null && persona.Role != "경찰" && persona.Role != "Police")
                {
                    return persona;
                }
            }

            return null;
        }

        private NpcPersona FindNearest(Vector3 position)
        {
            NpcPersona best = null;
            float bestDist = float.MaxValue;

            for (int i = 0; i < personas.Count; i++)
            {
                var persona = personas[i];
                if (persona == null)
                {
                    continue;
                }

                float dist = Vector3.Distance(position, persona.transform.position);
                if (dist < bestDist)
                {
                    bestDist = dist;
                    best = persona;
                }
            }

            return best ?? personas[0];
        }

        private string BuildSituation(EventRecord record)
        {
            if (semanticShaper != null)
            {
                return semanticShaper.ToText(record);
            }

            return record.eventType.ToString();
        }
    }
}
