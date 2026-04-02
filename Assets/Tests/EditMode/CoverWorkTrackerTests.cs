// Assets/Tests/EditMode/CoverWorkTrackerTests.cs
using NUnit.Framework;

public class CoverWorkTrackerTests
{
    [Test]
    public void IsWorking_True_ReturnsBonusDecay()
    {
        var tracker = new CoverWorkLogic(bonusDecay: -0.5f, idlePenalty: 0.2f);
        tracker.SetWorking(true);
        Assert.AreEqual(-0.5f, tracker.GetSuspicionModifier(), 0.001f);
    }

    [Test]
    public void IsWorking_False_ReturnsPenalty()
    {
        var tracker = new CoverWorkLogic(bonusDecay: -0.5f, idlePenalty: 0.2f);
        tracker.SetWorking(false);
        Assert.AreEqual(0.2f, tracker.GetSuspicionModifier(), 0.001f);
    }

    [Test]
    public void ToggleWork_SwitchesState()
    {
        var tracker = new CoverWorkLogic(-0.5f, 0.2f);
        Assert.IsFalse(tracker.IsWorking);
        tracker.SetWorking(true);
        Assert.IsTrue(tracker.IsWorking);
    }
}
