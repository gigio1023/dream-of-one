using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.LucidCover
{
    [CreateAssetMenu(menuName = "DreamOfOne/LucidCover/Dream Law Database", fileName = "DreamLawDatabase")]
    public sealed class DreamLawDatabase : ScriptableObject
    {
        [SerializeField]
        private List<DreamLawDefinition> dreamLaws = new();

        [System.NonSerialized]
        private Dictionary<string, DreamLawDefinition> lookup = null;

        private void OnEnable()
        {
            lookup = null;
        }

        public IReadOnlyList<DreamLawDefinition> DreamLaws => dreamLaws;

        public bool TryGet(string dreamLawId, out DreamLawDefinition definition)
        {
            definition = null;
            if (string.IsNullOrEmpty(dreamLawId))
            {
                return false;
            }

            EnsureLookup();
            return lookup != null && lookup.TryGetValue(dreamLawId, out definition) && definition != null;
        }

        private void EnsureLookup()
        {
            if (lookup != null)
            {
                return;
            }

            lookup = new Dictionary<string, DreamLawDefinition>(System.StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < dreamLaws.Count; i++)
            {
                var law = dreamLaws[i];
                if (law == null || string.IsNullOrEmpty(law.DreamLawId))
                {
                    continue;
                }

                if (!lookup.ContainsKey(law.DreamLawId))
                {
                    lookup.Add(law.DreamLawId, law);
                }
            }
        }
    }
}

