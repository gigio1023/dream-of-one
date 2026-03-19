using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// 편의점 카운터에 상주하는 점원 NPC.
    /// 현재는 제자리 유지만 하지만 R4 규칙 검증의 맥락을 제공한다.
    /// </summary>
    public sealed class ClerkController : NPCBase
    {
        [SerializeField]
        [Tooltip("카운터 위치")]
        private Transform counterPosition = null;

        protected override void OnIdle()
        {
            if (counterPosition != null)
            {
                agent.SetDestination(counterPosition.position);
            }

            state = NPCState.Acting;
        }

        protected override void OnActing()
        {
            // Clerk stays near the counter; no extra logic yet.
            state = NPCState.Cooldown;
        }
    }
}


