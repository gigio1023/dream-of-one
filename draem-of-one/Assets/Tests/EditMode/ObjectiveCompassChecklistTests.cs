using System.Collections.Generic;
using System.Reflection;
using DreamOfOne.Core;
using DreamOfOne.UI;
using NUnit.Framework;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.Tests
{
    public class ObjectiveCompassChecklistTests
    {
        [Test]
        public void ProcessCompletionEvent_OnlyCompletesCurrentTarget()
        {
            var go = new GameObject("ObjectiveCompass");
            var compass = go.AddComponent<ObjectiveCompassUI>();
            var order = GetOrder(compass);
            order.Add("Store");
            order.Add("Studio");

            var wrongPlace = new EventRecord
            {
                actorId = "Player",
                eventType = CoreEventType.TaskCompleted,
                placeId = "StudioDesk"
            };

            bool processedWrong = compass.ProcessCompletionEventForTesting(wrongPlace);
            Assert.IsFalse(processedWrong);
            Assert.IsFalse(compass.IsLandmarkCompleted("Store"));
            Assert.IsFalse(compass.IsLandmarkCompleted("Studio"));

            var currentPlace = new EventRecord
            {
                actorId = "Player",
                eventType = CoreEventType.TaskCompleted,
                placeId = "StoreQueue"
            };

            bool processedCurrent = compass.ProcessCompletionEventForTesting(currentPlace);
            Assert.IsTrue(processedCurrent);
            Assert.IsTrue(compass.IsLandmarkCompleted("Store"));
            Assert.IsFalse(compass.IsLandmarkCompleted("Studio"));

            Object.DestroyImmediate(go);
        }

        [Test]
        public void ProcessCompletionEvent_IgnoresDuplicateCompletion()
        {
            var go = new GameObject("ObjectiveCompass");
            var compass = go.AddComponent<ObjectiveCompassUI>();
            var order = GetOrder(compass);
            order.Add("Store");

            var first = new EventRecord
            {
                actorId = "Player",
                eventType = CoreEventType.TaskCompleted,
                placeId = "StoreCounter"
            };
            var second = new EventRecord
            {
                actorId = "Player",
                eventType = CoreEventType.TaskCompleted,
                placeId = "StoreCounter"
            };

            Assert.IsTrue(compass.ProcessCompletionEventForTesting(first));
            Assert.IsFalse(compass.ProcessCompletionEventForTesting(second));

            Object.DestroyImmediate(go);
        }

        private static List<string> GetOrder(ObjectiveCompassUI compass)
        {
            var field = typeof(ObjectiveCompassUI).GetField("objectiveOrder", BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(field);
            return (List<string>)field.GetValue(compass);
        }
    }
}
