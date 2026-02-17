using DreamOfOne.World;
using NUnit.Framework;

namespace DreamOfOne.Tests
{
    public class WorldBuildReportTests
    {
        [Test]
        public void Report_TracksWarningsAndErrors()
        {
            var report = new WorldBuildReport();
            report.AddWarning("missing anchor");
            report.AddError("missing prefab");

            Assert.AreEqual(1, report.WarningCount);
            Assert.AreEqual(1, report.ErrorCount);
            Assert.IsTrue(report.HasErrors);
        }

        [Test]
        public void Report_NoErrorsWhenEmpty()
        {
            var report = new WorldBuildReport();
            Assert.AreEqual(0, report.WarningCount);
            Assert.AreEqual(0, report.ErrorCount);
            Assert.IsFalse(report.HasErrors);
        }
    }
}
