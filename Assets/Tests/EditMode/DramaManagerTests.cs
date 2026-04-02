using NUnit.Framework;

public class DramaManagerTests
{
    [Test]
    public void StartsAtActOne()
    {
        var dm = new DramaManagerLogic(actOneEnd: 180f, actTwoEnd: 480f, sessionEnd: 720f);
        Assert.AreEqual(DramaAct.Peace, dm.CurrentAct);
    }

    [Test]
    public void TransitionsToTension_AtActOneEnd()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        DramaAct? received = null;
        dm.OnActChanged += act => received = act;
        dm.Tick(181f);
        Assert.AreEqual(DramaAct.Tension, dm.CurrentAct);
        Assert.AreEqual(DramaAct.Tension, received);
    }

    [Test]
    public void TransitionsToResolution_AtActTwoEnd()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        dm.Tick(181f);
        dm.Tick(481f);
        Assert.AreEqual(DramaAct.Resolution, dm.CurrentAct);
    }

    [Test]
    public void GetToneDirective_ReturnsCorrectTone()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        Assert.IsTrue(dm.GetToneDirective().Contains("casual"));
        dm.Tick(181f);
        Assert.IsTrue(dm.GetToneDirective().Contains("suspicious"));
        dm.Tick(481f);
        Assert.IsTrue(dm.GetToneDirective().Contains("confrontational"));
    }

    [Test]
    public void NormalizedTime_CorrectWithinAct()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        dm.Tick(90f);
        Assert.AreEqual(0.5f, dm.ActProgress, 0.01f);
    }
}
