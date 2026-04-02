using NUnit.Framework;
using System.Collections.Generic;

public class DialogueSchedulerTests
{
    [Test]
    public void AddCachedDialogue_StoresCorrectly()
    {
        var cache = new DialogueCache();
        var lines = new List<DialogueLine>
        {
            new("Kim", "Delivery was late again."),
            new("Park", "Always late on Mondays.")
        };
        cache.Add("kim_park_01", lines);
        Assert.IsTrue(cache.HasDialogue("kim_park_01"));
        Assert.AreEqual(2, cache.Get("kim_park_01").Count);
    }

    [Test]
    public void GetRandom_ReturnsDialogue_WhenAvailable()
    {
        var cache = new DialogueCache();
        cache.Add("pair_01", new List<DialogueLine> { new("A", "Hello") });
        cache.Add("pair_02", new List<DialogueLine> { new("B", "World") });
        var result = cache.GetRandom();
        Assert.IsNotNull(result);
        Assert.AreEqual(1, result.Count);
    }

    [Test]
    public void GetRandom_ReturnsNull_WhenEmpty()
    {
        var cache = new DialogueCache();
        Assert.IsNull(cache.GetRandom());
    }
}
