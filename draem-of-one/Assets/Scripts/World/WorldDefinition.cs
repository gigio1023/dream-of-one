using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/World Definition", fileName = "WorldDefinition")]
    public sealed class WorldDefinition : ScriptableObject
    {
        [SerializeField]
        private string worldId = "DreamOfOne_World";

        [SerializeField]
        private WorldSeedMode seedMode = WorldSeedMode.Fixed;

        [SerializeField]
        private int seed = 1024;

        [SerializeField]
        private List<BuildingDefinition> buildings = new();

        [SerializeField]
        private List<InteractableDefinition> interactables = new();

        [SerializeField]
        private List<ZoneDefinition> zones = new();

        [SerializeField]
        private List<NpcDefinition> npcs = new();

        [SerializeField]
        private List<IncidentDefinition> incidents = new();

        [SerializeField]
        private RulesetDefinition ruleset = null;

        [SerializeField]
        private List<PolicyPackDefinition> policyPacks = new();

        [SerializeField]
        private WorldBudgetDefinition budgets = null;

        [SerializeField]
        [Tooltip("Interiors를 자동 배치할 때 사용할 기준 위치")]
        private Vector3 interiorRootPosition = new Vector3(0f, 0f, 80f);

        [SerializeField]
        [Tooltip("자동 배치 시 내부 씬 간격 (x 방향)")]
        private float interiorSpacing = 18f;

        public string WorldId => worldId;
        public WorldSeedMode SeedMode => seedMode;
        public int Seed => seed;
        public IReadOnlyList<BuildingDefinition> Buildings => buildings;
        public IReadOnlyList<InteractableDefinition> Interactables => interactables;
        public IReadOnlyList<ZoneDefinition> Zones => zones;
        public IReadOnlyList<NpcDefinition> Npcs => npcs;
        public IReadOnlyList<IncidentDefinition> Incidents => incidents;
        public RulesetDefinition Ruleset => ruleset;
        public IReadOnlyList<PolicyPackDefinition> PolicyPacks => policyPacks;
        public WorldBudgetDefinition Budgets => budgets;
        public Vector3 InteriorRootPosition => interiorRootPosition;
        public float InteriorSpacing => interiorSpacing;
    }
}
