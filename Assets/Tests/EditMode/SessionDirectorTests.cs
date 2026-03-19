using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class SessionDirectorTests
    {
        [SetUp]
        public void SetUp()
        {
            SessionCarryoverStore.Clear();
        }

        [TearDown]
        public void TearDown()
        {
            SessionCarryoverStore.Clear();
        }

        [Test]
        public void Tick_WhenTimeLimitReached_EndsSession()
        {
            var go = new GameObject("SessionDirector");
            var director = go.AddComponent<SessionDirector>();

            TestHelpers.SetPrivateField(director, "sessionDurationSeconds", 0.1f);
            director.Tick(0.2f);

            Assert.IsTrue(director.IsEnded);
            StringAssert.Contains("Time limit", director.EndReason);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void Tick_WhenGlobalSuspicionReached_EndsSession()
        {
            var go = new GameObject("SessionDirector");
            var suspicionGo = new GameObject("GlobalSuspicion");
            var system = suspicionGo.AddComponent<GlobalSuspicionSystem>();

            var director = go.AddComponent<SessionDirector>();
            TestHelpers.SetPrivateField(director, "globalSuspicionSystem", system);
            TestHelpers.SetPrivateField(director, "suspicionEndThreshold", 0.5f);

            TestHelpers.SetPrivateField(system, "globalSuspicion", 0.75f);

            director.Tick(0.02f);

            Assert.IsTrue(director.IsEnded);
            StringAssert.Contains("G reached", director.EndReason);

            Object.DestroyImmediate(go);
            Object.DestroyImmediate(suspicionGo);
        }

        [Test]
        public void ProcessEvent_LucidVerdictEndsSession()
        {
            var go = new GameObject("SessionDirector");
            var director = go.AddComponent<SessionDirector>();

            var record = new EventRecord
            {
                eventType = CoreEventType.VerdictGiven,
                note = "Lucid identified"
            };

            director.ProcessEvent(record);

            Assert.IsTrue(director.IsEnded);
            StringAssert.Contains("Verdict", director.EndReason);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void ProcessEvent_WarningVerdict_DoesNotEndSession()
        {
            var go = new GameObject("SessionDirector");
            var director = go.AddComponent<SessionDirector>();

            var record = new EventRecord
            {
                eventType = CoreEventType.VerdictGiven,
                note = "Warning"
            };

            director.ProcessEvent(record);

            Assert.IsFalse(director.IsEnded);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void Tick_TimeLimit_PersistsCarryoverForCleanPass()
        {
            var go = new GameObject("SessionDirector");
            var director = go.AddComponent<SessionDirector>();
            TestHelpers.SetPrivateField(director, "sessionDurationSeconds", 0.1f);

            director.Tick(0.2f);

            var state = SessionCarryoverStore.Load();
            Assert.AreEqual(2, state.dayIndex);
            Assert.AreEqual(0, state.pressureTier);
            Assert.AreEqual(SessionCarryoverEnding.CleanPass, state.lastEnding);

            Object.DestroyImmediate(go);
        }

        [Test]
        public void ProcessEvent_TerminalVerdict_PersistsExposedCarryover()
        {
            var go = new GameObject("SessionDirector");
            var director = go.AddComponent<SessionDirector>();
            var record = new EventRecord
            {
                eventType = CoreEventType.VerdictGiven,
                note = "Lucid identified"
            };

            director.ProcessEvent(record);

            var state = SessionCarryoverStore.Load();
            Assert.AreEqual(2, state.dayIndex);
            Assert.AreEqual(SessionCarryoverRules.MaxPressureTier, state.pressureTier);
            Assert.AreEqual(SessionCarryoverEnding.Exposed, state.lastEnding);

            Object.DestroyImmediate(go);
        }
    }
}
