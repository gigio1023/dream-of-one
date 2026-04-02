using NUnit.Framework;

public class ZoneSuspicionBridgeTests
{
    [Test]
    public void GetSuspicionDelta_StaffOnly_Returns30()
    {
        float delta = ZoneSuspicionBridge.GetSuspicionDelta("staff_only");
        Assert.AreEqual(30f, delta);
    }

    [Test]
    public void GetSuspicionDelta_Queue_Returns15()
    {
        float delta = ZoneSuspicionBridge.GetSuspicionDelta("queue_cut");
        Assert.AreEqual(15f, delta);
    }

    [Test]
    public void GetSuspicionDelta_Unknown_Returns0()
    {
        float delta = ZoneSuspicionBridge.GetSuspicionDelta("unknown");
        Assert.AreEqual(0f, delta);
    }
}
