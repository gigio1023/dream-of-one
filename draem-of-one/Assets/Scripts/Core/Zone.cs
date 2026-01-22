using DreamOfOne.NPC;
using UnityEngine;

namespace DreamOfOne.Core
{
    public enum ZoneType
    {
        None,
        Queue,
        Seat,
        Photo
    }

    /// <summary>
    /// Queue/Seat/Photo 영역을 나타내는 공통 트리거.
    /// OnTriggerEnter/Exit만 처리하여 나머지는 이벤트 시스템이 맡도록 한다.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class Zone : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("Zone의 논리적 종류. 규칙 로직에서 참조한다.")]
        private ZoneType zoneType = ZoneType.None;

        [SerializeField]
        [Tooltip("UI와 로그에서 식별할 고유 ID")]
        private string zoneId = "Zone";

        [SerializeField]
        [Tooltip("Zone 이벤트를 기록할 WorldEventLog 참조")]
        private WorldEventLog eventLog = null;

        private Collider cachedCollider = null;

        public string ZoneId => zoneId;
        public ZoneType ZoneType => zoneType;

        public void Configure(string id, ZoneType type, WorldEventLog log)
        {
            zoneId = id;
            zoneType = type;
            eventLog = log;
        }

        private void Reset()
        {
            cachedCollider = GetComponent<Collider>();
            cachedCollider.isTrigger = true;
        }

        private void Awake()
        {
            cachedCollider = GetComponent<Collider>();
            cachedCollider.isTrigger = true;
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (string.IsNullOrEmpty(zoneId))
            {
                zoneId = name;
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            RecordZoneEvent(other, true);
        }

        private void OnTriggerExit(Collider other)
        {
            RecordZoneEvent(other, false);
        }

        /// <summary>
        /// 충돌체 이름만으로 간단히 이벤트를 남긴다. Player/NPC 모두 공통 경로 사용.
        /// </summary>
        private void RecordZoneEvent(Collider other, bool entered)
        {
            if (eventLog == null)
            {
                return;
            }

            bool isPlayer = other.CompareTag("Player");
            bool isNpc = other.GetComponentInParent<NPCBase>() != null;
            if (!isPlayer && !isNpc)
            {
                return;
            }

            string actorId = other.gameObject.name;
            eventLog.RecordZoneEvent(actorId, zoneId, zoneType, entered, transform.position);
        }

        private void OnDrawGizmos()
        {
            Gizmos.color = zoneType switch
            {
                ZoneType.Queue => new Color(0.8f, 0.6f, 0.2f, 0.6f),
                ZoneType.Seat => new Color(0.2f, 0.8f, 0.4f, 0.6f),
                ZoneType.Photo => new Color(0.4f, 0.6f, 0.9f, 0.6f),
                _ => new Color(0.7f, 0.7f, 0.7f, 0.6f)
            };

            if (TryGetComponent<Collider>(out var col))
            {
                Gizmos.matrix = transform.localToWorldMatrix;
                if (col is BoxCollider box)
                {
                    Gizmos.DrawCube(box.center, box.size);
                }
                else if (col is SphereCollider sphere)
                {
                    Gizmos.DrawSphere(sphere.center, sphere.radius);
                }
            }
        }
    }
}
