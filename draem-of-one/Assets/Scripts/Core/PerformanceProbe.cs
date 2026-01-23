using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class PerformanceProbe : MonoBehaviour
    {
        [SerializeField]
        private int sampleCount = 60;

        [SerializeField]
        private float logIntervalSeconds = 10f;

        private readonly FrameTiming[] frameTimings = new FrameTiming[1];
        private float cpuSum = 0f;
        private float gpuSum = 0f;
        private int samples = 0;
        private float nextLogTime = 0f;
        private string lastClassification = "Unknown";

        public string LastClassification => lastClassification;

        private void Update()
        {
            FrameTimingManager.CaptureFrameTimings();
            if (FrameTimingManager.GetLatestTimings(1, frameTimings) == 0)
            {
                return;
            }

            var timing = frameTimings[0];
            if (timing.cpuFrameTime <= 0f || timing.gpuFrameTime <= 0f)
            {
                return;
            }

            cpuSum += (float)timing.cpuFrameTime;
            gpuSum += (float)timing.gpuFrameTime;
            samples++;

            if (samples >= sampleCount)
            {
                float cpuAvg = cpuSum / samples;
                float gpuAvg = gpuSum / samples;
                lastClassification = Classify(cpuAvg, gpuAvg);

                cpuSum = 0f;
                gpuSum = 0f;
                samples = 0;
            }

            if (Time.time >= nextLogTime)
            {
                nextLogTime = Time.time + logIntervalSeconds;
                Debug.Log($"[Perf] Bound={lastClassification}");
            }
        }

        private static string Classify(float cpuMs, float gpuMs)
        {
            if (cpuMs <= 0f || gpuMs <= 0f)
            {
                return "Unknown";
            }

            if (cpuMs > gpuMs * 1.1f)
            {
                return "CPU";
            }

            if (gpuMs > cpuMs * 1.1f)
            {
                return "GPU";
            }

            return "Balanced";
        }
    }
}
