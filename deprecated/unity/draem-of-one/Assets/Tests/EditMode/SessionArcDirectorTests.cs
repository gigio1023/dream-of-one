using System.Reflection;
using System.Linq;
using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.Tests
{
    public class SessionArcDirectorTests
    {
        [Test]
        public void TickArc_AppliesPhaseTuningByElapsedRatio()
        {
            var violationGo = new GameObject("ViolationResponseSystem");
            var violation = violationGo.AddComponent<ViolationResponseSystem>();
            var reportGo = new GameObject("ReportManager");
            var reportManager = reportGo.AddComponent<ReportManager>();
            var arcGo = new GameObject("SessionArcDirector");
            var arc = arcGo.AddComponent<SessionArcDirector>();

            TestHelpers.SetPrivateField(arc, "violationResponseSystem", violation);
            TestHelpers.SetPrivateField(arc, "reportManager", reportManager);
            arc.SetPhaseConfigsForTesting(new[]
            {
                new SessionArcDirector.ArcPhaseConfig
                {
                    phaseId = "phase-a",
                    startRatio = 0f,
                    suspicionDeltaMultiplier = 1f,
                    reportsRequired = 2,
                    globalSuspicionThreshold = 0.2f,
                    socialPressureThreshold = 0.6f
                },
                new SessionArcDirector.ArcPhaseConfig
                {
                    phaseId = "phase-b",
                    startRatio = 0.5f,
                    suspicionDeltaMultiplier = 1.4f,
                    reportsRequired = 1,
                    globalSuspicionThreshold = 0.15f,
                    socialPressureThreshold = 0.5f
                }
            });

            arc.TickArc(20f, 100f);
            Assert.AreEqual("phase-a", arc.CurrentPhaseId);
            Assert.AreEqual(1f, violation.CurrentDeltaMultiplier, 0.0001f);
            Assert.AreEqual(2, reportManager.EffectiveReportsRequired);
            Assert.AreEqual(0.2f, reportManager.EffectiveGlobalSuspicionThreshold, 0.0001f);

            arc.TickArc(80f, 100f);
            Assert.AreEqual("phase-b", arc.CurrentPhaseId);
            Assert.AreEqual(1.4f, violation.CurrentDeltaMultiplier, 0.0001f);
            Assert.AreEqual(1, reportManager.EffectiveReportsRequired);
            Assert.AreEqual(0.15f, reportManager.EffectiveGlobalSuspicionThreshold, 0.0001f);

            Object.DestroyImmediate(arcGo);
            Object.DestroyImmediate(reportGo);
            Object.DestroyImmediate(violationGo);
        }

        [Test]
        public void TickArc_LogsOnlyOnPhaseTransition()
        {
            var welGo = new GameObject("WEL");
            var log = welGo.AddComponent<WorldEventLog>();
            var arcGo = new GameObject("SessionArcDirector");
            var arc = arcGo.AddComponent<SessionArcDirector>();

            TestHelpers.SetPrivateField(arc, "eventLog", log);
            arc.SetPhaseConfigsForTesting(new[]
            {
                new SessionArcDirector.ArcPhaseConfig
                {
                    phaseId = "early",
                    startRatio = 0f,
                    suspicionDeltaMultiplier = 1f,
                    reportsRequired = 2,
                    globalSuspicionThreshold = 0.2f,
                    socialPressureThreshold = 0.6f
                },
                new SessionArcDirector.ArcPhaseConfig
                {
                    phaseId = "late",
                    startRatio = 0.5f,
                    suspicionDeltaMultiplier = 1.2f,
                    reportsRequired = 1,
                    globalSuspicionThreshold = 0.15f,
                    socialPressureThreshold = 0.5f
                }
            });

            arc.TickArc(10f, 100f); // early enter
            arc.TickArc(20f, 100f); // early 유지
            arc.TickArc(70f, 100f); // late enter
            arc.TickArc(80f, 100f); // late 유지

            int phaseLogs = log.Events.Count(e =>
                e.actorId == "SessionArc" &&
                e.eventType == CoreEventType.ExplanationGiven &&
                e.topic == "SessionArc");
            Assert.AreEqual(2, phaseLogs, "Arc log should be emitted once per phase transition.");

            Object.DestroyImmediate(arcGo);
            Object.DestroyImmediate(welGo);
        }

        [Test]
        public void ResolveDependenciesForTesting_BindsLateCreatedSystems()
        {
            var arcGo = new GameObject("SessionArcDirector");
            var arc = arcGo.AddComponent<SessionArcDirector>();

            TestHelpers.SetPrivateField<SessionDirector>(arc, "sessionDirector", null);
            TestHelpers.SetPrivateField<ViolationResponseSystem>(arc, "violationResponseSystem", null);
            TestHelpers.SetPrivateField<ReportManager>(arc, "reportManager", null);
            TestHelpers.SetPrivateField<WorldEventLog>(arc, "eventLog", null);

            var sessionGo = new GameObject("SessionDirector");
            var session = sessionGo.AddComponent<SessionDirector>();
            var violationGo = new GameObject("ViolationResponseSystem");
            var violation = violationGo.AddComponent<ViolationResponseSystem>();
            var reportGo = new GameObject("ReportManager");
            var report = reportGo.AddComponent<ReportManager>();
            var welGo = new GameObject("WEL");
            var log = welGo.AddComponent<WorldEventLog>();

            arc.ResolveDependenciesForTesting();

            Assert.AreSame(session, GetField<SessionDirector>(arc, "sessionDirector"));
            Assert.AreSame(violation, GetField<ViolationResponseSystem>(arc, "violationResponseSystem"));
            Assert.AreSame(report, GetField<ReportManager>(arc, "reportManager"));
            Assert.AreSame(log, GetField<WorldEventLog>(arc, "eventLog"));

            Object.DestroyImmediate(arcGo);
            Object.DestroyImmediate(welGo);
            Object.DestroyImmediate(reportGo);
            Object.DestroyImmediate(violationGo);
            Object.DestroyImmediate(sessionGo);
        }

        [Test]
        public void TickArc_AppliesCarryoverProfileOverlay()
        {
            var violationGo = new GameObject("ViolationResponseSystem");
            var violation = violationGo.AddComponent<ViolationResponseSystem>();
            var reportGo = new GameObject("ReportManager");
            var reportManager = reportGo.AddComponent<ReportManager>();
            var arcGo = new GameObject("SessionArcDirector");
            var arc = arcGo.AddComponent<SessionArcDirector>();

            TestHelpers.SetPrivateField(arc, "violationResponseSystem", violation);
            TestHelpers.SetPrivateField(arc, "reportManager", reportManager);
            arc.SetPhaseConfigsForTesting(new[]
            {
                new SessionArcDirector.ArcPhaseConfig
                {
                    phaseId = "base",
                    startRatio = 0f,
                    suspicionDeltaMultiplier = 1.0f,
                    reportsRequired = 2,
                    globalSuspicionThreshold = 0.20f,
                    socialPressureThreshold = 0.60f
                }
            });

            arc.ConfigureCarryoverProfile(new SessionPressureProfile
            {
                profileId = "Strict",
                suspicionMultiplier = 1.15f,
                reportsRequiredOffset = -1,
                globalSuspicionThresholdOffset = -0.04f,
                socialPressureThresholdOffset = -0.05f
            });

            arc.TickArc(10f, 100f);

            Assert.AreEqual(1.15f, violation.CurrentDeltaMultiplier, 0.0001f);
            Assert.AreEqual(1, reportManager.EffectiveReportsRequired);
            Assert.AreEqual(0.16f, reportManager.EffectiveGlobalSuspicionThreshold, 0.0001f);
            Assert.AreEqual(0.55f, reportManager.EffectiveSocialPressureThreshold, 0.0001f);

            Object.DestroyImmediate(arcGo);
            Object.DestroyImmediate(reportGo);
            Object.DestroyImmediate(violationGo);
        }

        private static T GetField<T>(object target, string fieldName) where T : class
        {
            var field = target.GetType().GetField(fieldName, BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field, $"Field not found: {fieldName}");
            return field.GetValue(target) as T;
        }
    }
}
