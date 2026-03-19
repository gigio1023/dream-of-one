using UnityEngine;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Runtime instance spawned from TextSurfaceDefinition.
    /// Phase 1 only stores content + DreamLawId references (interaction comes later).
    /// </summary>
    public sealed class TextSurface : MonoBehaviour
    {
        [SerializeField]
        private string textSurfaceId = string.Empty;

        [SerializeField]
        private TextSurfaceKind kind = TextSurfaceKind.Other;

        [SerializeField]
        [TextArea(2, 8)]
        private string surfaceText = string.Empty;

        [SerializeField]
        private string[] dreamLawIds = System.Array.Empty<string>();

        [SerializeField]
        private string placeId = string.Empty;

        public string TextSurfaceId => textSurfaceId;
        public TextSurfaceKind Kind => kind;
        public string SurfaceText => surfaceText;
        public string[] DreamLawIds => dreamLawIds;
        public string PlaceId => placeId;

        public void Configure(TextSurfaceDefinition definition, string resolvedPlaceId)
        {
            if (definition == null)
            {
                return;
            }

            textSurfaceId = definition.TextSurfaceId ?? string.Empty;
            kind = definition.Kind;
            surfaceText = definition.SurfaceText ?? string.Empty;
            dreamLawIds = definition.DreamLawIds ?? System.Array.Empty<string>();
            placeId = resolvedPlaceId ?? string.Empty;
        }
    }
}

