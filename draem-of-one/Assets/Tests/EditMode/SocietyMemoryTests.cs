using DreamOfOne.Core;
using DreamOfOne.Society;
using NUnit.Framework;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.Tests
{
    public class SocietyMemoryTests
    {
        [Test]
        public void BuildPromptEntries_IncludesIdentityEpisodicAndSocialLayers()
        {
            var go = new GameObject("SocietyMemory");
            var memory = go.AddComponent<SocietyMemory>();

            memory.ConfigureCaps(working: 8, episodic: 8, social: 8);
            memory.InitializeIdentity("Store_Clerk_A", "Clerk", "Store");
            memory.Add("OBS: player asked about stock");
            memory.AddEpisodic("player asked about stock", "evt-1", "Player", 1f);
            memory.UpdateSocial(CoreEventType.NpcUtterance, "Player", 1.5f, "question exchange");

            string[] entries = memory.BuildPromptEntries(maxWorkingLines: 6, maxEpisodes: 4, maxRelations: 4);

            Assert.GreaterOrEqual(entries.Length, 3);
            StringAssert.StartsWith("ID:", entries[0]);
            Assert.IsTrue(System.Array.Exists(entries, line => line.StartsWith("WM: ")));
            Assert.IsTrue(System.Array.Exists(entries, line => line.StartsWith("EP: ")));
            Assert.IsTrue(System.Array.Exists(entries, line => line.StartsWith("SOC: ")));

            Object.DestroyImmediate(go);
        }

        [Test]
        public void Compaction_BoundsWorkingEpisodicAndSocialMemory()
        {
            var go = new GameObject("SocietyMemory");
            var memory = go.AddComponent<SocietyMemory>();

            memory.ConfigureCaps(working: 4, episodic: 3, social: 2);
            memory.InitializeIdentity("Station_Investigator", "Investigator", "Station");

            for (int i = 0; i < 10; i++)
            {
                memory.Add($"WORK-{i}");
            }

            for (int i = 0; i < 6; i++)
            {
                memory.AddEpisodic($"EP-{i}", $"evt-{i}", $"actor-{i}", i);
            }

            memory.UpdateSocial(CoreEventType.ReportFiled, "actor-a", 1f, "report filed");
            memory.UpdateSocial(CoreEventType.ReportFiled, "actor-a", 2f, "report filed 2");
            memory.UpdateSocial(CoreEventType.NpcUtterance, "actor-b", 3f, "utterance");
            memory.UpdateSocial(CoreEventType.NpcUtterance, "actor-c", 4f, "utterance");

            Assert.LessOrEqual(memory.WorkingCount, 4);
            // ConfigureCaps enforces floor(4) to avoid degenerate runtime memory settings.
            Assert.LessOrEqual(memory.EpisodicCount, 4);
            Assert.LessOrEqual(memory.SocialCount, 4);

            string summary = memory.BuildSummary(6);
            StringAssert.DoesNotContain("WORK-0", summary);
            StringAssert.Contains("WORK-9", summary);
            StringAssert.Contains("working=", memory.BuildMetricsSummary());

            Object.DestroyImmediate(go);
        }
    }
}
