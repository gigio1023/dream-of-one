using System.Reflection;
using DreamOfOne.Core;
using NUnit.Framework;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.Tests
{
    public class FirstPersonCameraTests
    {
        [Test]
        public void DefaultExecutionOrder_IsBeforeDefaultUpdate()
        {
            var attribute = typeof(FirstPersonCamera).GetCustomAttribute<DefaultExecutionOrder>();
            Assert.IsNotNull(attribute);
            Assert.Less(attribute.order, 0);
        }

        [Test]
        public void IsLookActive_ReturnsFalseWhenCursorCaptureDisabled()
        {
            var cameraGo = new GameObject("FpsCamera");
            cameraGo.AddComponent<Camera>();
            var fpsCamera = cameraGo.AddComponent<FirstPersonCamera>();

            var targetGo = new GameObject("Target");
            TestHelpers.SetPrivateField(fpsCamera, "target", targetGo.transform);
            TestHelpers.SetPrivateField(fpsCamera, "lockCursorWhileLooking", true);
            TestHelpers.SetPrivateField(fpsCamera, "requireRightMouse", false);
            TestHelpers.SetPrivateField(fpsCamera, "cursorCaptureEnabled", false);

            bool lookActive = InvokePrivate<bool>(fpsCamera, "IsLookActive");
            Assert.IsFalse(lookActive);

            Object.DestroyImmediate(targetGo);
            Object.DestroyImmediate(cameraGo);
        }

        [Test]
        public void ComputeEyePosition_UsesFallbackOffsetAndEyeHeightOffset()
        {
            var cameraGo = new GameObject("FpsCamera");
            cameraGo.AddComponent<Camera>();
            var fpsCamera = cameraGo.AddComponent<FirstPersonCamera>();

            var targetGo = new GameObject("Target");
            targetGo.transform.position = new Vector3(1f, 2f, 3f);

            TestHelpers.SetPrivateField(fpsCamera, "target", targetGo.transform);
            TestHelpers.SetPrivateField(fpsCamera, "cachedController", null as CharacterController);
            TestHelpers.SetPrivateField(fpsCamera, "fallbackOffset", new Vector3(0f, 1.6f, 0f));
            TestHelpers.SetPrivateField(fpsCamera, "eyeHeightOffset", 0.25f);

            Vector3 eyePosition = InvokePrivate<Vector3>(fpsCamera, "ComputeEyePosition");
            Vector3 expected = new Vector3(1f, 3.85f, 3f);
            Assert.AreEqual(expected.x, eyePosition.x, 0.0001f);
            Assert.AreEqual(expected.y, eyePosition.y, 0.0001f);
            Assert.AreEqual(expected.z, eyePosition.z, 0.0001f);

            Object.DestroyImmediate(targetGo);
            Object.DestroyImmediate(cameraGo);
        }

#if ENABLE_INPUT_SYSTEM
        [Test]
        public void TryMapKeyCodeToInputSystemKey_MapsConfiguredKeys()
        {
            bool mappedEscape = InvokePrivateStatic<bool>(
                typeof(FirstPersonCamera),
                "TryMapKeyCodeToInputSystemKey",
                new object[] { KeyCode.Escape, null });
            object[] escapeArgs = LastInvokedArgs;
            Assert.IsTrue(mappedEscape);
            Assert.AreEqual(Key.Escape, (Key)escapeArgs[1]);

            bool mappedR = InvokePrivateStatic<bool>(
                typeof(FirstPersonCamera),
                "TryMapKeyCodeToInputSystemKey",
                new object[] { KeyCode.R, null });
            object[] rArgs = LastInvokedArgs;
            Assert.IsTrue(mappedR);
            Assert.AreEqual(Key.R, (Key)rArgs[1]);
        }
#endif

        private static T InvokePrivate<T>(object instance, string methodName)
        {
            var method = instance.GetType().GetMethod(methodName, BindingFlags.Instance | BindingFlags.NonPublic);
            Assert.IsNotNull(method, $"Method not found: {methodName}");
            return (T)method.Invoke(instance, null);
        }

#if ENABLE_INPUT_SYSTEM
        private static object[] LastInvokedArgs = null;

        private static T InvokePrivateStatic<T>(System.Type type, string methodName, object[] args)
        {
            var method = type.GetMethod(methodName, BindingFlags.Static | BindingFlags.NonPublic);
            Assert.IsNotNull(method, $"Method not found: {methodName}");

            // Reflection updates "out" values directly on this args array.
            LastInvokedArgs = args;
            return (T)method.Invoke(null, args);
        }
#endif
    }
}
