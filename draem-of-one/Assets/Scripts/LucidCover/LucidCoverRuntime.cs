using UnityEngine;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Runtime holder for LucidCover content references (e.g., DreamLawDatabase).
    /// This avoids requiring Resources/Addressables for early v1 prototypes.
    /// </summary>
    public sealed class LucidCoverRuntime : MonoBehaviour
    {
        [SerializeField]
        private DreamLawDatabase dreamLawDatabase = null;

        public DreamLawDatabase DreamLawDatabase => dreamLawDatabase;

        public void Configure(DreamLawDatabase database)
        {
            dreamLawDatabase = database;
        }
    }
}

