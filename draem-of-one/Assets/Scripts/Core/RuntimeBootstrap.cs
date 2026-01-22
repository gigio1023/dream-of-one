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

            var llmHost = new GameObject("LLMClient");
            llmHost.transform.SetParent(systems.transform);
            var llmClient = llmHost.AddComponent<DreamOfOne.LLM.LLMClient>();

            var dialogueSystem = systems.AddComponent<DreamOfOne.NPC.NpcDialogueSystem>();

            var uiRoot = new GameObject("UI");
            uiRoot.transform.SetParent(root);
            var uiManager = uiRoot.AddComponent<UIManager>();
            uiManager.Bind(global);

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

            var player = CreatePlayer(root, log);
            var cameraRig = CreateCamera(root, player.transform);
            player.GetComponent<PlayerController>().Configure(log, cameraRig.transform);

            CreateZone(root, log, ui, response, "StoreQueue", ZoneType.Queue, new Vector3(-5f, 0f, 3f), "R4");
            CreateZone(root, log, ui, response, "ParkSeat", ZoneType.Seat, new Vector3(4f, 0f, 3f), "R5");
            CreateZone(root, log, ui, response, "StudioPhoto", ZoneType.Photo, new Vector3(0f, 0f, -4f), "R10");

            var clerk = CreateNpc(root, "Clerk", new Vector3(-3f, 0f, 2f), reports, global, log);
            var elder = CreateNpc(root, "Elder", new Vector3(4f, 0f, 2f), reports, global, log);
            var tourist = CreateNpc(root, "Tourist", new Vector3(0f, 0f, 4f), reports, global, log);

            response.RegisterWitness(clerk);
            response.RegisterWitness(elder);
            response.RegisterWitness(tourist);

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
                new[] { "Studio", "StudioPhoto", "StoreQueue", "ParkSeat" },
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
            camera.transform.position = new Vector3(0f, 8f, -8f);

            var follow = cameraObject.AddComponent<FollowCamera>();
            follow.Configure(target);
            return cameraObject;
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

        private SuspicionComponent CreateNpc(Transform root, string name, Vector3 position, ReportManager reports, GlobalSuspicionSystem global, WorldEventLog log)
        {
            var npc = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            npc.name = name;
            npc.transform.SetParent(root);
            npc.transform.position = position;

            var persona = npc.AddComponent<NpcPersona>();
            ConfigurePersona(persona, name);

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
            ConfigurePersona(persona, "Police");

            police.AddComponent<NpcContext>();

            var agent = police.AddComponent<NavMeshAgent>();
            agent.speed = 2.5f;
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

        private void ConfigurePersona(NpcPersona persona, string name)
        {
            if (persona == null)
            {
                return;
            }

            switch (name)
            {
                case "Clerk":
                    persona.Configure("Clerk", "편의점 점원", "친절하지만 규칙에 엄격함", "짧고 단호한 말투");
                    break;
                case "Elder":
                    persona.Configure("Elder", "동네 어르신", "질서 강조, 잔소리 섞임", "엄격하고 고전적인 말투");
                    break;
                case "Tourist":
                    persona.Configure("Tourist", "관광객", "어눌한 한국어, 호기심 많음", "짧고 어색한 말투");
                    break;
                case "Police":
                    persona.Configure("Police", "경찰", "단호하고 간결함", "단호한 말투");
                    break;
                default:
                    persona.Configure(name, "시민", "현실적인 반응", "짧고 담백한 말투");
                    break;
            }
        }
    }
}
