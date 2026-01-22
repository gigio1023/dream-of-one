using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 조직이 스스로 업무 절차를 진행하는 간단한 루틴.
    /// </summary>
    public sealed class OrganizationRoutineSystem : MonoBehaviour
    {
        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private Transform studioAnchor = null;

        [SerializeField]
        private Transform storeAnchor = null;

        [SerializeField]
        private Transform parkAnchor = null;

        [SerializeField]
        private Transform stationAnchor = null;

        [SerializeField]
        private float studioStepInterval = 18f;

        [SerializeField]
        private float storeInterval = 22f;

        [SerializeField]
        private float parkInterval = 26f;

        [SerializeField]
        private float stationInterval = 30f;

        private float nextStudioTime = 0f;
        private float nextStoreTime = 0f;
        private float nextParkTime = 0f;
        private float nextStationTime = 0f;
        private StudioStep studioStep = StudioStep.Kanban;

        private enum StudioStep
        {
            Kanban,
            PatchNotes,
            Approval,
            RcInsert
        }

        private void Awake()
        {
            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            ResolveAnchors();
            nextStudioTime = Time.time + 4f;
            nextStoreTime = Time.time + 6f;
            nextParkTime = Time.time + 8f;
            nextStationTime = Time.time + 10f;
        }

        private void Update()
        {
            if (eventLog == null)
            {
                return;
            }

            float now = Time.time;
            if (now >= nextStudioTime)
            {
                EmitStudioEvent();
                nextStudioTime = now + studioStepInterval;
            }

            if (now >= nextStoreTime)
            {
                EmitStoreEvent();
                nextStoreTime = now + storeInterval;
            }

            if (now >= nextParkTime)
            {
                EmitParkEvent();
                nextParkTime = now + parkInterval;
            }

            if (now >= nextStationTime)
            {
                EmitStationEvent();
                nextStationTime = now + stationInterval;
            }
        }

        private void EmitStudioEvent()
        {
            switch (studioStep)
            {
                case StudioStep.Kanban:
                    RecordProcedure("Studio", "Studio", "StudioPhoto", EventType.TaskStarted, "칸반 갱신", studioAnchor);
                    studioStep = StudioStep.PatchNotes;
                    break;
                case StudioStep.PatchNotes:
                    RecordProcedure("Studio", "Studio", "StudioPhoto", EventType.TaskCompleted, "패치노트 작성", studioAnchor);
                    MaybeEmitProcedureViolation("PROC_NOTE_MISSING", "패치노트 누락 의심", studioAnchor);
                    studioStep = StudioStep.Approval;
                    break;
                case StudioStep.Approval:
                    RecordProcedure("Studio", "Studio", "StudioPhoto", EventType.ApprovalGranted, "PM 승인", studioAnchor);
                    MaybeEmitProcedureViolation("PROC_APPROVAL_DELAY", "승인 지연 의심", studioAnchor);
                    studioStep = StudioStep.RcInsert;
                    break;
                case StudioStep.RcInsert:
                    RecordProcedure("Studio", "Studio", "StudioPhoto", EventType.RcInserted, "RC 삽입", studioAnchor);
                    MaybeEmitProcedureViolation("PROC_RC_SKIP", "RC 절차 누락 의심", studioAnchor);
                    studioStep = StudioStep.Kanban;
                    break;
            }
        }

        private void EmitStoreEvent()
        {
            int roll = Random.Range(0, 3);
            switch (roll)
            {
                case 0:
                    RecordOrg("Clerk", "Store", "StoreQueue", EventType.LabelChanged, "가격 라벨 갱신", storeAnchor);
                    MaybeEmitViolation("Store", "StoreQueue", "R_LABEL", "라벨 오류 의심", storeAnchor);
                    break;
                case 1:
                    RecordOrg("Clerk", "Store", "StoreQueue", EventType.PaymentProcessed, "결제 처리", storeAnchor);
                    break;
                default:
                    RecordOrg("Clerk", "Store", "StoreQueue", EventType.QueueUpdated, "줄 안내", storeAnchor);
                    MaybeEmitViolation("Store", "StoreQueue", "R_QUEUE", "새치기 의심", storeAnchor);
                    break;
            }
        }

        private void EmitParkEvent()
        {
            int roll = Random.Range(0, 3);
            switch (roll)
            {
                case 0:
                    RecordOrg("Elder", "Park", "ParkSeat", EventType.SeatClaimed, "좌석 사용", parkAnchor);
                    break;
                default:
                    RecordOrg("Elder", "Park", "ParkSeat", EventType.NoiseObserved, "소음 주의", parkAnchor);
                    RecordProcedure("Park", "Park", "ParkSeat", EventType.TaskCompleted, "조치 보고", parkAnchor);
                    MaybeEmitViolation("Park", "ParkSeat", "R_NOISE", "소음 민원", parkAnchor);
                    break;
            }
        }

        private void EmitStationEvent()
        {
            int roll = Random.Range(0, 2);
            switch (roll)
            {
                case 0:
                    RecordEvidence("Police", "Station", "Station", EventType.CctvCaptured, "CCTV 캡처", stationAnchor);
                    break;
                default:
                    RecordEvidence("Police", "Station", "Station", EventType.TicketIssued, "티켓 발부", stationAnchor);
                    break;
            }
        }

        private void RecordProcedure(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor)
        {
            RecordEvent(actorId, placeId, zoneId, type, EventCategory.Procedure, note, anchor);
        }

        private void RecordOrg(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor)
        {
            RecordEvent(actorId, placeId, zoneId, type, EventCategory.Organization, note, anchor);
        }

        private void RecordEvidence(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor)
        {
            RecordEvent(actorId, placeId, zoneId, type, EventCategory.Evidence, note, anchor);
        }

        private void MaybeEmitViolation(string placeId, string zoneId, string ruleId, string note, Transform anchor)
        {
            if (Random.value < 0.25f)
            {
                RecordEvent("Citizen", placeId, zoneId, EventType.ViolationDetected, EventCategory.Rule, note, anchor, ruleId);
            }
        }

        private void MaybeEmitProcedureViolation(string ruleId, string note, Transform anchor)
        {
            if (Random.value < 0.2f)
            {
                RecordEvent("Studio", "Studio", "StudioPhoto", EventType.ViolationDetected, EventCategory.Rule, note, anchor, ruleId);
            }
        }

        private void RecordEvent(string actorId, string placeId, string zoneId, EventType type, EventCategory category, string note, Transform anchor, string ruleId = "")
        {
            eventLog.RecordEvent(new EventRecord
            {
                actorId = actorId,
                actorRole = actorId,
                eventType = type,
                category = category,
                placeId = placeId,
                zoneId = zoneId,
                topic = string.IsNullOrEmpty(ruleId) ? note : ruleId,
                note = note,
                position = anchor != null ? anchor.position : Vector3.zero,
                severity = type is EventType.CctvCaptured or EventType.TicketIssued or EventType.ViolationDetected ? 2 : 1,
                ruleId = ruleId
            });
        }

        private void ResolveAnchors()
        {
            if (storeAnchor == null)
            {
                storeAnchor = FindAnchor("StoreBuilding") ?? FindAnchor("QueueZone");
            }

            if (parkAnchor == null)
            {
                parkAnchor = FindAnchor("ParkArea") ?? FindAnchor("SeatZone");
            }

            if (studioAnchor == null)
            {
                studioAnchor = FindAnchor("StudioBuilding_L1") ?? FindAnchor("PhotoZone");
            }

            if (stationAnchor == null)
            {
                stationAnchor = FindAnchor("Station") ?? FindAnchor("Police");
            }
        }

        private Transform FindAnchor(string name)
        {
            var go = GameObject.Find(name);
            return go != null ? go.transform : null;
        }
    }
}
