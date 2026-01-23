using System.Collections.Generic;
using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.World
{
    [CreateAssetMenu(menuName = "DreamOfOne/World/Zone Definition", fileName = "ZoneDefinition")]
    public sealed class ZoneDefinition : ScriptableObject
    {
        [SerializeField]
        private string zoneId = "Zone";

        [SerializeField]
        private ZoneShape shape = ZoneShape.Box;

        [SerializeField]
        private ZoneType zoneType = ZoneType.None;

        [SerializeField]
        private Vector3 center = Vector3.zero;

        [SerializeField]
        private Vector3 size = new Vector3(3f, 2f, 3f);

        [SerializeField]
        private List<Vector3> points = new();

        [SerializeField]
        private int blackboardCapacity = 10;

        [SerializeField]
        private float ttlSeconds = 120f;

        [SerializeField]
        private float noiseRadius = 6f;

        [SerializeField]
        private string injectionProfile = "Default";

        public string ZoneId => zoneId;
        public ZoneShape Shape => shape;
        public ZoneType ZoneType => zoneType;
        public Vector3 Center => center;
        public Vector3 Size => size;
        public IReadOnlyList<Vector3> Points => points;
        public int BlackboardCapacity => blackboardCapacity;
        public float TtlSeconds => ttlSeconds;
        public float NoiseRadius => noiseRadius;
        public string InjectionProfile => injectionProfile;
    }
}
