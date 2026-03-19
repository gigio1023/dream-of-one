using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 포탈 이동 상태를 추적한다.
    /// </summary>
    public sealed class PortalTraveler : MonoBehaviour
    {
        public float LastTeleportTime { get; set; }
        public bool IsInside { get; set; }
        public bool HasExteriorFallback { get; set; }
        public Vector3 LastExteriorPosition { get; set; }

        public bool NavMeshAgentWasEnabled { get; set; }
        public bool PatrolWasEnabled { get; set; }
        public bool PoliceWasEnabled { get; set; }
    }
}
