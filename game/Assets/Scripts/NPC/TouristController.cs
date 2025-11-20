using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 맵을 순찰하며 위반을 목격하고 의심을 축적하는 관광객 NPC.
    /// </summary>
    public sealed class TouristController : NPCBase
    {
        [SerializeField]
        [Tooltip("의심 누적 담당 컴포넌트")]
        private SuspicionComponent suspicion = null;

        [SerializeField]
        [Tooltip("호기심 이벤트 주기(초)")]
        private float curiosityInterval = 8f;

        private float curiosityTimer = 0f;

        protected override void OnActing()
        {
            curiosityTimer += Time.deltaTime;
            if (curiosityTimer >= curiosityInterval)
            {
                curiosityTimer = 0f;
                suspicion?.AddSuspicion(5f, "observation");
            }

            state = NPCState.Cooldown;
        }
    }
}


