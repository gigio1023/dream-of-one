using DreamOfOne.Core;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class PortalFailsafeTests
    {
        [Test]
        public void ShouldReturn_FalseWhenNotInside()
        {
            bool result = PortalFailsafe.ShouldReturn(
                isInside: false,
                secondsInside: 10f,
                maxInsideSeconds: 6f,
                hasFallback: true);

            Assert.IsFalse(result);
        }

        [Test]
        public void ShouldReturn_FalseWhenNoFallback()
        {
            bool result = PortalFailsafe.ShouldReturn(
                isInside: true,
                secondsInside: 10f,
                maxInsideSeconds: 6f,
                hasFallback: false);

            Assert.IsFalse(result);
        }

        [Test]
        public void ShouldReturn_TrueWhenExceededAndFallbackExists()
        {
            bool result = PortalFailsafe.ShouldReturn(
                isInside: true,
                secondsInside: 8f,
                maxInsideSeconds: 6f,
                hasFallback: true);

            Assert.IsTrue(result);
        }
    }
}
