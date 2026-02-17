using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Building Definition", fileName = "BuildingDefinition")]
    public sealed class BuildingDefinition : ScriptableObject
    {
        [SerializeField]
        private string buildingId = "Building";

        [SerializeField]
        private string displayName = "Building";

        [SerializeField]
        private string anchorName = "StoreBuilding";

        [SerializeField]
        private GameObject exteriorPrefab = null;

        [SerializeField]
        private GameObject signagePrefab = null;

        [SerializeField]
        private List<GameObject> keyProps = new();

        [SerializeField]
        private Vector3 exteriorOffset = Vector3.zero;

        [SerializeField]
        private Vector3 exteriorRotationEuler = Vector3.zero;

        [SerializeField]
        private GameObject interiorPrefab = null;

        [SerializeField]
        private Vector3 interiorLocalOffset = Vector3.zero;

        [SerializeField]
        [Tooltip("실내 포탈의 로컬 위치(인테리어 기준)")]
        private Vector3 interiorPortalLocalOffset = new Vector3(0f, 0.1f, -3f);

        [SerializeField]
        [Tooltip("실외 포탈 위치 오프셋 (앵커 기준)")]
        private Vector3 exteriorPortalOffset = new Vector3(0f, 0f, 2.2f);

        [SerializeField]
        [Tooltip("도어웨이 기준 로컬 오프셋")]
        private Vector3 doorwayLocalOffset = new Vector3(0f, 0f, 2f);

        [SerializeField]
        [Tooltip("도어웨이 기준 크기")]
        private Vector3 doorwaySize = new Vector3(2f, 2.4f, 0.5f);

        public string BuildingId => buildingId;
        public string DisplayName => displayName;
        public string AnchorName => anchorName;
        public GameObject ExteriorPrefab => exteriorPrefab;
        public GameObject SignagePrefab => signagePrefab;
        public IReadOnlyList<GameObject> KeyProps => keyProps;
        public Vector3 ExteriorOffset => exteriorOffset;
        public Vector3 ExteriorRotationEuler => exteriorRotationEuler;
        public GameObject InteriorPrefab => interiorPrefab;
        public Vector3 InteriorLocalOffset => interiorLocalOffset;
        public Vector3 InteriorPortalLocalOffset => interiorPortalLocalOffset;
        public Vector3 ExteriorPortalOffset => exteriorPortalOffset;
        public Vector3 DoorwayLocalOffset => doorwayLocalOffset;
        public Vector3 DoorwaySize => doorwaySize;
    }
}
