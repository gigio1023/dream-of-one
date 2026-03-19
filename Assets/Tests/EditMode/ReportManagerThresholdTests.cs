using NUnit.Framework;
using DreamOfOne.Core;

namespace DreamOfOne.Tests
{
    public class ReportManagerThresholdTests
    {
        [Test]
        public void GlobalSuspicionThreshold_IsLowEnoughFor18Npcs()
        {
            var go = new UnityEngine.GameObject();
            var rm = go.AddComponent<ReportManager>();
            var field = typeof(ReportManager).GetField("globalSuspicionThreshold",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            Assert.NotNull(field, "globalSuspicionThreshold field should exist");
            var value = (float)field.GetValue(rm);
            Assert.LessOrEqual(value, 0.05f,
                "globalSuspicionThreshold should be <= 0.05 for 18-NPC scenario");
            UnityEngine.Object.DestroyImmediate(go);
        }
    }
}
