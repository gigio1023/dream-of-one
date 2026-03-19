using NUnit.Framework;

public class SessionManagerTests
{
    [Test]
    public void IsGameOver_WhenExposure100_ReturnsTrue()
    {
        Assert.IsTrue(SessionManager.CheckLoseCondition(100));
    }

    [Test]
    public void IsGameOver_WhenExposure50_ReturnsFalse()
    {
        Assert.IsFalse(SessionManager.CheckLoseCondition(50));
    }
}
