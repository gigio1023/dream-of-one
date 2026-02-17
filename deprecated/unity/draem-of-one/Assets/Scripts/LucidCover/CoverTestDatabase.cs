using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.LucidCover
{
    [CreateAssetMenu(menuName = "DreamOfOne/LucidCover/Cover Test Database", fileName = "CoverTestDatabase")]
    public sealed class CoverTestDatabase : ScriptableObject
    {
        [SerializeField]
        private List<CoverTestDefinition> coverTests = new();

        [System.NonSerialized]
        private Dictionary<string, CoverTestDefinition> lookup = null;

        private void OnEnable()
        {
            lookup = null;
        }

        public IReadOnlyList<CoverTestDefinition> CoverTests => coverTests;

        public bool TryGet(string coverTestId, out CoverTestDefinition definition)
        {
            definition = null;
            if (string.IsNullOrEmpty(coverTestId))
            {
                return false;
            }

            EnsureLookup();
            return lookup != null && lookup.TryGetValue(coverTestId, out definition) && definition != null;
        }

        private void EnsureLookup()
        {
            if (lookup != null)
            {
                return;
            }

            lookup = new Dictionary<string, CoverTestDefinition>(System.StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < coverTests.Count; i++)
            {
                var test = coverTests[i];
                if (test == null || string.IsNullOrEmpty(test.CoverTestId))
                {
                    continue;
                }

                if (!lookup.ContainsKey(test.CoverTestId))
                {
                    lookup.Add(test.CoverTestId, test);
                }
            }
        }
    }
}

