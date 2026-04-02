using NUnit.Framework;
using UnityEngine;
using DreamOfOne.Core;

public class FloatVariableTests
{
    [Test]
    public void SetValue_RaisesOnChanged()
    {
        var fv = ScriptableObject.CreateInstance<FloatVariable>();
        float received = -1f;
        fv.OnChanged += v => received = v;
        fv.SetValue(0.5f);
        Assert.AreEqual(0.5f, received, 0.001f);
    }

    [Test]
    public void SetValue_ClampsTo01()
    {
        var fv = ScriptableObject.CreateInstance<FloatVariable>();
        fv.SetValue(1.5f);
        Assert.AreEqual(1f, fv.Value, 0.001f);
        fv.SetValue(-0.5f);
        Assert.AreEqual(0f, fv.Value, 0.001f);
    }

    [Test]
    public void SetValue_SameValue_DoesNotFire()
    {
        var fv = ScriptableObject.CreateInstance<FloatVariable>();
        fv.SetValue(0.3f);
        int callCount = 0;
        fv.OnChanged += _ => callCount++;
        fv.SetValue(0.3f);
        Assert.AreEqual(0, callCount);
    }
}
