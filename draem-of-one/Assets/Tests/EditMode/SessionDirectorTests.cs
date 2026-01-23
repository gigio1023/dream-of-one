using DreamOfOne.Core;
using CoreEventType = DreamOfOne.Core.EventType;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class SessionDirectorTests
    {
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
        public void ProcessEvent_VerdictEndsSession()
        {
            var go = new GameObject("SessionDirector");
            var director = go.AddComponent<SessionDirector>();

            var record = new EventRecord
            {
                eventType = CoreEventType.VerdictGiven,
                note = "Test verdict"
            };

            director.ProcessEvent(record);

            Assert.IsTrue(director.IsEnded);
            StringAssert.Contains("Verdict", director.EndReason);

            Object.DestroyImmediate(go);
        }
    }
}
