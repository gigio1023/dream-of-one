using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.LucidCover
{
    [CreateAssetMenu(menuName = "DreamOfOne/LucidCover/Text Surface Database", fileName = "TextSurfaceDatabase")]
    public sealed class TextSurfaceDatabase : ScriptableObject
    {
        [SerializeField]
        private List<TextSurfaceDefinition> textSurfaces = new();

        [System.NonSerialized]
        private Dictionary<string, TextSurfaceDefinition> lookup = null;

        private void OnEnable()
        {
            lookup = null;
        }

        public IReadOnlyList<TextSurfaceDefinition> TextSurfaces => textSurfaces;

        public bool TryGet(string textSurfaceId, out TextSurfaceDefinition definition)
        {
            definition = null;
            if (string.IsNullOrEmpty(textSurfaceId))
            {
                return false;
            }

            EnsureLookup();
            return lookup != null && lookup.TryGetValue(textSurfaceId, out definition) && definition != null;
        }

        private void EnsureLookup()
        {
            if (lookup != null)
            {
                return;
            }

            lookup = new Dictionary<string, TextSurfaceDefinition>(System.StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < textSurfaces.Count; i++)
            {
                var surface = textSurfaces[i];
                if (surface == null || string.IsNullOrEmpty(surface.TextSurfaceId))
                {
                    continue;
                }

                if (!lookup.ContainsKey(surface.TextSurfaceId))
                {
                    lookup.Add(surface.TextSurfaceId, surface);
                }
            }
        }
    }
}

