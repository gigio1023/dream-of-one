using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// NPC 증언(Statement/Explanation/Rebuttal)을 플레이어 상호작용으로 기록한다.
    /// </summary>
    public sealed class NpcWitnessStatement : MonoBehaviour, IInteractable
    {
        [SerializeField]
        private string promptText = "E: 증언 요청";

        [SerializeField]
        private float interactionCooldownSeconds = 8f;

        [SerializeField]
        private float maxInteractDistance = 2.4f;

        [SerializeField]
        private int maxStatementChars = 90;

        private readonly List<Zone> zones = new();
        private float lastInteractTime = -999f;
        private NpcPersona persona = null;
        private NpcContext context = null;
        private WorldEventLog eventLog = null;

        private void Awake()
        {
            persona = GetComponent<NpcPersona>();
            context = GetComponent<NpcContext>();
            eventLog = FindFirstObjectByType<WorldEventLog>();
            CacheZones();
        }

        public string GetPrompt(InteractContext context)
        {
            return promptText;
        }

        public bool CanInteract(InteractContext context)
        {
            if (eventLog == null)
            {
                return false;
            }

            if (Time.time - lastInteractTime < interactionCooldownSeconds)
            {
                return false;
            }

            return IsWithinRange(context);
        }

        public void Interact(InteractContext context)
        {
            if (!CanInteract(context))
            {
                return;
            }

            lastInteractTime = Time.time;

            BlackboardEntry entry = default;
            bool hasEntry = this.context != null && this.context.TryGetLatestEntry(out entry);
            var roleId = persona != null ? persona.RoleId : RoleId.Citizen;
            string roleName = persona != null ? persona.Role : "Citizen";

            CoreEventType eventType = ResolveStatementType(hasEntry, entry);
            string note = BuildStatementNote(hasEntry, entry, roleName, roleId);
            string zoneId = ResolveZoneId();
            string placeId = string.IsNullOrEmpty(zoneId) ? ResolvePlaceId(roleId) : string.Empty;

            var record = new EventRecord
            {
                actorId = persona != null ? persona.NpcId : name,
                actorRole = roleName,
                eventType = eventType,
                note = note,
                topic = hasEntry ? entry.topic : string.Empty,
                zoneId = zoneId,
                placeId = placeId,
                position = transform.position,
                severity = hasEntry ? Mathf.Clamp(entry.severity, 0, 3) : 1,
                trust = hasEntry ? entry.trust : 0.5f,
                sourceId = hasEntry ? entry.sourceId : string.Empty
            };

            eventLog.RecordEvent(record);
        }

        public string GetWorldStateSummary()
        {
            string roleName = persona != null ? persona.Role : "Witness";
            return $"Witness:{roleName}";
        }

        private void CacheZones()
        {
            zones.Clear();
            zones.AddRange(FindObjectsByType<Zone>(FindObjectsInactive.Include, FindObjectsSortMode.None));
        }

        private bool IsWithinRange(InteractContext context)
        {
            if (maxInteractDistance <= 0f)
            {
                return true;
            }

            float sqr = (context.ActorPosition - transform.position).sqrMagnitude;
            return sqr <= maxInteractDistance * maxInteractDistance;
        }

        private string ResolveZoneId()
        {
            if (zones.Count == 0)
            {
                CacheZones();
            }

            if (zones.Count == 0)
            {
                return string.Empty;
            }

            Zone closest = null;
            float closestDist = float.MaxValue;
            Vector3 pos = transform.position;
            for (int i = 0; i < zones.Count; i++)
            {
                var zone = zones[i];
                if (zone == null)
                {
                    continue;
                }

                float dist = Vector3.Distance(pos, zone.transform.position);
                if (dist < closestDist)
                {
                    closestDist = dist;
                    closest = zone;
                }
            }

            return closest != null ? closest.ZoneId : string.Empty;
        }

        private static string ResolvePlaceId(RoleId roleId)
        {
            return roleId switch
            {
                RoleId.Clerk or RoleId.Manager => "Store",
                RoleId.PM or RoleId.Developer or RoleId.QA or RoleId.Release => "Studio",
                RoleId.Elder or RoleId.Caretaker => "Park",
                RoleId.Police or RoleId.Officer or RoleId.Investigator => "Station",
                RoleId.Barista or RoleId.CafeHost => "Cafe",
                RoleId.Reporter => "Media",
                _ => string.Empty
            };
        }

        private CoreEventType ResolveStatementType(bool hasEntry, BlackboardEntry entry)
        {
            if (!hasEntry)
            {
                return CoreEventType.StatementGiven;
            }

            return entry.category switch
            {
                EventCategory.Procedure => CoreEventType.ExplanationGiven,
                EventCategory.Gossip => CoreEventType.RebuttalGiven,
                _ => CoreEventType.StatementGiven
            };
        }

        private string BuildStatementNote(bool hasEntry, BlackboardEntry entry, string roleName, RoleId roleId)
        {
            if (hasEntry && !string.IsNullOrEmpty(entry.text))
            {
                return DialogueLineLimiter.ClampLine(entry.text, maxStatementChars);
            }

            string fallback = roleId switch
            {
                RoleId.Manager => "매장 상황은 평소와 크게 다르지 않습니다.",
                RoleId.QA => "최근 테스트에서 특이 로그는 없었습니다.",
                RoleId.PM => "현재 절차는 정상 진행 중입니다.",
                RoleId.Elder => "공원 쪽은 조용합니다.",
                RoleId.Caretaker => "시설 점검 결과 이상 없습니다.",
                RoleId.Officer or RoleId.Police => "현재 보고받은 내용은 없습니다.",
                _ => $"{roleName}의 증언을 확보했다."
            };

            return DialogueLineLimiter.ClampLine(fallback, maxStatementChars);
        }
    }
}
