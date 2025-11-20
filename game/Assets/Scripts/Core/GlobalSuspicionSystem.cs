using System;
using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// NPC들의 개인 의심 지표를 합산해 전역 G 값을 계산하고 브로드캐스트한다.
    /// HUD 표시뿐 아니라 ReportManager 조건에도 활용되기 때문에 단일 진실의 근원으로 유지한다.
    /// </summary>
    public sealed class GlobalSuspicionSystem : MonoBehaviour
    {
        /// <summary>G 값이 갱신될 때 발생하는 이벤트.</summary>
        public event Action<float> OnGlobalSuspicionChanged;

        /// <summary>씬 내에 등록된 모든 SuspicionComponent 목록.</summary>
        private readonly List<NPC.SuspicionComponent> trackedComponents = new();

        private float globalSuspicion = 0f;

        public float GlobalSuspicion => globalSuspicion;

        /// <summary>
        /// SuspicionComponent 활성화 시 호출되어 집계 대상에 추가된다.
        /// </summary>
        public void Register(NPC.SuspicionComponent component)
        {
            if (!trackedComponents.Contains(component))
            {
                trackedComponents.Add(component);
                Recalculate();
            }
        }

        /// <summary>
        /// 비활성화된 컴포넌트를 제거한다.
        /// </summary>
        public void Unregister(NPC.SuspicionComponent component)
        {
            if (trackedComponents.Remove(component))
            {
                Recalculate();
            }
        }

        /// <summary>
        /// 현재 등록된 NPC들의 평균 의심 값을 계산해 G를 갱신한다.
        /// </summary>
        public void Recalculate()
        {
            if (trackedComponents.Count == 0)
            {
                SetGlobalSuspicion(0f);
                return;
            }

            float sum = 0f;
            foreach (var component in trackedComponents)
            {
                sum += component.CurrentSuspicionNormalized;
            }

            float average = Mathf.Clamp01(sum / trackedComponents.Count);
            SetGlobalSuspicion(average);
        }

        private void SetGlobalSuspicion(float value)
        {
            if (Mathf.Approximately(globalSuspicion, value))
            {
                return;
            }

            globalSuspicion = value;
            OnGlobalSuspicionChanged?.Invoke(globalSuspicion);
        }
    }
}
