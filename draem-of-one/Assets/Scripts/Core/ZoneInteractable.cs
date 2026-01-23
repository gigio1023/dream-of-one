using DreamOfOne.UI;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Zone에서 상호작용 입력을 받아 규칙 위반 이벤트를 발행한다.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class ZoneInteractable : MonoBehaviour, IInteractable
    {
        public static event System.Action<ZoneInteractable> OnPlayerEntered;
        public static event System.Action<ZoneInteractable> OnPlayerExited;

        [SerializeField]
        [Tooltip("규칙 ID(R4, R5, R10 등)")]
        private string ruleId = "R4";

        [SerializeField]
        [Tooltip("상호작용 시 기록할 이벤트 타입")]
        private EventType eventType = EventType.ViolationDetected;

        [SerializeField]
        [Tooltip("상호작용 시 기록할 이벤트 카테고리")]
        private EventCategory eventCategory = EventCategory.Rule;

        [SerializeField]
        [Tooltip("상호작용 프롬프트")]
        private string promptText = "E: Interact";

        [SerializeField]
        [Tooltip("이벤트를 기록할 WEL")]
        private WorldEventLog eventLog = null;

        [SerializeField]
        [Tooltip("Zone 스크립트 참조")]
        private Zone zone = null;

        [SerializeField]
        [Tooltip("UI 프롬프트 표시용 UIManager")]
        private UIManager uiManager = null;

        [SerializeField]
        [Tooltip("연속 상호작용 방지 쿨다운")]
        private float interactionCooldownSeconds = 0.5f;

        [SerializeField]
        [Tooltip("토스트 심각도")]
        private int severity = 2;

        [SerializeField]
        [Tooltip("기록할 note 텍스트")]
        private string note = "interact";

        [SerializeField]
        [Tooltip("placeId 오버라이드")]
        private string placeIdOverride = string.Empty;

        [SerializeField]
        [Tooltip("topic 오버라이드")]
        private string topicOverride = string.Empty;

        private float lastInteractTime = -999f;
        private bool playerInside = false;
        private string lastActorId = "Player";
        private string lastActorRole = "Player";

        public string PromptText => promptText;
        public string RuleId => ruleId;
        public string ZoneId => zone != null ? zone.ZoneId : string.Empty;

        private void Awake()
        {
            if (zone == null)
            {
                zone = GetComponent<Zone>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag("Player"))
            {
                return;
            }

            playerInside = true;
            lastActorId = other.gameObject.name;
            lastActorRole = "Player";
            uiManager?.ShowPrompt(GetPrompt(new InteractContext(lastActorId, lastActorRole, other.transform.position)));
            OnPlayerEntered?.Invoke(this);
        }

        private void OnTriggerExit(Collider other)
        {
            if (!other.CompareTag("Player"))
            {
                return;
            }

            playerInside = false;
            uiManager?.HidePrompt();
            OnPlayerExited?.Invoke(this);
        }

        public void TryInteract(string actorId, string actorRole)
        {
            var context = new InteractContext(actorId, actorRole, transform.position);
            if (!CanInteract(context))
            {
                return;
            }

            Interact(context);
        }

        private void EmitViolation()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (eventLog == null)
            {
                return;
            }

            string placeId = !string.IsNullOrEmpty(placeIdOverride) ? placeIdOverride : ZoneId;
            string topic = !string.IsNullOrEmpty(topicOverride) ? topicOverride : (!string.IsNullOrEmpty(ruleId) ? ruleId : placeId);

            var record = new EventRecord
            {
                actorId = lastActorId,
                actorRole = lastActorRole,
                eventType = eventType,
                category = eventCategory,
                ruleId = ruleId,
                zoneId = ZoneId,
                placeId = placeId,
                topic = topic,
                severity = severity,
                note = note,
                position = transform.position
            };

            eventLog.RecordEvent(record);
        }

        public void Configure(WorldEventLog log, Zone zoneRef, UIManager ui, string ruleOverride = null, string promptOverride = null)
        {
            eventLog = log;
            zone = zoneRef;
            uiManager = ui;

            if (!string.IsNullOrEmpty(ruleOverride))
            {
                ruleId = ruleOverride;
            }

            if (!string.IsNullOrEmpty(promptOverride))
            {
                promptText = promptOverride;
            }
        }

        public void ConfigureEvent(EventType type, EventCategory category, string noteOverride, int severityOverride, string topicOverrideValue, string placeOverrideValue)
        {
            eventType = type;
            eventCategory = category;
            note = noteOverride;
            severity = severityOverride;
            topicOverride = topicOverrideValue;
            placeIdOverride = placeOverrideValue;
        }

        public string GetPrompt(InteractContext context)
        {
            return promptText;
        }

        public bool CanInteract(InteractContext context)
        {
            if (!playerInside)
            {
                return false;
            }

            float now = Time.time;
            return now - lastInteractTime >= interactionCooldownSeconds;
        }

        public void Interact(InteractContext context)
        {
            lastInteractTime = Time.time;
            lastActorId = string.IsNullOrEmpty(context.ActorId) ? lastActorId : context.ActorId;
            lastActorRole = string.IsNullOrEmpty(context.ActorRole) ? lastActorRole : context.ActorRole;

            EmitViolation();
        }

        public string GetWorldStateSummary()
        {
            return $"Zone:{ZoneId} Rule:{ruleId}";
        }
    }
}
