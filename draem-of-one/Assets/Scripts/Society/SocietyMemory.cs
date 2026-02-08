using System;
using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.Society
{
    /// <summary>
    /// Layered memory store used by SocietyBrain:
    /// Identity (who I am), Episodic (what recently happened), Social (how I track actors).
    /// </summary>
    public sealed class SocietyMemory : MonoBehaviour
    {
        [Serializable]
        public sealed class IdentityMemory
        {
            public string npcId = string.Empty;
            public string role = string.Empty;
            public string organization = string.Empty;
        }

        [Serializable]
        public sealed class EpisodicMemoryEntry
        {
            public string eventId = string.Empty;
            public string actorId = string.Empty;
            public string summary = string.Empty;
            public float timestamp = 0f;
        }

        [Serializable]
        public sealed class SocialRelationEntry
        {
            public string actorId = string.Empty;
            public float trust = 0f;
            public float suspicion = 0f;
            public int interactions = 0;
            public float lastSeenAt = 0f;
            public string lastCue = string.Empty;
        }

        [SerializeField]
        [Tooltip("Max lines stored in short-term working memory.")]
        private int workingCapacity = 12;

        [SerializeField]
        [Tooltip("Max episodic events retained after compaction.")]
        private int episodicCapacity = 24;

        [SerializeField]
        [Tooltip("Max social relation records retained after compaction.")]
        private int socialCapacity = 16;

        [SerializeField]
        private IdentityMemory identity = new();

        [SerializeField]
        private List<string> workingEntries = new();

        [SerializeField]
        private List<EpisodicMemoryEntry> episodicEntries = new();

        [SerializeField]
        private List<SocialRelationEntry> socialRelations = new();

        public IReadOnlyList<string> Entries => workingEntries;
        public int WorkingCount => workingEntries.Count;
        public int EpisodicCount => episodicEntries.Count;
        public int SocialCount => socialRelations.Count;
        public int TotalCount => WorkingCount + EpisodicCount + SocialCount;

        public void ConfigureCaps(int working, int episodic, int social)
        {
            workingCapacity = Mathf.Clamp(working, 4, 64);
            episodicCapacity = Mathf.Clamp(episodic, 4, 128);
            socialCapacity = Mathf.Clamp(social, 4, 64);
            PruneAll();
        }

        public void InitializeIdentity(string npcId, string role, string organization)
        {
            identity.npcId = string.IsNullOrWhiteSpace(npcId) ? "UnknownNpc" : npcId.Trim();
            identity.role = string.IsNullOrWhiteSpace(role) ? "UnknownRole" : role.Trim();
            identity.organization = string.IsNullOrWhiteSpace(organization) ? "UnknownOrg" : organization.Trim();
        }

        public void Add(string entry)
        {
            if (string.IsNullOrWhiteSpace(entry))
            {
                return;
            }

            workingEntries.Add(entry.Trim());
            PruneWorking();
        }

        public void AddEpisodic(string summary, string eventId, string actorId, float timestamp)
        {
            if (string.IsNullOrWhiteSpace(summary))
            {
                return;
            }

            episodicEntries.Add(new EpisodicMemoryEntry
            {
                summary = summary.Trim(),
                eventId = string.IsNullOrWhiteSpace(eventId) ? "event:unknown" : eventId.Trim(),
                actorId = string.IsNullOrWhiteSpace(actorId) ? "actor:unknown" : actorId.Trim(),
                timestamp = Mathf.Max(0f, timestamp),
            });
            PruneEpisodic();
        }

        public void UpdateSocial(CoreEventType eventType, string actorId, float timestamp, string cue)
        {
            if (string.IsNullOrWhiteSpace(actorId))
            {
                return;
            }

            SocialRelationEntry relation = FindOrCreateRelation(actorId.Trim());
            relation.interactions += 1;
            relation.lastSeenAt = Mathf.Max(0f, timestamp);
            if (!string.IsNullOrWhiteSpace(cue))
            {
                relation.lastCue = cue.Trim();
            }

            (float trustDelta, float suspicionDelta) = ResolveDeltas(eventType);
            relation.trust = Mathf.Clamp(relation.trust + trustDelta, -1f, 1f);
            relation.suspicion = Mathf.Clamp01(relation.suspicion + suspicionDelta);
            PruneSocial();
        }

        public string[] BuildPromptEntries(int maxWorkingLines, int maxEpisodes, int maxRelations)
        {
            var lines = new List<string>();
            lines.Add($"ID: npc={identity.npcId}, role={identity.role}, org={identity.organization}");

            int workingTake = Mathf.Clamp(maxWorkingLines, 0, WorkingCount);
            if (workingTake > 0)
            {
                int start = Mathf.Max(0, WorkingCount - workingTake);
                for (int i = start; i < WorkingCount; i++)
                {
                    lines.Add($"WM: {workingEntries[i]}");
                }
            }

            int episodicTake = Mathf.Clamp(maxEpisodes, 0, EpisodicCount);
            if (episodicTake > 0)
            {
                int start = Mathf.Max(0, EpisodicCount - episodicTake);
                for (int i = start; i < EpisodicCount; i++)
                {
                    EpisodicMemoryEntry episode = episodicEntries[i];
                    lines.Add($"EP: {episode.summary} (actor={episode.actorId}, event={episode.eventId})");
                }
            }

            int relationTake = Mathf.Clamp(maxRelations, 0, SocialCount);
            if (relationTake > 0)
            {
                var sorted = new List<SocialRelationEntry>(socialRelations);
                sorted.Sort((a, b) =>
                {
                    int suspicionCompare = b.suspicion.CompareTo(a.suspicion);
                    if (suspicionCompare != 0)
                    {
                        return suspicionCompare;
                    }

                    int interactionCompare = b.interactions.CompareTo(a.interactions);
                    if (interactionCompare != 0)
                    {
                        return interactionCompare;
                    }

                    return b.lastSeenAt.CompareTo(a.lastSeenAt);
                });

                for (int i = 0; i < Mathf.Min(relationTake, sorted.Count); i++)
                {
                    SocialRelationEntry relation = sorted[i];
                    lines.Add(
                        $"SOC: actor={relation.actorId}, trust={relation.trust:F2}, suspicion={relation.suspicion:F2}, interactions={relation.interactions}, cue={relation.lastCue}");
                }
            }

            return lines.ToArray();
        }

        public string BuildSummary(int maxLines)
        {
            string[] promptLines = BuildPromptEntries(maxLines, maxLines, maxLines);
            if (promptLines.Length == 0)
            {
                return "None.";
            }
            return string.Join("\n", promptLines);
        }

        public string BuildMetricsSummary()
        {
            return $"working={WorkingCount}, episodic={EpisodicCount}, social={SocialCount}, total={TotalCount}";
        }

        private void PruneAll()
        {
            PruneWorking();
            PruneEpisodic();
            PruneSocial();
        }

        private void PruneWorking()
        {
            workingCapacity = Mathf.Clamp(workingCapacity, 4, 64);
            if (workingEntries.Count <= workingCapacity)
            {
                return;
            }

            workingEntries.RemoveRange(0, workingEntries.Count - workingCapacity);
        }

        private void PruneEpisodic()
        {
            episodicCapacity = Mathf.Clamp(episodicCapacity, 4, 128);
            if (episodicEntries.Count <= episodicCapacity)
            {
                return;
            }

            episodicEntries.Sort((a, b) => a.timestamp.CompareTo(b.timestamp));
            episodicEntries.RemoveRange(0, episodicEntries.Count - episodicCapacity);
        }

        private void PruneSocial()
        {
            socialCapacity = Mathf.Clamp(socialCapacity, 4, 64);
            if (socialRelations.Count <= socialCapacity)
            {
                return;
            }

            socialRelations.Sort((a, b) =>
            {
                int interactionCompare = b.interactions.CompareTo(a.interactions);
                if (interactionCompare != 0)
                {
                    return interactionCompare;
                }

                return b.lastSeenAt.CompareTo(a.lastSeenAt);
            });
            socialRelations.RemoveRange(socialCapacity, socialRelations.Count - socialCapacity);
        }

        private SocialRelationEntry FindOrCreateRelation(string actorId)
        {
            for (int i = 0; i < socialRelations.Count; i++)
            {
                if (string.Equals(socialRelations[i].actorId, actorId, StringComparison.Ordinal))
                {
                    return socialRelations[i];
                }
            }

            var created = new SocialRelationEntry
            {
                actorId = actorId,
                trust = 0f,
                suspicion = 0f,
                interactions = 0,
                lastSeenAt = 0f,
                lastCue = string.Empty,
            };
            socialRelations.Add(created);
            return created;
        }

        private static (float trustDelta, float suspicionDelta) ResolveDeltas(CoreEventType eventType)
        {
            switch (eventType)
            {
                case CoreEventType.TaskCompleted:
                case CoreEventType.ApprovalGranted:
                    return (0.15f, -0.05f);
                case CoreEventType.NpcUtterance:
                case CoreEventType.StatementGiven:
                case CoreEventType.ExplanationGiven:
                    return (0.05f, 0f);
                case CoreEventType.RumorDebunked:
                    return (0.05f, -0.05f);
                case CoreEventType.RumorShared:
                case CoreEventType.RumorConfirmed:
                    return (0f, 0.08f);
                case CoreEventType.SuspicionUpdated:
                case CoreEventType.ReportFiled:
                case CoreEventType.ExposureUpdated:
                case CoreEventType.ViolationDetected:
                    return (0f, 0.2f);
                default:
                    return (0f, 0.02f);
            }
        }
    }
}
