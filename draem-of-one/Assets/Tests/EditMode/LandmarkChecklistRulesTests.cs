using DreamOfOne.Core;
using DreamOfOne.UI;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class LandmarkChecklistRulesTests
    {
        [Test]
        public void TryGetCompletionPlace_RejectsMovementOnlyEvents()
        {
            var record = new EventRecord
            {
                actorId = "Player",
                eventType = EventType.EnteredZone,
                zoneId = "StoreQueue"
            };

            bool ok = LandmarkChecklistRules.TryGetCompletionPlace(record, out string place);
            Assert.IsFalse(ok);
            Assert.IsEmpty(place);
        }

        [Test]
        public void TryGetCompletionPlace_ResolvesPlaceForPlayerActionEvent()
        {
            var record = new EventRecord
            {
                actorId = "Player",
                eventType = EventType.TaskCompleted,
                placeId = "StoreCounter"
            };

            bool ok = LandmarkChecklistRules.TryGetCompletionPlace(record, out string place);
            Assert.IsTrue(ok);
            Assert.AreEqual("Store", place);
        }

        [Test]
        public void TryGetCompletionPlace_RejectsNonPlayerActor()
        {
            var record = new EventRecord
            {
                actorId = "StoreClerk_01",
                eventType = EventType.TaskCompleted,
                placeId = "StoreCounter"
            };

            bool ok = LandmarkChecklistRules.TryGetCompletionPlace(record, out _);
            Assert.IsFalse(ok);
        }
    }
}
