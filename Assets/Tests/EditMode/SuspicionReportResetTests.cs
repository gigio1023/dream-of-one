using NUnit.Framework;
using DreamOfOne.NPC;

namespace DreamOfOne.Tests
{
    public class SuspicionReportResetTests
    {
        [Test]
        public void ReportedField_Exists_AndStartsFalse()
        {
            var go = new UnityEngine.GameObject();
            var sc = go.AddComponent<SuspicionComponent>();
            var field = typeof(SuspicionComponent).GetField("reported",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            Assert.NotNull(field, "reported field should exist");
            Assert.IsFalse((bool)field.GetValue(sc), "reported should start as false");
            UnityEngine.Object.DestroyImmediate(go);
        }
    }
}
