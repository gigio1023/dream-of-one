using UnityEngine;

namespace DreamOfOne.LucidCover
{
    [CreateAssetMenu(menuName = "DreamOfOne/LucidCover/Text Surface", fileName = "TextSurfaceDefinition")]
    public sealed class TextSurfaceDefinition : ScriptableObject
    {
        [SerializeField]
        private string textSurfaceId = "TS_STORE_QUEUE_SIGN";

        [SerializeField]
        private TextSurfaceKind kind = TextSurfaceKind.Signage;

        [SerializeField]
        private string anchorName = "StoreBuilding";

        [SerializeField]
        private GameObject prefab = null;

        [SerializeField]
        private Vector3 localOffset = Vector3.zero;

        [SerializeField]
        private Vector3 localRotationEuler = Vector3.zero;

        [SerializeField]
        private string prompt = "E: Read";

        [SerializeField]
        [TextArea(2, 8)]
        private string surfaceText = string.Empty;

        [SerializeField]
        [Tooltip("DreamLawIds revealed by this surface (>= 1 recommended).")]
        private string[] dreamLawIds = System.Array.Empty<string>();

        [SerializeField]
        [Tooltip("Optional placeId override (defaults to anchorName).")]
        private string placeId = string.Empty;

        [SerializeField]
        private Vector3 triggerSize = new Vector3(2f, 2f, 2f);

        public string TextSurfaceId => textSurfaceId;
        public TextSurfaceKind Kind => kind;
        public string AnchorName => anchorName;
        public GameObject Prefab => prefab;
        public Vector3 LocalOffset => localOffset;
        public Vector3 LocalRotationEuler => localRotationEuler;
        public string Prompt => prompt;
        public string SurfaceText => surfaceText;
        public string[] DreamLawIds => dreamLawIds;
        public string PlaceId => placeId;
        public Vector3 TriggerSize => triggerSize;
    }
}

