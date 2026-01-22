using DreamOfOne.UI;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// WorldEventLog를 감시하여 신규 이벤트를 UI 로그로 전달한다.
    /// UIManager의 책임을 표현 영역으로 한정하기 위한 브릿지 역할이다.
    /// </summary>
    public sealed class EventLogPresenter : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private SemanticShaper semanticShaper = null;

        [SerializeField]
        private UIManager uiManager = null;

        [SerializeField]
        [Tooltip("프레임당 처리할 최대 이벤트 수")]
        private int maxEventsPerFrame = 2;

        [SerializeField]
        [Tooltip("LLM 기반 시민 반응 표시")]
        private bool useLlmNarration = true;

        [SerializeField]
        [Tooltip("NPC 대화 시스템이 있으면 LLM 내레이션을 비활성화")]
        private bool suppressWhenDialogueSystemPresent = true;

        [SerializeField]
        [Tooltip("LLM 대사 최소 간격(초)")]
        private float llmCooldownSeconds = 4f;

        [SerializeField]
        private DreamOfOne.LLM.LLMClient llmClient = null;

        private DreamOfOne.NPC.NpcDialogueSystem npcDialogueSystem = null;

        /// <summary>
        /// WorldEventLog의 총 발행 카운터를 기억해 버퍼 회전 후에도 신규 이벤트를 감지한다.
        /// </summary>
        private int lastProcessedTotal = 0;
        private float lastLlmTime = -999f;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (semanticShaper == null)
            {
                semanticShaper = FindFirstObjectByType<SemanticShaper>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }

            if (llmClient == null)
            {
                llmClient = FindFirstObjectByType<DreamOfOne.LLM.LLMClient>();
            }

            if (npcDialogueSystem == null)
            {
                npcDialogueSystem = FindFirstObjectByType<DreamOfOne.NPC.NpcDialogueSystem>();
            }
        }

        public void Configure(WorldEventLog log, SemanticShaper shaper, UIManager manager)
        {
            eventLog = log;
            semanticShaper = shaper;
            uiManager = manager;
        }

        private void Update()
        {
            if (eventLog == null || uiManager == null)
            {
                return;
            }

            var events = eventLog.Events;
            int total = eventLog.TotalEvents;
            int dropped = eventLog.DroppedEvents;

            // 앞에서 드롭된 수만큼 오프셋을 줄여 현재 버퍼 인덱스를 계산한다.
            int startIndex = Mathf.Max(0, lastProcessedTotal - dropped);
            if (startIndex > events.Count)
            {
                startIndex = events.Count;
            }

            int processed = 0;
            for (int i = startIndex; i < events.Count; i++)
            {
                var record = events[i];
                string text = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
                uiManager.AddLogLine(text);

                if (record.severity >= 2 || record.eventType == EventType.VerdictGiven)
                {
                    uiManager.ShowToast(text);
                }

                TryRequestLlmLine(record);

                processed++;
                if (processed >= maxEventsPerFrame)
                {
                    break;
                }
            }

            lastProcessedTotal = Mathf.Min(total, lastProcessedTotal + processed);
        }

        private void TryRequestLlmLine(EventRecord record)
        {
            if (!useLlmNarration || llmClient == null || uiManager == null)
            {
                return;
            }

            if (suppressWhenDialogueSystemPresent && npcDialogueSystem != null)
            {
                return;
            }

            if (!ShouldNarrate(record))
            {
                return;
            }

            if (Time.time - lastLlmTime < llmCooldownSeconds)
            {
                return;
            }

            lastLlmTime = Time.time;

            var request = new DreamOfOne.LLM.LLMClient.LineRequest
            {
                role = ResolveRole(record),
                persona = ResolvePersona(record.actorId),
                situation = BuildSituation(record),
                tone = "short, natural Korean",
                constraints = "한 줄, 60자 이내"
            };

            llmClient.RequestLine(request, line =>
            {
                if (string.IsNullOrEmpty(line))
                {
                    line = semanticShaper != null ? semanticShaper.ToText(record) : record.eventType.ToString();
                }

                if (!string.IsNullOrEmpty(line))
                {
                    uiManager.ShowToast(line);
                }
            });
        }

        private static bool ShouldNarrate(EventRecord record)
        {
            return record.eventType switch
            {
                EventType.ReportFiled => true,
                EventType.SuspicionUpdated => record.severity >= 2,
                _ => false
            };
        }

        private static string ResolveRole(EventRecord record)
        {
            if (!string.IsNullOrEmpty(record.actorId))
            {
                return record.actorId;
            }

            return string.IsNullOrEmpty(record.actorRole) ? "Citizen" : record.actorRole;
        }

        private static string ResolvePersona(string actorId)
        {
            return actorId switch
            {
                "Clerk" => "편의점 점원, 친절하지만 규칙에 엄격함",
                "Manager" => "편의점 점장, 질서/재고 관리",
                "Elder" => "동네 어르신, 질서 강조, 잔소리 섞임",
                "Caretaker" => "공원 관리인, 민원 대응",
                "Tourist" => "관광객, 어눌한 한국어, 호기심 많음",
                "Resident" => "주민 대표, 규칙에 민감",
                "Student" => "학생, 빠른 반응",
                "PM" => "스튜디오 PM, 일정/승인 관리",
                "Developer" => "개발자, 기술 중심",
                "QA" => "QA, 품질/검수 집중",
                "Release" => "릴리즈 담당, 배포 절차 확인",
                "Barista" => "바리스타, 주문/좌석 안내",
                "CafeHost" => "카페 안내, 대기/정리",
                "Courier" => "배송기사, 출입/수취 확인",
                "FacilityTech" => "시설 기사, 점검/수리",
                "Reporter" => "리포터, 촬영/취재",
                "Officer" => "순경, 현장 대응",
                "Investigator" => "조사관, 증거/진술 확인",
                "Police" => "경찰, 단호하고 간결한 말투",
                _ => "동네 주민, 짧고 현실적인 반응"
            };
        }

        private static string BuildSituation(EventRecord record)
        {
            return record.eventType switch
            {
                EventType.ReportFiled => $"{record.actorId}이(가) 규칙 {record.ruleId} 위반을 신고함.",
                EventType.SuspicionUpdated => $"{record.actorId}이(가) 규칙 {record.ruleId} 위반을 목격하고 의심함.",
                _ => record.eventType.ToString()
            };
        }
    }
}
