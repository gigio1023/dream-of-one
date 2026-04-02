using NUnit.Framework;
using UnityEngine;
using DreamOfOne.NPC;

public class PoliceControllerMVPTests
{
    [Test]
    public void Configure_WithMinimalParams_DoesNotThrow()
    {
        var go = new GameObject();
        go.AddComponent<UnityEngine.AI.NavMeshAgent>();
        var pc = go.AddComponent<PoliceController>();
        Assert.DoesNotThrow(() => pc.Configure(null, null, null));
        Object.DestroyImmediate(go);
    }
}
