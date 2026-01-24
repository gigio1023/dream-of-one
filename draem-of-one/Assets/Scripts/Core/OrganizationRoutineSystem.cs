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
        private Transform cafeAnchor = null;

        [SerializeField]
        private Transform deliveryAnchor = null;

        [SerializeField]
        private Transform facilityAnchor = null;

        [SerializeField]
        private Transform mediaAnchor = null;

        [SerializeField]
        private float studioStepInterval = 18f;

        [SerializeField]
        private float storeInterval = 22f;

        [SerializeField]
        private float parkInterval = 26f;

        [SerializeField]
        private float stationInterval = 30f;

        [SerializeField]
        private float cafeInterval = 24f;

        [SerializeField]
        private float deliveryInterval = 28f;

        [SerializeField]
        private float facilityInterval = 32f;

        [SerializeField]
        private float mediaInterval = 34f;

        [SerializeField]
        [Tooltip("조직 이벤트 발생 시 해당 NPC를 앵커 근처로 이동시킴")]
        private bool snapActorsToAnchor = true;

        private float nextStudioTime = 0f;
        private float nextStoreTime = 0f;
        private float nextParkTime = 0f;
        private float nextStationTime = 0f;
        private float nextCafeTime = 0f;
        private float nextDeliveryTime = 0f;
        private float nextFacilityTime = 0f;
        private float nextMediaTime = 0f;
        private StudioStep studioStep = StudioStep.Kanban;
        private int storeStepIndex = 0;
        private int parkStepIndex = 0;
        private int stationStepIndex = 0;
        private int cafeStepIndex = 0;
        private int deliveryStepIndex = 0;
        private int facilityStepIndex = 0;
        private int mediaStepIndex = 0;
        private int studioViolationCounter = 0;
        private int storeLabelViolationCounter = 0;
        private int storeQueueViolationCounter = 0;
        private int parkViolationCounter = 0;
        private int stationViolationCounter = 0;
        private int cafeViolationCounter = 0;
        private int deliveryViolationCounter = 0;
        private int facilityViolationCounter = 0;
        private int mediaViolationCounter = 0;

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
            nextCafeTime = Time.time + 12f;
            nextDeliveryTime = Time.time + 14f;
            nextFacilityTime = Time.time + 16f;
            nextMediaTime = Time.time + 18f;
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

            if (now >= nextCafeTime)
            {
                EmitCafeEvent();
                nextCafeTime = now + cafeInterval;
            }

            if (now >= nextDeliveryTime)
            {
                EmitDeliveryEvent();
                nextDeliveryTime = now + deliveryInterval;
            }

            if (now >= nextFacilityTime)
            {
                EmitFacilityEvent();
                nextFacilityTime = now + facilityInterval;
            }

            if (now >= nextMediaTime)
            {
                EmitMediaEvent();
                nextMediaTime = now + mediaInterval;
            }
        }

        private void EmitStudioEvent()
        {
            switch (studioStep)
            {
                case StudioStep.Kanban:
                    RecordProcedure("PM", "Studio", "StudioPhoto", EventType.TaskStarted, "칸반 갱신", studioAnchor, "PROC_STUDIO_KANBAN");
                    studioStep = StudioStep.PatchNotes;
                    break;
                case StudioStep.PatchNotes:
                    RecordProcedure("Developer", "Studio", "StudioPhoto", EventType.TaskCompleted, "패치노트 작성", studioAnchor, "PROC_STUDIO_PATCH");
                    EmitViolationEvery("Studio", "StudioPhoto", "PROC_NOTE_MISSING", "패치노트 누락 의심", studioAnchor, ref studioViolationCounter, 4);
                    studioStep = StudioStep.Approval;
                    break;
                case StudioStep.Approval:
                    RecordProcedure("PM", "Studio", "StudioPhoto", EventType.ApprovalGranted, "PM 승인", studioAnchor, "PROC_STUDIO_APPROVAL");
                    EmitViolationEvery("Studio", "StudioPhoto", "PROC_APPROVAL_DELAY", "승인 지연 의심", studioAnchor, ref studioViolationCounter, 6);
                    studioStep = StudioStep.RcInsert;
                    break;
                case StudioStep.RcInsert:
                    RecordProcedure("Release", "Studio", "StudioPhoto", EventType.RcInserted, "RC 삽입", studioAnchor, "PROC_STUDIO_RC");
                    EmitViolationEvery("Studio", "StudioPhoto", "PROC_RC_SKIP", "RC 절차 누락 의심", studioAnchor, ref studioViolationCounter, 5);
                    studioStep = StudioStep.Kanban;
                    break;
            }
        }

        private void EmitStoreEvent()
        {
            switch (storeStepIndex)
            {
                case 0:
                    RecordOrg("Clerk", "Store", "StoreQueue", EventType.LabelChanged, "가격 라벨 갱신", storeAnchor, "PROC_STORE_LABEL");
                    EmitViolationEvery("Store", "StoreQueue", "R_LABEL", "라벨 오류 의심", storeAnchor, ref storeLabelViolationCounter, 3);
                    break;
                case 1:
                    RecordOrg("Clerk", "Store", "StoreQueue", EventType.PaymentProcessed, "결제 처리", storeAnchor, "PROC_STORE_PAYMENT");
                    break;
                default:
                    RecordOrg("Clerk", "Store", "StoreQueue", EventType.QueueUpdated, "줄 안내", storeAnchor, "PROC_STORE_QUEUE");
                    EmitViolationEvery("Store", "StoreQueue", "R_QUEUE", "새치기 의심", storeAnchor, ref storeQueueViolationCounter, 2);
                    break;
            }

            storeStepIndex = (storeStepIndex + 1) % 3;
        }

        private void EmitParkEvent()
        {
            switch (parkStepIndex)
            {
                case 0:
                    RecordProcedure("Caretaker", "Park", "ParkSeat", EventType.TaskStarted, "순찰", parkAnchor, "PROC_PARK_PATROL");
                    break;
                case 1:
                    RecordOrg("Elder", "Park", "ParkSeat", EventType.NoiseObserved, "소음 점검", parkAnchor, "PROC_PARK_NOISE_CHECK");
                    EmitViolationEvery("Park", "ParkSeat", "R_NOISE", "소음 민원", parkAnchor, ref parkViolationCounter, 3);
                    break;
                default:
                    RecordProcedure("Caretaker", "Park", "ParkSeat", EventType.TaskCompleted, "조치 보고", parkAnchor, "PROC_PARK_REPORT");
                    break;
            }

            parkStepIndex = (parkStepIndex + 1) % 3;
        }

        private void EmitStationEvent()
        {
            if (stationAnchor == null)
            {
                return;
            }

            switch (stationStepIndex)
            {
                case 0:
                    RecordEvidence("Officer", "Station", "PoliceReport", EventType.CctvCaptured, "CCTV 캡처", stationAnchor, "PROC_STATION_CCTV");
                    break;
                case 1:
                    RecordEvidence("Officer", "Station", "PoliceReport", EventType.TicketIssued, "티켓 발부", stationAnchor, "PROC_STATION_TICKET");
                    break;
                default:
                    RecordProcedure("Officer", "Station", "PoliceReport", EventType.InterrogationStarted, "심문 시작", stationAnchor, "PROC_INTERROGATION");
                    EmitViolationEvery("Station", "PoliceReport", "PROC_INTERROGATION_DELAY", "심문 지연 의심", stationAnchor, ref stationViolationCounter, 4);
                    break;
            }

            stationStepIndex = (stationStepIndex + 1) % 3;
        }

        private void EmitCafeEvent()
        {
            if (cafeAnchor == null)
            {
                return;
            }

            switch (cafeStepIndex)
            {
                case 0:
                    RecordOrg("Barista", "Cafe", "CafeSeat", EventType.TaskStarted, "주문 처리", cafeAnchor, "PROC_CAFE_ORDER");
                    break;
                case 1:
                    RecordOrg("Barista", "Cafe", "CafeSeat", EventType.SeatClaimed, "좌석 안내", cafeAnchor, "PROC_CAFE_SEAT");
                    EmitViolationEvery("Cafe", "CafeSeat", "R_CAFE_SEAT", "좌석 회전 지연", cafeAnchor, ref cafeViolationCounter, 4);
                    break;
                default:
                    RecordOrg("Barista", "Cafe", "CafeSeat", EventType.TaskCompleted, "정리 완료", cafeAnchor, "PROC_CAFE_CLEAN");
                    break;
            }

            cafeStepIndex = (cafeStepIndex + 1) % 3;
        }

        private void EmitDeliveryEvent()
        {
            if (deliveryAnchor == null)
            {
                return;
            }

            switch (deliveryStepIndex)
            {
                case 0:
                    RecordProcedure("Courier", "Delivery", "DeliveryBay", EventType.TaskStarted, "출입 확인", deliveryAnchor, "PROC_DELIVERY_CHECK");
                    break;
                default:
                    RecordProcedure("Courier", "Delivery", "DeliveryBay", EventType.TaskCompleted, "수취 서명", deliveryAnchor, "PROC_DELIVERY_SIGN");
                    EmitViolationEvery("Delivery", "DeliveryBay", "R_DELIVERY", "출입 절차 누락", deliveryAnchor, ref deliveryViolationCounter, 4);
                    break;
            }

            deliveryStepIndex = (deliveryStepIndex + 1) % 2;
        }

        private void EmitFacilityEvent()
        {
            if (facilityAnchor == null)
            {
                return;
            }

            switch (facilityStepIndex)
            {
                case 0:
                    RecordProcedure("FacilityTech", "Facility", "Facility", EventType.TaskStarted, "정기 점검", facilityAnchor, "PROC_FACILITY_CHECK");
                    break;
                default:
                    RecordProcedure("FacilityTech", "Facility", "Facility", EventType.TaskCompleted, "수리 완료", facilityAnchor, "PROC_FACILITY_FIX");
                    EmitViolationEvery("Facility", "Facility", "R_FACILITY_SAFETY", "안전 점검 누락", facilityAnchor, ref facilityViolationCounter, 6);
                    break;
            }

            facilityStepIndex = (facilityStepIndex + 1) % 2;
        }

        private void EmitMediaEvent()
        {
            if (mediaAnchor == null)
            {
                return;
            }

            switch (mediaStepIndex)
            {
                case 0:
                    RecordEvidence("Reporter", "Media", "MediaZone", EventType.EvidenceCaptured, "촬영 진행", mediaAnchor, "PROC_MEDIA_SHOOT");
                    EmitViolationEvery("Media", "MediaZone", "R_MEDIA_PERMIT", "촬영 허가 확인 요청", mediaAnchor, ref mediaViolationCounter, 3);
                    break;
                default:
                    RecordOrg("Reporter", "Media", "MediaZone", EventType.TaskCompleted, "촬영 정리", mediaAnchor, "PROC_MEDIA_WRAP");
                    break;
            }

            mediaStepIndex = (mediaStepIndex + 1) % 2;
        }

        private void RecordProcedure(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor, string ruleId = "")
        {
            RecordEvent(actorId, placeId, zoneId, type, EventCategory.Procedure, note, anchor, ruleId);
        }

        private void RecordOrg(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor, string ruleId = "")
        {
            RecordEvent(actorId, placeId, zoneId, type, EventCategory.Organization, note, anchor, ruleId);
        }

        private void RecordEvidence(string actorId, string placeId, string zoneId, EventType type, string note, Transform anchor, string ruleId = "")
        {
            RecordEvent(actorId, placeId, zoneId, type, EventCategory.Evidence, note, anchor, ruleId);
        }

        private void EmitViolationEvery(string placeId, string zoneId, string ruleId, string note, Transform anchor, ref int counter, int interval)
        {
            if (interval <= 0)
            {
                return;
            }

            counter++;
            if (counter % interval != 0)
            {
                return;
            }

            RecordEvent("Citizen", placeId, zoneId, EventType.ViolationDetected, EventCategory.Rule, note, anchor, ruleId);
        }

        private void RecordEvent(string actorId, string placeId, string zoneId, EventType type, EventCategory category, string note, Transform anchor, string ruleId = "")
        {
            if (snapActorsToAnchor)
            {
                TryMoveActor(actorId, anchor);
            }

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
                storeAnchor = FindAnchor("StoreBuilding") ?? FindZoneAnchor("StoreQueue");
            }

            if (parkAnchor == null)
            {
                parkAnchor = FindAnchor("ParkArea") ?? FindZoneAnchor("ParkSeat");
            }

            if (studioAnchor == null)
            {
                studioAnchor = FindAnchor("StudioBuilding_L1") ?? FindZoneAnchor("StudioPhoto");
            }

            if (stationAnchor == null)
            {
                stationAnchor = FindAnchor("Station") ?? FindAnchor("Police");
            }

            if (cafeAnchor == null)
            {
                cafeAnchor = FindAnchor("Cafe") ?? FindZoneAnchor("CafeSeat");
            }

            if (deliveryAnchor == null)
            {
                deliveryAnchor = FindAnchor("DeliveryBay") ?? FindZoneAnchor("DeliveryBay");
            }

            if (facilityAnchor == null)
            {
                facilityAnchor = FindAnchor("Facility") ?? FindZoneAnchor("Facility");
            }

            if (mediaAnchor == null)
            {
                mediaAnchor = FindAnchor("MediaZone") ?? FindZoneAnchor("MediaZone");
            }
        }

        private Transform FindAnchor(string name)
        {
            var go = GameObject.Find(name);
            return go != null ? go.transform : null;
        }

        private void TryMoveActor(string actorId, Transform anchor)
        {
            if (string.IsNullOrEmpty(actorId) || anchor == null)
            {
                return;
            }

            var actor = GameObject.Find(actorId);
            if (actor == null)
            {
                return;
            }

            float offsetX = (Mathf.Abs(actorId.GetHashCode()) % 3 - 1) * 0.6f;
            float offsetZ = (Mathf.Abs(actorId.GetHashCode() / 3) % 3 - 1) * 0.6f;
            actor.transform.position = anchor.position + new Vector3(offsetX, 0f, offsetZ);
        }

        private Transform FindZoneAnchor(string zoneId)
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
    }
}
