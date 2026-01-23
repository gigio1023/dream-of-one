using Unity.Profiling;
using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class GcAllocationProbe : MonoBehaviour
    {
        [SerializeField]
        private int warmupFrames = 60;

        [SerializeField]
        private float logIntervalSeconds = 10f;

        private ProfilerRecorder gcAllocRecorder;
        private int frameCount = 0;
        private float nextLogTime = 0f;
        private long lastAllocBytes = 0;

        private void OnEnable()
        {
            gcAllocRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Allocated In Frame");
        }

        private void OnDisable()
        {
            if (gcAllocRecorder.Valid)
            {
                gcAllocRecorder.Dispose();
            }
        }

        private void Update()
        {
            frameCount++;
            if (frameCount <= warmupFrames)
            {
                return;
            }

            lastAllocBytes = gcAllocRecorder.LastValue;
            if (Time.time >= nextLogTime)
            {
                nextLogTime = Time.time + logIntervalSeconds;
                Debug.Log($"[GC] Alloc/frame={lastAllocBytes}B");
            }
        }
    }
}
