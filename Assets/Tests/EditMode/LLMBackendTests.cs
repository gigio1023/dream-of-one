using NUnit.Framework;

public class LLMBackendTests
{
    [Test]
    public void Fallback_ReturnsValidResponse()
    {
        var resp = LLMResponse.Fallback();
        Assert.IsFalse(resp.success);
        Assert.IsNotNull(resp.text);
        Assert.Greater(resp.suspicionDelta, 0f);
    }
}
