using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/World Definition", fileName = "WorldDefinition")]
    public sealed class WorldDefinition : ScriptableObject
    {
        [SerializeField]
        private List<BuildingDefinition> buildings = new();

        [SerializeField]
        private List<InteractableDefinition> interactables = new();

        [SerializeField]
        private List<NpcDefinition> npcs = new();

        [SerializeField]
        private List<IncidentDefinition> incidents = new();

        [SerializeField]
        [Tooltip("Interiors를 자동 배치할 때 사용할 기준 위치")]
        private Vector3 interiorRootPosition = new Vector3(0f, 0f, 80f);

        [SerializeField]
        [Tooltip("자동 배치 시 내부 씬 간격 (x 방향)")]
        private float interiorSpacing = 18f;

        public IReadOnlyList<BuildingDefinition> Buildings => buildings;
        public IReadOnlyList<InteractableDefinition> Interactables => interactables;
        public IReadOnlyList<NpcDefinition> Npcs => npcs;
        public IReadOnlyList<IncidentDefinition> Incidents => incidents;
        public Vector3 InteriorRootPosition => interiorRootPosition;
        public float InteriorSpacing => interiorSpacing;
    }
}
