using System.Collections;
using System.Collections.Generic;
using DreamOfOne.NPC;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 씬에 필요한 수의 NPC를 보장하고 시야에 보이도록 배치한다.
    /// </summary>
    public sealed class NpcPopulationBootstrap : MonoBehaviour
    {
        [SerializeField]
        private int targetCitizenCount = 12;

        [SerializeField]
        private int targetPoliceCount = 1;

        [SerializeField]
        private float npcScale = 0.7f;

        [SerializeField]
        private float navmeshSampleRadius = 3f;

        [Header("NavMesh Agent Tuning")]
        [SerializeField]
        private float agentRadius = 0.25f;

        [SerializeField]
        private float agentHeight = 1.4f;

        [SerializeField]
        private float agentBaseOffset = 0.04f;

        [SerializeField]
        private float agentAngularSpeed = 420f;

        [SerializeField]
        private float agentAcceleration = 10f;

        [SerializeField]
        private float citizenSpeed = 1.2f;

        [SerializeField]
        private float citizenStoppingDistance = 0.2f;

        [SerializeField]
        private int citizenAvoidancePriority = 55;

        [SerializeField]
        private float policeSpeed = 1.5f;

        [SerializeField]
        private float policeStoppingDistance = 0.35f;

        [SerializeField]
        private int policeAvoidancePriority = 45;

        [SerializeField]
        [Tooltip("NavMesh가 준비될 때까지 NPC 스폰을 지연")]
        private float navmeshReadyTimeout = 6f;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureBootstrap()
        {
            if (FindFirstObjectByType<NpcPopulationBootstrap>() != null)
            {
                return;
            }

            var host = new GameObject("NpcPopulationBootstrap");
            host.AddComponent<NpcPopulationBootstrap>();
        }

        private void Start()
        {
            StartCoroutine(EnsurePopulationWhenReady());
            StartCoroutine(AttachInteriorRoutinesDeferred());
        }

        private IEnumerator EnsurePopulationWhenReady()
        {
            float start = Time.time;
            while (!IsNavMeshReady())
            {
                if (Time.time - start > navmeshReadyTimeout)
                {
                    break;
                }
                yield return new WaitForSeconds(0.2f);
            }

            if (!IsNavMeshReady())
            {
                Debug.LogWarning("[NpcPopulationBootstrap] NavMesh not ready. NPC spawn deferred.");
                yield break;
            }

            EnsurePopulation();
        }

        private void EnsurePopulation()
        {
            var worldRoot = GameObject.Find("DreamOfOne/World");
            if (worldRoot == null)
            {
                worldRoot = new GameObject("World");
            }

            var patrols = FindObjectsByType<SimplePatrol>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            var police = FindObjectsByType<PoliceController>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);

            for (int i = 0; i < patrols.Length; i++)
            {
                ApplyNpcScale(patrols[i].transform);
                EnsureGrounding(patrols[i].gameObject);
                WarpToGround(patrols[i].gameObject);
                ApplyAgentSettings(patrols[i].GetComponent<NavMeshAgent>(), isPolice: false);
                EnsureRoleRoutine(patrols[i].gameObject);
            }

            for (int i = 0; i < police.Length; i++)
            {
                ApplyNpcScale(police[i].transform);
                EnsureGrounding(police[i].gameObject);
                WarpToGround(police[i].gameObject);
                ApplyAgentSettings(police[i].GetComponent<NavMeshAgent>(), isPolice: true);
            }

            int toSpawn = Mathf.Max(0, targetCitizenCount - patrols.Length);
            if (toSpawn > 0)
            {
                var spawnPoints = BuildSpawnPoints();
                for (int i = 0; i < toSpawn; i++)
                {
                    Vector3 spawn = spawnPoints[i % spawnPoints.Count];
                    SpawnCitizen(worldRoot.transform, $"Citizen_{i + patrols.Length + 1}", spawn);
                }
            }

            if (police.Length < targetPoliceCount)
            {
                var spawnPoints = BuildSpawnPoints();
                Vector3 spawn = spawnPoints.Count > 0 ? spawnPoints[0] : Vector3.zero;
                SpawnPolice(worldRoot.transform, "Police", spawn + new Vector3(1.5f, 0f, 1.5f));
            }
        }

        private List<Vector3> BuildSpawnPoints()
        {
            var points = new List<Vector3>();

            var player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                Vector3 center = player.transform.position;
                points.Add(center + new Vector3(2f, 0f, 2f));
                points.Add(center + new Vector3(-2f, 0f, 2f));
                points.Add(center + new Vector3(2f, 0f, -2f));
            }

            var anchorsRoot = GameObject.Find("CITY_Anchors");
            if (anchorsRoot != null)
            {
                foreach (Transform child in anchorsRoot.transform)
                {
                    if (child == null)
                    {
                        continue;
                    }

                    points.Add(child.position + child.forward * 1.5f);
                    points.Add(child.position + child.right * 1.5f);
                }
            }

            var spawnRoot = GameObject.Find("World_Built/NPCSpawns");
            if (spawnRoot != null)
            {
                foreach (Transform child in spawnRoot.transform)
                {
                    if (child == null)
                    {
                        continue;
                    }

                    points.Add(child.position);
                }
            }

            if (points.Count == 0)
            {
                points.Add(Vector3.zero);
            }

            return points;
        }

        private void SpawnCitizen(Transform parent, string name, Vector3 position)
        {
            var npc = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            npc.name = name;
            npc.transform.SetParent(parent);
            npc.transform.position = position;

            ApplyNpcScale(npc.transform);

            var agent = npc.AddComponent<NavMeshAgent>();
            ApplyAgentSettings(agent, isPolice: false);

            npc.AddComponent<SuspicionComponent>();
            npc.AddComponent<NpcPersona>();
            npc.AddComponent<NpcContext>();
            npc.AddComponent<SimplePatrol>();
            npc.AddComponent<NpcRoleRoutine>();

            EnsureGrounding(npc);
            WarpToGround(npc);
        }

        private void SpawnPolice(Transform parent, string name, Vector3 position)
        {
            var npc = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            npc.name = name;
            npc.transform.SetParent(parent);
            npc.transform.position = position;

            ApplyNpcScale(npc.transform);

            var agent = npc.AddComponent<NavMeshAgent>();
            ApplyAgentSettings(agent, isPolice: true);

            npc.AddComponent<NpcPersona>();
            npc.AddComponent<NpcContext>();
            npc.AddComponent<PoliceController>();

            EnsureGrounding(npc);
            WarpToGround(npc);
        }

        private void ApplyNpcScale(Transform target)
        {
            if (target == null)
            {
                return;
            }

            target.localScale = new Vector3(npcScale, npcScale, npcScale);
        }

        private static void EnsureGrounding(GameObject actor)
        {
            if (actor == null)
            {
                return;
            }

            var grounding = actor.GetComponent<ActorGrounding>();
            if (grounding == null)
            {
                grounding = actor.AddComponent<ActorGrounding>();
            }

            grounding.Apply();
        }

        private void WarpToGround(GameObject actor)
        {
            if (actor == null)
            {
                return;
            }

            if (NavMesh.SamplePosition(actor.transform.position, out var hit, navmeshSampleRadius, NavMesh.AllAreas))
            {
                var agent = actor.GetComponent<NavMeshAgent>();
                if (agent != null && agent.enabled)
                {
                    agent.Warp(hit.position);
                }
                else
                {
                    actor.transform.position = hit.position;
                }
            }
        }

        private void ApplyAgentSettings(NavMeshAgent agent, bool isPolice)
        {
            if (agent == null)
            {
                return;
            }

            var settings = new NavMeshAgentTuning.Settings
            {
                Radius = agentRadius,
                Height = agentHeight,
                BaseOffset = agentBaseOffset,
                AngularSpeed = agentAngularSpeed,
                Acceleration = agentAcceleration,
                Speed = isPolice ? policeSpeed : citizenSpeed,
                StoppingDistance = isPolice ? policeStoppingDistance : citizenStoppingDistance,
                AvoidancePriority = isPolice ? policeAvoidancePriority : citizenAvoidancePriority
            };

            NavMeshAgentTuning.Apply(agent, settings);
            ApplyVisualBaseOffset(agent);
        }

        private void ApplyVisualBaseOffset(NavMeshAgent agent)
        {
            if (agent == null)
            {
                return;
            }

            float offset = ComputeVisualOffset(agent.transform);
            if (offset <= 0f)
            {
                return;
            }

            if (offset > agent.baseOffset)
            {
                agent.baseOffset = offset;
            }
        }

        private static void EnsureRoleRoutine(GameObject actor)
        {
            if (actor == null)
            {
                return;
            }

            if (actor.GetComponent<DreamOfOne.NPC.NpcRoleRoutine>() == null)
            {
                actor.AddComponent<DreamOfOne.NPC.NpcRoleRoutine>();
            }
        }

        private static float ComputeVisualOffset(Transform target)
        {
            if (target == null)
            {
                return 0f;
            }

            var renderers = target.GetComponentsInChildren<Renderer>(true);
            if (renderers == null || renderers.Length == 0)
            {
                return 0f;
            }

            float minY = float.PositiveInfinity;
            for (int i = 0; i < renderers.Length; i++)
            {
                var renderer = renderers[i];
                if (renderer == null)
                {
                    continue;
                }

                float rendererMin = renderer.bounds.min.y;
                if (rendererMin < minY)
                {
                    minY = rendererMin;
                }
            }

            if (float.IsInfinity(minY))
            {
                return 0f;
            }

            return target.position.y - minY;
        }

        private static bool IsNavMeshReady()
        {
            var triangulation = NavMesh.CalculateTriangulation();
            return triangulation.vertices != null && triangulation.vertices.Length > 0;
        }

        private IEnumerator AttachInteriorRoutinesDeferred()
        {
            yield return new WaitForSeconds(0.5f);

            var portals = new List<InteriorPortal>();
            foreach (var portal in FindObjectsByType<InteriorPortal>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                if (portal != null && !portal.MarksInside)
                {
                    portals.Add(portal);
                }
            }

            if (portals.Count == 0)
            {
                yield break;
            }

            foreach (var patrol in FindObjectsByType<SimplePatrol>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                if (patrol != null && patrol.GetComponent<NpcInteriorRoutine>() == null)
                {
                    patrol.gameObject.AddComponent<NpcInteriorRoutine>().Configure(portals);
                }
            }

            foreach (var police in FindObjectsByType<PoliceController>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                if (police != null && police.GetComponent<NpcInteriorRoutine>() == null)
                {
                    police.gameObject.AddComponent<NpcInteriorRoutine>().Configure(portals);
                }
            }
        }
    }
}
