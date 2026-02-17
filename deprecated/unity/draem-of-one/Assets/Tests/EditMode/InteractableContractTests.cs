using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class InteractableContractTests
    {
        [Test]
        public void ZoneInteractable_ImplementsInteractableContract()
        {
            var go = new GameObject("Zone");
            go.AddComponent<BoxCollider>();
            var interactable = go.AddComponent<ZoneInteractable>();

            Assert.IsTrue(interactable is IInteractable, "ZoneInteractable should implement IInteractable.");
            Object.DestroyImmediate(go);
        }

        [Test]
        public void GetPrompt_ReturnsPromptText()
        {
            var go = new GameObject("Zone");
            go.AddComponent<BoxCollider>();
            var interactable = go.AddComponent<ZoneInteractable>();
            TestHelpers.SetPrivateField(interactable, "promptText", "E: Test");

            var prompt = ((IInteractable)interactable).GetPrompt(new InteractContext("Player", "Player", Vector3.zero));
            Assert.AreEqual("E: Test", prompt);

            Object.DestroyImmediate(go);
        }
    }
}
