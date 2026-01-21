using DreamOfOne.Core;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class DialogueLineLimiterTests
    {
        [Test]
        public void ClampLine_RemovesNewlinesAndTrims()
        {
            string result = DialogueLineLimiter.ClampLine("  hello\nworld  ", 80);
            Assert.AreEqual("hello world", result);
        }

        [Test]
        public void ClampLine_TruncatesToMaxLength()
        {
            string input = new string('a', 100);
            string result = DialogueLineLimiter.ClampLine(input, 10);
            Assert.AreEqual(10, result.Length);
        }

        [Test]
        public void ClampLine_EmptyInputReturnsEmpty()
        {
            string result = DialogueLineLimiter.ClampLine("   ", 80);
            Assert.AreEqual(string.Empty, result);
        }
    }
}
