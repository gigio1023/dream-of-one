using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/NPC Definition", fileName = "NpcDefinition")]
    public sealed class NpcDefinition : ScriptableObject
    {
        [SerializeField]
        private string npcId = "Citizen";

        [SerializeField]
        private string roleName = "Citizen";

        [SerializeField]
        private string anchorName = "StoreBuilding";

        [SerializeField]
        private GameObject prefab = null;

        [SerializeField]
        private Vector3 spawnOffset = Vector3.zero;

        [SerializeField]
        private bool isPolice = false;

        [SerializeField]
        private float speed = 1.2f;

        [SerializeField]
        private float stoppingDistance = 0.2f;

        [SerializeField]
        private int avoidancePriority = 55;

        public string NpcId => npcId;
        public string RoleName => roleName;
        public string AnchorName => anchorName;
        public GameObject Prefab => prefab;
        public Vector3 SpawnOffset => spawnOffset;
        public bool IsPolice => isPolice;
        public float Speed => speed;
        public float StoppingDistance => stoppingDistance;
        public int AvoidancePriority => avoidancePriority;
    }
}
