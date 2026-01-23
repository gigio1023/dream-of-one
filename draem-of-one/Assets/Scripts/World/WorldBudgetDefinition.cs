using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/World Budget", fileName = "WorldBudget")]
    public sealed class WorldBudgetDefinition : ScriptableObject
    {
        [SerializeField]
        private int npcMax = 16;

        [SerializeField]
        private float eventRateBaseline = 3f;

        [SerializeField]
        private float eventRatePeak = 10f;

        [SerializeField]
        private int blackboardCapacity = 10;

        [SerializeField]
        private string steadyAllocationTarget = "0B";

        public int NpcMax => npcMax;
        public float EventRateBaseline => eventRateBaseline;
        public float EventRatePeak => eventRatePeak;
        public int BlackboardCapacity => blackboardCapacity;
        public string SteadyAllocationTarget => steadyAllocationTarget;
    }
}
