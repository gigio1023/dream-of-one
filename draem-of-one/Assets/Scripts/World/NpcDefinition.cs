using System.Collections.Generic;
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
        private string organization = "None";

        [SerializeField]
        private string routine = "Idle";

        [SerializeField]
        [Tooltip("Routine anchor/interactable IDs (ordered)")]
        private string[] routineAnchors = System.Array.Empty<string>();

        [SerializeField]
        private string perceptionProfile = "Default";

        [SerializeField]
        private string injectionProfile = "Default";

        [SerializeField]
        private string dialogueStyle = "Short";

        [SerializeField]
        private string authorityProfile = "Low";

        [SerializeField]
        private string anchorName = "StoreBuilding";

        [SerializeField]
        private GameObject prefab = null;

        [SerializeField]
        private Vector3 spawnOffset = Vector3.zero;

        [SerializeField]
        private bool isPolice = false;

        [SerializeField]
        private int spawnCount = 2;

        [SerializeField]
        private float speed = 1.2f;

        [SerializeField]
        private float stoppingDistance = 0.2f;

        [SerializeField]
        private int avoidancePriority = 55;

        public string NpcId => npcId;
        public string RoleName => roleName;
        public string Organization => organization;
        public string Routine => routine;
        public IReadOnlyList<string> RoutineAnchors => routineAnchors;
        public string PerceptionProfile => perceptionProfile;
        public string InjectionProfile => injectionProfile;
        public string DialogueStyle => dialogueStyle;
        public string AuthorityProfile => authorityProfile;
        public string AnchorName => anchorName;
        public GameObject Prefab => prefab;
        public Vector3 SpawnOffset => spawnOffset;
        public bool IsPolice => isPolice;
        public int SpawnCount => spawnCount;
        public float Speed => speed;
        public float StoppingDistance => stoppingDistance;
        public int AvoidancePriority => avoidancePriority;
    }
}
