using System;
using System.Collections.Generic;
using System.Reflection;
using DreamOfOne.Core;
using DreamOfOne.LucidCover;
using DreamOfOne.World;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class LucidCoverDeterminismDebugMenu
    {
        private const string WorldAssetPath = "Assets/Data/WorldDefinition.asset";

        [MenuItem("Tools/DreamOfOne/LucidCover/Debug/Determinism Check (Speech Input)")]
        public static void RunDeterminismCheck()
        {
            if (!Application.isPlaying)
            {
                Debug.LogWarning("[LucidCover] Enter Play Mode, then run this determinism check.");
                return;
            }

            var db = TryLoadDatabaseFromWorld(out string dbSource) ?? BuildTempDatabaseForTest(out dbSource);
            if (db == null)
            {
                Debug.LogError("[LucidCover] DreamLawDatabase not found and temp DB build failed.");
                return;
            }

            using var harness = new TestHarness();
            var applier = new DreamLawViolationApplier();

            var baseline = RunOnce(harness, applier, db);
            harness.Reset();
            var second = RunOnce(harness, applier, db);

            if (!baseline.Equals(second))
            {
                Debug.LogError($"[LucidCover] Determinism FAILED ({dbSource}).\nBaseline:\n{baseline}\nSecond:\n{second}");
                return;
            }

            Debug.Log($"[LucidCover] Determinism OK ({dbSource}).\n{baseline}");
        }

        private static DreamLawDatabase TryLoadDatabaseFromWorld(out string source)
        {
            source = "WorldDefinition";
            var world = AssetDatabase.LoadAssetAtPath<WorldDefinition>(WorldAssetPath);
            if (world == null || world.DreamLawDatabase == null || world.DreamLawDatabase.DreamLaws.Count == 0)
            {
                return null;
            }

            return world.DreamLawDatabase;
        }

        private static DreamLawDatabase BuildTempDatabaseForTest(out string source)
        {
            source = "TempDatabase";

            var db = ScriptableObject.CreateInstance<DreamLawDatabase>();
            var g1 = ScriptableObject.CreateInstance<DreamLawDefinition>();
            var g2 = ScriptableObject.CreateInstance<DreamLawDefinition>();

            ConfigureLaw(g1,
                "DL_G1_NO_DREAM_TALK",
                DreamLawCategory.Speech,
                0.9f,
                suspicionDelta: 10,
                exposureDelta: 25,
                detectors: new[] { DreamLawDetectorIds.SpeechDreamTalk });

            ConfigureLaw(g2,
                "DL_G2_NO_REALITY_TEST",
                DreamLawCategory.Speech,
                1.0f,
                suspicionDelta: 12,
                exposureDelta: 30,
                detectors: new[] { DreamLawDetectorIds.SpeechRealityTest });

            // Populate private list via reflection to avoid asset writes.
            var list = new List<DreamLawDefinition> { g1, g2 };
            var field = typeof(DreamLawDatabase).GetField("dreamLaws", BindingFlags.NonPublic | BindingFlags.Instance);
            field?.SetValue(db, list);

            return db;
        }

        private static void ConfigureLaw(
            DreamLawDefinition law,
            string id,
            DreamLawCategory category,
            float severity,
            int suspicionDelta,
            int exposureDelta,
            string[] detectors)
        {
            if (law == null)
            {
                return;
            }

            var serialized = new SerializedObject(law);
            serialized.FindProperty("dreamLawId").stringValue = id;
            serialized.FindProperty("category").enumValueIndex = (int)category;
            serialized.FindProperty("scopeKind").enumValueIndex = (int)DreamLawScopeKind.Global;
            serialized.FindProperty("scopeId").stringValue = string.Empty;
            serialized.FindProperty("severity").floatValue = severity;
            serialized.FindProperty("suspicionDelta").intValue = suspicionDelta;
            serialized.FindProperty("exposureDelta").intValue = exposureDelta;
            serialized.FindProperty("detectorIds").arraySize = detectors != null ? detectors.Length : 0;
            for (int i = 0; detectors != null && i < detectors.Length; i++)
            {
                serialized.FindProperty("detectorIds").GetArrayElementAtIndex(i).stringValue = detectors[i];
            }
            serialized.FindProperty("canonicalLineTemplate").stringValue = $"[{id}] canonical.";
            serialized.ApplyModifiedPropertiesWithoutUndo();
        }

        private static Snapshot RunOnce(TestHarness harness, DreamLawViolationApplier applier, DreamLawDatabase db)
        {
            harness.Reset();

            // Station context should apply 1.5x multiplier for DL_G1/DL_G2.
            string placeId = "Station";
            string witnessId = "Officer";
            string witnessRole = "Officer";
            var position = Vector3.zero;

            // Contains both detector keyword sets.
            string utterance = "dream reality check";
            applier.ApplySpeech(db, harness.Log, harness.Exposure, SpeechAct.Inquire, utterance, placeId, witnessId, witnessRole, position);

            return Snapshot.From(harness.Log, harness.Exposure, applier.LastHits);
        }

        private readonly struct Snapshot : IEquatable<Snapshot>
        {
            private readonly int exposure;
            private readonly string hitsKey;
            private readonly string eventsKey;

            private Snapshot(int exposure, string hitsKey, string eventsKey)
            {
                this.exposure = exposure;
                this.hitsKey = hitsKey ?? string.Empty;
                this.eventsKey = eventsKey ?? string.Empty;
            }

            public static Snapshot From(WorldEventLog log, ExposureSystem exposure, IReadOnlyList<DreamLawHit> hits)
            {
                int exposureValue = exposure != null ? exposure.Exposure : -1;

                var hitsBuilder = new System.Text.StringBuilder();
                if (hits != null)
                {
                    for (int i = 0; i < hits.Count; i++)
                    {
                        var hit = hits[i];
                        hitsBuilder.Append(hit.Law != null ? hit.Law.DreamLawId : "null");
                        hitsBuilder.Append("|");
                        hitsBuilder.Append(hit.DetectorId);
                        hitsBuilder.Append("|");
                        hitsBuilder.Append(hit.SuspicionDelta);
                        hitsBuilder.Append("|");
                        hitsBuilder.Append(hit.ExposureDelta);
                        hitsBuilder.Append("|");
                        hitsBuilder.Append(hit.StationMultiplierApplied ? "S" : "-");
                        hitsBuilder.Append("\n");
                    }
                }

                var eventsBuilder = new System.Text.StringBuilder();
                if (log != null)
                {
                    foreach (var e in log.Events)
                    {
                        if (e == null)
                        {
                            continue;
                        }

                        eventsBuilder.Append(e.eventType);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(e.actorId);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(e.targetId);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(e.ruleId);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(e.sourceId);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(e.delta);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(e.placeId);
                        eventsBuilder.Append("|");
                        eventsBuilder.Append(NormalizeNote(e.note));
                        eventsBuilder.Append("\n");
                    }
                }

                return new Snapshot(exposureValue, hitsBuilder.ToString(), eventsBuilder.ToString());
            }

            private static string NormalizeNote(string note)
            {
                if (string.IsNullOrEmpty(note))
                {
                    return string.Empty;
                }

                // Violation notes include a random stmt eventId; keep the structure stable for comparisons.
                int idx = note.IndexOf("stmt=", StringComparison.OrdinalIgnoreCase);
                if (idx < 0)
                {
                    return note;
                }

                int end = note.IndexOf(";", idx, StringComparison.OrdinalIgnoreCase);
                if (end < 0)
                {
                    return note.Substring(0, idx) + "stmt=*";
                }

                return note.Substring(0, idx) + "stmt=*" + note.Substring(end);
            }

            public bool Equals(Snapshot other)
            {
                return exposure == other.exposure
                    && hitsKey == other.hitsKey
                    && eventsKey == other.eventsKey;
            }

            public override bool Equals(object obj)
            {
                return obj is Snapshot other && Equals(other);
            }

            public override int GetHashCode()
            {
                unchecked
                {
                    int hash = exposure;
                    hash = hash * 31 + hitsKey.GetHashCode();
                    hash = hash * 31 + eventsKey.GetHashCode();
                    return hash;
                }
            }

            public override string ToString()
            {
                return $"Exposure={exposure}\nHits:\n{hitsKey}Events:\n{eventsKey}";
            }
        }

        private sealed class TestHarness : IDisposable
        {
            private readonly GameObject host;

            public WorldEventLog Log { get; }
            public ExposureSystem Exposure { get; }

            public TestHarness()
            {
                host = new GameObject("LucidCover_DeterminismHarness");

                Log = host.AddComponent<WorldEventLog>();
                Exposure = host.AddComponent<ExposureSystem>();

                // Force the ExposureSystem to use our isolated WEL.
                var field = typeof(ExposureSystem).GetField("eventLog", BindingFlags.NonPublic | BindingFlags.Instance);
                field?.SetValue(Exposure, Log);
            }

            public void Reset()
            {
                Log?.ResetLog();
                Exposure?.ResetExposure();
            }

            public void Dispose()
            {
                if (host != null)
                {
                    UnityEngine.Object.Destroy(host);
                }
            }
        }
    }
}

