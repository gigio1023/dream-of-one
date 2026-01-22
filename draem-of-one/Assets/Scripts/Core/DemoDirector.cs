using System;
using System.Collections;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 데모 시퀀스를 보장하는 연출 컨트롤러.
    /// </summary>
    public sealed class DemoDirector : MonoBehaviour
    {
        [SerializeField]
        private bool autoPlay = true;

        [SerializeField]
        private float act1Delay = 2f;

        [SerializeField]
        private float act2Delay = 20f;

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private ReportManager reportManager = null;

        [SerializeField]
        private Transform queueZone = null;

        [SerializeField]
        private Transform studioZone = null;

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (reportManager == null)
            {
                reportManager = FindFirstObjectByType<ReportManager>();
            }

            if (queueZone == null)
            {
                queueZone = ResolveZoneAnchor("StoreQueue");
            }

            if (studioZone == null)
            {
                studioZone = ResolveZoneAnchor("StudioPhoto");
            }
        }

        private Transform ResolveZoneAnchor(string zoneId)
        {
            if (string.IsNullOrEmpty(zoneId))
            {
                return null;
            }

            var direct = GameObject.Find(zoneId);
            if (direct != null)
            {
                return direct.transform;
            }

            var zoned = GameObject.Find($"{zoneId}Zone");
            return zoned != null ? zoned.transform : null;
        }

        private void Start()
        {
            if (autoPlay)
            {
                StartCoroutine(RunSequence());
            }
        }

        private IEnumerator RunSequence()
        {
            yield return new WaitForSeconds(act1Delay);
            var act1EventId = EmitViolation("Player", "Store", "StoreQueue", "R_QUEUE", "새치기 의심", queueZone);
            yield return new WaitForSeconds(2f);
            FileReport("Clerk", "R_QUEUE", act1EventId, queueZone);
            FileReport("Elder", "R_QUEUE", act1EventId, queueZone);

            yield return new WaitForSeconds(act2Delay);
            var act2EventId = EmitViolation("Player", "Studio", "StudioPhoto", "PROC_RC_SKIP", "RC 절차 누락 의심", studioZone);
            yield return new WaitForSeconds(2f);
            EmitProcedure("Studio", "Studio", "StudioPhoto", EventType.ApprovalGranted, "PM 승인", studioZone);
            EmitProcedure("Studio", "Studio", "StudioPhoto", EventType.RcInserted, "RC 삽입", studioZone);
            FileReport("Clerk", "PROC_RC_SKIP", act2EventId, studioZone);
            FileReport("Tourist", "PROC_RC_SKIP", act2EventId, studioZone);
        }

        private string EmitViolation(string actorId, string placeId, string zoneId, string ruleId, string note, Transform anchor)
        {
            if (eventLog == null)
            {
                return string.Empty;
            }

            string id = Guid.NewGuid().ToString("N");
            eventLog.RecordEvent(new EventRecord
            {
                id = id,
                actorId = actorId,
                actorRole = actorId,
                eventType = EventType.ViolationDetected,
                category = EventCategory.Rule,
                ruleId = ruleId,
                topic = ruleId,
                note = note,
                placeId = placeId,
                zoneId = zoneId,
                position = anchor != null ? anchor.position : Vector3.zero,
                severity = 2
            });

            return id;
        }

        private void EmitProcedure(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor)
        {
            if (eventLog == null)
            {
                return;
            }

            eventLog.RecordEvent(new EventRecord
            {
                actorId = actorId,
                actorRole = actorId,
                eventType = type,
                category = EventCategory.Procedure,
                note = note,
                topic = note,
                placeId = placeId,
                zoneId = zoneId,
                position = anchor != null ? anchor.position : Vector3.zero,
                severity = 1
            });
        }

        private void FileReport(string reporterId, string ruleId, string eventId, Transform anchor)
        {
            if (reportManager == null)
            {
                return;
            }

            reportManager.FileReport(reporterId, ruleId, 50f, eventId, anchor != null ? anchor.position : Vector3.zero);
        }
    }
}
