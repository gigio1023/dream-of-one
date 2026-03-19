using UnityEngine;

namespace DreamOfOne.Core
{
    public sealed class NpcPerception : MonoBehaviour
    {
        [Range(0f, 100f)]
        public float suspicion = 0f;

        [SerializeField]
        [Range(0f, 50f)]
        private float viewDistanceMeters = 10f;

        [SerializeField]
        [Range(0f, 180f)]
        private float viewAngleDegrees = 110f;

        public float GetWitnessFactor(Vector3 eventWorldPosition)
        {
            Vector3 toEvent = eventWorldPosition - transform.position;
            float distance = toEvent.magnitude;
            if (distance > viewDistanceMeters)
            {
                return 0f;
            }

            Vector3 forward = transform.forward;
            float angle = Vector3.Angle(forward, toEvent);
            if (angle > viewAngleDegrees * 0.5f)
            {
                return 0f;
            }

            // Simple falloff by distance; clamp to [0..1]
            float factor = 1f - Mathf.InverseLerp(0f, viewDistanceMeters, distance);
            return Mathf.Clamp01(factor);
        }
    }
}


