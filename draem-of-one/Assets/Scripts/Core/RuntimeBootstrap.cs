using DreamOfOne.NPC;
using DreamOfOne.UI;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 씬에 필수 오브젝트가 없는 경우 최소 실행 환경을 런타임에 구성한다.
    /// </summary>
    public sealed class RuntimeBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Bootstrap()
        {
            if (FindFirstObjectByType<WorldEventLog>() != null)
            {
                return;
            }

            var root = new GameObject("DreamOfOne_Runtime");
            root.AddComponent<RuntimeBootstrap>().Build(root.transform);
        }

        private void Build(Transform root)
        {
            var systems = new GameObject("Systems");
            systems.transform.SetParent(root);
            systems.AddComponent<RuntimeDiagnostics>();

            var log = systems.AddComponent<WorldEventLog>();
            var shaper = systems.AddComponent<SemanticShaper>();
            var global = systems.AddComponent<GlobalSuspicionSystem>();
            var reports = systems.AddComponent<ReportManager>();
            reports.Configure(log, global);

            var response = systems.AddComponent<ViolationResponseSystem>();
            response.Configure(log);

            systems.AddComponent<BlackboardSystem>();
            systems.AddComponent<GossipSystem>();
            systems.AddComponent<OrganizationRoutineSystem>();
            systems.AddComponent<ArtifactSystem>();
            systems.AddComponent<DemoDirector>();
            systems.AddComponent<DreamOfOne.NPC.NpcLogInjector>();
            systems.AddComponent<LoopVerifier>();
            systems.AddComponent<PerformanceProbe>();
            systems.AddComponent<GcAllocationProbe>();
            systems.AddComponent<SessionDirector>();

            var llmHost = new GameObject("LLMClient");
            llmHost.transform.SetParent(systems.transform);
            var llmClient = llmHost.AddComponent<DreamOfOne.LLM.LLMClient>();

            var dialogueSystem = systems.AddComponent<DreamOfOne.NPC.NpcDialogueSystem>();

            var uiRoot = new GameObject("UI");
            uiRoot.transform.SetParent(root);
            var uiManager = uiRoot.AddComponent<UIManager>();
            uiManager.Bind(global);
            uiRoot.AddComponent<UIShortcutController>();

            uiRoot.AddComponent<FontBootstrap>();
            uiRoot.AddComponent<DreamOfOne.UI.BlackboardDebugUI>();

            var presenter = uiRoot.AddComponent<EventLogPresenter>();
            presenter.Configure(log, shaper, uiManager);

            CreateEnvironment(root, log, uiManager, response, reports, global, llmClient);
        }

        private void CreateEnvironment(Transform root, WorldEventLog log, UIManager ui, ViolationResponseSystem response, ReportManager reports, GlobalSuspicionSystem global, DreamOfOne.LLM.LLMClient llmClient)
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.SetParent(root);
            ground.transform.localScale = new Vector3(7f, 1f, 7f);

            var anchorsRoot = new GameObject("Anchors");
            anchorsRoot.transform.SetParent(root);

            var storePos = new Vector3(-12f, 0f, 8f);
            var parkPos = new Vector3(12f, 0f, 8f);
            var studioPos = new Vector3(0f, 0f, -12f);
            var stationPos = new Vector3(0f, 0f, -18f);
            var cafePos = new Vector3(-12f, 0f, -8f);
            var deliveryPos = new Vector3(12f, 0f, -8f);
            var facilityPos = new Vector3(8f, 0f, -12f);
            var mediaPos = new Vector3(0f, 0f, 12f);

            CreateLandmark(anchorsRoot.transform, "StoreBuilding", storePos, new Vector3(6f, 3f, 6f));
            CreateLandmark(anchorsRoot.transform, "ParkArea", parkPos, new Vector3(7f, 1.2f, 7f));
            CreateLandmark(anchorsRoot.transform, "StudioBuilding_L1", studioPos, new Vector3(7f, 4f, 7f));
            CreateLandmark(anchorsRoot.transform, "Station", stationPos, new Vector3(5f, 3f, 5f));
            CreateLandmark(anchorsRoot.transform, "Cafe", cafePos, new Vector3(5f, 3f, 5f));
            CreateLandmark(anchorsRoot.transform, "DeliveryBay", deliveryPos, new Vector3(5f, 2.5f, 5f));
            CreateLandmark(anchorsRoot.transform, "Facility", facilityPos, new Vector3(5f, 3f, 5f));
            CreateLandmark(anchorsRoot.transform, "MediaZone", mediaPos, new Vector3(6f, 2.5f, 6f));

            var player = CreatePlayer(root, log);
            var cameraRig = CreateCamera(root, player.transform);
            player.GetComponent<PlayerController>().Configure(log, cameraRig.transform);

            CreateZone(root, log, ui, response, "StoreQueue", ZoneType.Queue, storePos + new Vector3(2f, 0f, -2f), "R_QUEUE");
            CreateZone(root, log, ui, response, "ParkSeat", ZoneType.Seat, parkPos + new Vector3(-2f, 0f, 1f), "R_NOISE");
            CreateZone(root, log, ui, response, "StudioPhoto", ZoneType.Photo, studioPos + new Vector3(0f, 0f, 2f), "R10");
            CreateZone(root, log, ui, response, "CafeQueue", ZoneType.Queue, cafePos + new Vector3(2f, 0f, 1f), "R_CAFE_QUEUE");
            CreateZone(root, log, ui, response, "CafeSeat", ZoneType.Seat, cafePos + new Vector3(-2f, 0f, -1f), "R_CAFE_SEAT");
            CreateZone(root, log, ui, response, "DeliveryBay", ZoneType.Queue, deliveryPos + new Vector3(-1f, 0f, 1f), "R_DELIVERY_ACCESS");
            CreateZone(root, log, ui, response, "Facility", ZoneType.Seat, facilityPos + new Vector3(1f, 0f, 1f), "R_FACILITY_SAFETY");
            CreateZone(root, log, ui, response, "MediaZone", ZoneType.Photo, mediaPos + new Vector3(0f, 0f, -2f), "R_MEDIA_PERMIT");

            var witnesses = new System.Collections.Generic.List<SuspicionComponent>
            {
                CreateNpc(root, RoleId.Clerk, storePos + new Vector3(1f, 0f, -1f), reports, global, log),
                CreateNpc(root, RoleId.Manager, storePos + new Vector3(-1f, 0f, 1f), reports, global, log),
                CreateNpc(root, RoleId.Elder, parkPos + new Vector3(1f, 0f, -1f), reports, global, log),
                CreateNpc(root, RoleId.Caretaker, parkPos + new Vector3(-1f, 0f, 1f), reports, global, log),
                CreateNpc(root, RoleId.Tourist, new Vector3(0f, 0f, 6f), reports, global, log),
                CreateNpc(root, RoleId.Resident, new Vector3(2f, 0f, 2f), reports, global, log),
                CreateNpc(root, RoleId.Student, new Vector3(-2f, 0f, 2f), reports, global, log),
                CreateNpc(root, RoleId.PM, studioPos + new Vector3(1f, 0f, 1f), reports, global, log),
                CreateNpc(root, RoleId.Developer, studioPos + new Vector3(-1f, 0f, 1f), reports, global, log),
                CreateNpc(root, RoleId.QA, studioPos + new Vector3(1f, 0f, -1f), reports, global, log),
                CreateNpc(root, RoleId.Release, studioPos + new Vector3(-1f, 0f, -1f), reports, global, log),
                CreateNpc(root, RoleId.Barista, cafePos + new Vector3(1f, 0f, 0.5f), reports, global, log),
                CreateNpc(root, RoleId.CafeHost, cafePos + new Vector3(-1f, 0f, -0.5f), reports, global, log),
                CreateNpc(root, RoleId.Courier, deliveryPos + new Vector3(1f, 0f, 0.5f), reports, global, log),
                CreateNpc(root, RoleId.FacilityTech, facilityPos + new Vector3(-1f, 0f, 0.5f), reports, global, log),
                CreateNpc(root, RoleId.Officer, stationPos + new Vector3(1f, 0f, 1f), reports, global, log),
                CreateNpc(root, RoleId.Investigator, stationPos + new Vector3(-1f, 0f, 1f), reports, global, log),
                CreateNpc(root, RoleId.Reporter, mediaPos + new Vector3(0.5f, 0f, -0.5f), reports, global, log)
            };

            for (int i = 0; i < witnesses.Count; i++)
            {
                response.RegisterWitness(witnesses[i]);
            }

            CreatePolice(root, player.transform, reports, log, shaper: FindFirstObjectByType<SemanticShaper>(), uiManager: ui, llmClient: llmClient);
        }

        private GameObject CreatePlayer(Transform root, WorldEventLog log)
        {
            var player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            player.name = "Player";
            player.tag = "Player";
            player.transform.SetParent(root);
            player.transform.position = Vector3.zero;

            Destroy(player.GetComponent<CapsuleCollider>());
            var controller = player.AddComponent<CharacterController>();
            controller.height = 2f;
            controller.radius = 0.35f;
            controller.center = new Vector3(0f, 1f, 0f);

            player.AddComponent<PlayerController>().Configure(log, null);

            var coverProfile = player.AddComponent<CoverProfile>();
            coverProfile.Configure(
                "스튜디오 인턴",
                "스튜디오",
                "인턴",
                new[] { "Studio", "StudioPhoto", "StoreQueue", "ParkSeat", "CafeQueue", "CafeSeat" },
                new[] { "PROC_NOTE_MISSING", "PROC_APPROVAL_DELAY", "PROC_RC_SKIP" },
                new[] { "R_QUEUE", "R_LABEL", "R_NOISE" },
                new[] { "칸반", "패치노트", "RC" });

            player.AddComponent<CoverStatus>();
            return player;
        }

        private GameObject CreateCamera(Transform root, Transform target)
        {
            var cameraObject = new GameObject("RuntimeCamera");
            cameraObject.transform.SetParent(root);
            var camera = cameraObject.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.transform.position = new Vector3(0f, 3f, -5f);

            var follow = cameraObject.AddComponent<FollowCamera>();
            follow.Configure(target);
            return cameraObject;
        }

        private Transform CreateLandmark(Transform root, string name, Vector3 position, Vector3 scale)
        {
            var landmark = GameObject.CreatePrimitive(PrimitiveType.Cube);
            landmark.name = name;
            landmark.transform.SetParent(root);
            landmark.transform.localScale = scale;
            landmark.transform.position = new Vector3(position.x, scale.y * 0.5f, position.z);

            return landmark.transform;
        }

        private void CreateZone(Transform root, WorldEventLog log, UIManager ui, ViolationResponseSystem response, string zoneId, ZoneType type, Vector3 position, string ruleId)
        {
            var zoneObject = new GameObject(zoneId + "Zone");
            zoneObject.transform.SetParent(root);
            zoneObject.transform.position = position;

            var collider = zoneObject.AddComponent<BoxCollider>();
            collider.isTrigger = true;
            collider.size = new Vector3(3f, 2f, 3f);

            var zone = zoneObject.AddComponent<Zone>();
            zone.Configure(zoneId, type, log);

            var interactable = zoneObject.AddComponent<ZoneInteractable>();
            interactable.Configure(log, zone, ui, ruleId);

            response.ConfigureRuleDelta(ruleId, type == ZoneType.Queue ? 30f : type == ZoneType.Seat ? 20f : 15f);
        }

        private SuspicionComponent CreateNpc(Transform root, RoleId roleId, Vector3 position, ReportManager reports, GlobalSuspicionSystem global, WorldEventLog log)
        {
            string name = roleId != RoleId.None ? roleId.ToString() : "Citizen";
            var npc = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            npc.name = name;
            npc.transform.SetParent(root);
            npc.transform.position = position;

            var agent = npc.AddComponent<NavMeshAgent>();
            NavMeshAgentTuning.Apply(agent, new NavMeshAgentTuning.Settings
            {
                Radius = 0.28f,
                Height = 1.6f,
                BaseOffset = 0.05f,
                Speed = 1.2f,
                AngularSpeed = 420f,
                Acceleration = 10f,
                StoppingDistance = 0.2f,
                AvoidancePriority = 55
            });
            if (!NavMesh.SamplePosition(npc.transform.position, out _, 1f, NavMesh.AllAreas))
            {
                agent.enabled = false;
            }

            var persona = npc.AddComponent<NpcPersona>();
            ConfigurePersona(persona, roleId);

            var suspicion = npc.AddComponent<SuspicionComponent>();
            suspicion.Configure(reports, global, log);

            npc.AddComponent<NpcContext>();

            var patrol = npc.AddComponent<DreamOfOne.NPC.SimplePatrol>();
            var left = CreateWaypoint(root, $"{name}_WP_A", position + new Vector3(-1.5f, 0f, -1.5f));
            var right = CreateWaypoint(root, $"{name}_WP_B", position + new Vector3(1.5f, 0f, 1.5f));
            patrol.Configure(new[] { left, right }, speed: 1.2f, arrivalThreshold: 0.2f);

            return suspicion;
        }

        private void CreatePolice(Transform root, Transform player, ReportManager reports, WorldEventLog log, SemanticShaper shaper, UIManager uiManager, DreamOfOne.LLM.LLMClient llmClient)
        {
            var police = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            police.name = "Police";
            police.transform.SetParent(root);
            police.transform.position = new Vector3(0f, 0f, -6f);

            var persona = police.AddComponent<NpcPersona>();
            ConfigurePersona(persona, RoleId.Police);

            police.AddComponent<NpcContext>();

            var agent = police.AddComponent<NavMeshAgent>();
            NavMeshAgentTuning.Apply(agent, new NavMeshAgentTuning.Settings
            {
                Radius = 0.28f,
                Height = 1.6f,
                BaseOffset = 0.05f,
                Speed = 1.5f,
                AngularSpeed = 420f,
                Acceleration = 10f,
                StoppingDistance = 0.35f,
                AvoidancePriority = 45
            });
            if (!NavMesh.SamplePosition(police.transform.position, out _, 1f, NavMesh.AllAreas))
            {
                agent.enabled = false;
            }

            var controller = police.AddComponent<PoliceController>();
            controller.Configure(player, reports, log, shaper, uiManager, llmClient);
        }

        private Transform CreateWaypoint(Transform root, string name, Vector3 position)
        {
            var point = new GameObject(name);
            point.transform.SetParent(root);
            point.transform.position = position;
            return point.transform;
        }

        private void ConfigurePersona(NpcPersona persona, RoleId roleId)
        {
            if (persona == null)
            {
                return;
            }

            switch (roleId)
            {
                case RoleId.Clerk:
                    persona.Configure(RoleId.Clerk.ToString(), "편의점 점원", "친절하지만 규칙에 엄격함", "짧고 단호한 말투");
                    break;
                case RoleId.Manager:
                    persona.Configure(RoleId.Manager.ToString(), "편의점 점장", "매장 질서와 재고를 관리", "차분하지만 단호한 말투");
                    break;
                case RoleId.Elder:
                    persona.Configure(RoleId.Elder.ToString(), "동네 어르신", "질서 강조, 잔소리 섞임", "엄격하고 고전적인 말투");
                    break;
                case RoleId.Caretaker:
                    persona.Configure(RoleId.Caretaker.ToString(), "공원 관리인", "민원과 규정 준수를 확인", "정돈된 말투");
                    break;
                case RoleId.Tourist:
                    persona.Configure(RoleId.Tourist.ToString(), "관광객", "어눌한 한국어, 호기심 많음", "짧고 어색한 말투");
                    break;
                case RoleId.Resident:
                    persona.Configure(RoleId.Resident.ToString(), "주민 대표", "동네 질서에 민감", "엄격한 말투");
                    break;
                case RoleId.Student:
                    persona.Configure(RoleId.Student.ToString(), "학생", "호기심 많고 빠른 반응", "밝고 빠른 말투");
                    break;
                case RoleId.PM:
                    persona.Configure(RoleId.PM.ToString(), "스튜디오 PM", "일정과 승인 절차를 관리", "차분하고 단호한 말투");
                    break;
                case RoleId.Developer:
                    persona.Configure(RoleId.Developer.ToString(), "개발자", "기술 중심, 요구사항에 집중", "담백한 말투");
                    break;
                case RoleId.QA:
                    persona.Configure(RoleId.QA.ToString(), "QA", "검수와 품질에 민감", "꼼꼼한 말투");
                    break;
                case RoleId.Release:
                    persona.Configure(RoleId.Release.ToString(), "릴리즈 담당", "배포 절차를 확인", "짧고 단호한 말투");
                    break;
                case RoleId.Barista:
                    persona.Configure(RoleId.Barista.ToString(), "바리스타", "주문/좌석 안내", "친절한 말투");
                    break;
                case RoleId.CafeHost:
                    persona.Configure(RoleId.CafeHost.ToString(), "카페 안내", "대기/좌석 정리", "밝고 친절한 말투");
                    break;
                case RoleId.Courier:
                    persona.Configure(RoleId.Courier.ToString(), "배송기사", "출입/수취 확인 담당", "짧고 빠른 말투");
                    break;
                case RoleId.FacilityTech:
                    persona.Configure(RoleId.FacilityTech.ToString(), "시설 기사", "점검/수리 담당", "담담한 말투");
                    break;
                case RoleId.Reporter:
                    persona.Configure(RoleId.Reporter.ToString(), "리포터", "촬영/취재 진행", "짧고 빠른 말투");
                    break;
                case RoleId.Officer:
                    persona.Configure(RoleId.Officer.ToString(), "순경", "현장 대응 담당", "단호한 말투");
                    break;
                case RoleId.Investigator:
                    persona.Configure(RoleId.Investigator.ToString(), "조사관", "증거/진술 확인", "차분한 말투");
                    break;
                case RoleId.Police:
                    persona.Configure(RoleId.Police.ToString(), "경찰", "단호하고 간결함", "단호한 말투");
                    break;
                default:
                    persona.Configure(roleId != RoleId.None ? roleId.ToString() : "Citizen", "시민", "현실적인 반응", "짧고 담백한 말투");
                    break;
            }
        }
    }
}
