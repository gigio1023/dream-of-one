using System.Collections.Generic;
using System;
using System.Reflection;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.World;
using UnityEditor;
using UnityEngine;
using UnityEngine.AI;
using Object = UnityEngine.Object;

namespace DreamOfOne.Editor
{
    public static class WorldDefinitionBuilder
    {
        private const string WorldAssetPath = "Assets/Data/WorldDefinition.asset";

        [MenuItem("Tools/DreamOfOne/Create World Definition Asset")]
        public static void CreateWorldDefinitionAsset()
        {
            var existing = AssetDatabase.LoadAssetAtPath<WorldDefinition>(WorldAssetPath);
            if (existing != null)
            {
                Selection.activeObject = existing;
                Debug.Log("[WorldBuilder] WorldDefinition asset already exists.");
                return;
            }

            EnsureDataFolder();
            var asset = ScriptableObject.CreateInstance<WorldDefinition>();
            AssetDatabase.CreateAsset(asset, WorldAssetPath);
            AssetDatabase.SaveAssets();
            Selection.activeObject = asset;
            Debug.Log("[WorldBuilder] Created WorldDefinition asset.");
        }

        [MenuItem("Tools/DreamOfOne/Rebuild World From Data")]
        public static void RebuildWorldFromData()
        {
            var report = new WorldBuildReport();
            var world = AssetDatabase.LoadAssetAtPath<WorldDefinition>(WorldAssetPath);
            if (world == null)
            {
                report.AddError($"WorldDefinition asset missing at {WorldAssetPath}");
                report.AddWarning("Run Tools/DreamOfOne/Create World Definition Asset to create a default asset.");
                report.LogSummary("Rebuild aborted");
                return;
            }

            var anchors = GameObject.Find("CITY_Anchors");
            if (anchors == null)
            {
                report.AddError("CITY_Anchors root missing. Build aborted.");
                report.LogSummary("Rebuild aborted");
                return;
            }

            ClearPreviousBuild();

            var root = new GameObject("World_Built");
            var spawner = root.AddComponent<ContentSpawner>();
            var buildingsRoot = CreateChild(root, "Buildings");
            var interactablesRoot = CreateChild(root, "Interactables");
            var npcSpawnRoot = CreateChild(root, "NPCSpawns");
            var npcRoot = CreateChild(root, "NPCs");

            var interiorsRoot = CreateChild(root, "Interiors");
            var portalRoot = CreateChild(root, "InteriorPortals");
            var markerRoot = CreateChild(root, "PortalMarkers");

            int buildingCount = 0;
            int interiorCount = 0;
            int interactableCount = 0;
            int portalCount = 0;
            int npcSpawnCount = 0;
            int npcInstanceCount = 0;
            int npcMax = world.Budgets != null ? world.Budgets.NpcMax : 16;

            for (int i = 0; i < world.Buildings.Count; i++)
            {
                var building = world.Buildings[i];
                if (building == null)
                {
                    continue;
                }

                var anchor = GameObject.Find($"CITY_Anchors/{building.AnchorName}");
                if (anchor == null)
                {
                    report.AddWarning($"Missing anchor for building {building.BuildingId}: {building.AnchorName}");
                    continue;
                }

                GameObject exterior = null;
                if (building.ExteriorPrefab == null)
                {
                    bool hasCityPack = GameObject.Find("CITY_Package") != null;
                    exterior = new GameObject($"Exterior_{building.BuildingId}");
                    if (!hasCityPack)
                    {
                        report.AddWarning($"Missing exterior prefab for building {building.BuildingId}. Using fallback cube.");
                        var fallback = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        fallback.transform.SetParent(exterior.transform, false);
                        fallback.transform.localScale = new Vector3(6f, 3f, 6f);
                    }
                }
                else
                {
                    exterior = (GameObject)PrefabUtility.InstantiatePrefab(building.ExteriorPrefab);
                }

                if (exterior != null)
                {
                    exterior.name = $"Exterior_{building.BuildingId}";
                    exterior.transform.SetParent(buildingsRoot.transform);
                    exterior.transform.position = anchor.transform.position + building.ExteriorOffset;
                    exterior.transform.rotation = anchor.transform.rotation * Quaternion.Euler(building.ExteriorRotationEuler);
                    buildingCount++;
                    spawner.Register(exterior);
                    EnsureSignage(exterior.transform, building, report);
                    EnsureEntranceProps(exterior.transform, building, report);
                    EnsureDoorMesh(exterior.transform, building);
                    EnsureNavMeshObstacle(exterior.transform);
                }

                if (building.InteriorPrefab != null)
                {
                    Vector3 basePos = world.InteriorRootPosition + new Vector3(i * world.InteriorSpacing, 0f, 0f);
                    var interior = (GameObject)PrefabUtility.InstantiatePrefab(building.InteriorPrefab);
                    interior.name = $"Interior_{building.BuildingId}";
                    interior.transform.SetParent(interiorsRoot.transform);
                    interior.transform.position = basePos + building.InteriorLocalOffset;
                    interior.transform.rotation = Quaternion.identity;
                    interiorCount++;
                    spawner.Register(interior);

                    var insideSpawn = new GameObject($"{building.BuildingId}_InsideSpawn");
                    insideSpawn.transform.SetParent(interior.transform);
                    insideSpawn.transform.localPosition = Vector3.zero;

                    var outsideSpawn = new GameObject($"{building.BuildingId}_OutsideSpawn");
                    outsideSpawn.transform.SetParent(portalRoot.transform);
                    outsideSpawn.transform.position = anchor.transform.position + building.ExteriorPortalOffset + Vector3.up * 0.5f;
                    outsideSpawn.transform.rotation = anchor.transform.rotation;

                    var interiorPortal = CreatePortal(interior.transform, $"{building.BuildingId}_Portal_Interior",
                        interior.transform.position + building.InteriorPortalLocalOffset, Quaternion.identity, true, building.DoorwaySize);
                    var exteriorPortal = CreatePortal(portalRoot.transform, $"{building.BuildingId}_Portal_Exterior",
                        outsideSpawn.transform.position, outsideSpawn.transform.rotation, false, building.DoorwaySize);

                    interiorPortal.Configure(exteriorPortal, outsideSpawn.transform, inside: true, autoReturnSeconds: 6f);
                    exteriorPortal.Configure(interiorPortal, insideSpawn.transform, inside: false, autoReturnSeconds: 6f);

                    var markerPos = anchor.transform.position + (anchor.transform.rotation * building.DoorwayLocalOffset);
                    CreatePortalMarker(markerRoot.transform, $"{building.BuildingId}_PortalMarker", markerPos, anchor.transform.rotation, building.DoorwaySize);
                    portalCount += 2;

                    EnsureInteriorProps(interior.transform, building, report);
                }
                else
                {
                    var interior = new GameObject($"Interior_{building.BuildingId}");
                    interior.transform.SetParent(interiorsRoot.transform);
                    interior.transform.position = world.InteriorRootPosition + new Vector3(i * world.InteriorSpacing, 0f, 0f);
                    interior.transform.rotation = Quaternion.identity;
                    interiorCount++;
                    spawner.Register(interior);
                    EnsureInteriorProps(interior.transform, building, report);
                }
            }

            for (int i = 0; i < world.Interactables.Count; i++)
            {
                var interactable = world.Interactables[i];
                if (interactable == null)
                {
                    continue;
                }

                var anchor = GameObject.Find($"CITY_Anchors/{interactable.AnchorName}");
                if (anchor == null)
                {
                    report.AddWarning($"Missing anchor for interactable {interactable.InteractableId}: {interactable.AnchorName}");
                    continue;
                }

                GameObject instance = null;
                if (interactable.Prefab != null)
                {
                    instance = (GameObject)PrefabUtility.InstantiatePrefab(interactable.Prefab);
                }
                else
                {
                    report.AddWarning($"Missing prefab for interactable {interactable.InteractableId}");
                    instance = new GameObject($"Interactable_{interactable.InteractableId}");
                }

                instance.transform.SetParent(interactablesRoot.transform);
                instance.transform.position = anchor.transform.position + interactable.LocalOffset;
                instance.transform.rotation = Quaternion.Euler(interactable.LocalRotationEuler);
                spawner.Register(instance);

                var collider = instance.GetComponent<Collider>();
                if (collider == null)
                {
                    collider = instance.AddComponent<BoxCollider>();
                }
                collider.isTrigger = true;
                if (collider is BoxCollider box)
                {
                    box.size = interactable.TriggerSize;
                    box.center = Vector3.zero;
                }

                var zone = instance.GetComponent<Zone>();
                if (zone == null)
                {
                    zone = instance.AddComponent<Zone>();
                }

                string zoneId = interactable.InteractableId;
                zone.Configure(zoneId, interactable.ZoneType, Object.FindFirstObjectByType<WorldEventLog>());

                var zoneInteractable = instance.GetComponent<ZoneInteractable>();
                if (zoneInteractable == null)
                {
                    zoneInteractable = instance.AddComponent<ZoneInteractable>();
                }

                zoneInteractable.Configure(
                    Object.FindFirstObjectByType<WorldEventLog>(),
                    zone,
                    Object.FindFirstObjectByType<DreamOfOne.UI.UIManager>(),
                    interactable.RuleId,
                    interactable.Prompt);

                string placeId = string.IsNullOrEmpty(interactable.PlaceId) ? interactable.AnchorName : interactable.PlaceId;
                zoneInteractable.ConfigureEvent(
                    interactable.EventType,
                    interactable.EventCategory,
                    interactable.Note,
                    interactable.Severity,
                    string.IsNullOrEmpty(interactable.RuleId) ? interactable.EventType.ToString() : interactable.RuleId,
                    placeId);

                interactableCount++;

                if (!IsNavMeshReachable(instance.transform.position))
                {
                    Debug.Log($"[WorldBuilder] NavMesh check: {interactable.InteractableId} not on NavMesh.");
                }

                if (collider is BoxCollider overlapBox)
                {
                    var hits = Physics.OverlapBox(instance.transform.position + overlapBox.center, overlapBox.size * 0.5f);
                    if (hits.Length > 1)
                    {
                        Debug.Log($"[WorldBuilder] Overlap check: {interactable.InteractableId} overlaps {hits.Length - 1} colliders.");
                    }
                }
            }

            SpawnZones(world, root.transform, report);

            for (int i = 0; i < world.Npcs.Count; i++)
            {
                var npc = world.Npcs[i];
                if (npc == null)
                {
                    continue;
                }

                var anchor = GameObject.Find($"CITY_Anchors/{npc.AnchorName}");
                if (anchor == null)
                {
                    report.AddWarning($"Missing anchor for NPC {npc.NpcId}: {npc.AnchorName}");
                    continue;
                }

                var spawn = new GameObject($"NPCSpawn_{npc.NpcId}");
                spawn.transform.SetParent(npcSpawnRoot.transform);
                spawn.transform.position = anchor.transform.position + npc.SpawnOffset;
                npcSpawnCount++;

                int spawnCount = Mathf.Max(1, npc.SpawnCount);
                if (npc.IsPolice)
                {
                    spawnCount = 1;
                }

                for (int j = 0; j < spawnCount && npcInstanceCount < npcMax; j++)
                {
                    if (npc.Prefab == null)
                    {
                        report.AddWarning($"Missing prefab for NPC {npc.NpcId}");
                        break;
                    }

                    var instance = (GameObject)PrefabUtility.InstantiatePrefab(npc.Prefab);
                    instance.name = npc.NpcId;
                    instance.transform.SetParent(npcRoot.transform);
                    instance.transform.position = spawn.transform.position + GetSpawnJitter(j, spawnCount);
                    instance.transform.rotation = anchor.transform.rotation;
                    spawner.Register(instance);

                    var grounding = instance.GetComponent<DreamOfOne.Core.ActorGrounding>();
                    if (grounding == null)
                    {
                        grounding = instance.AddComponent<DreamOfOne.Core.ActorGrounding>();
                    }

                    grounding.Apply();

                    var agent = instance.GetComponent<NavMeshAgent>();
                    if (agent != null)
                    {
                        NavMeshAgentTuning.Apply(agent, new NavMeshAgentTuning.Settings
                        {
                            Radius = 0.25f,
                            Height = 1.4f,
                            BaseOffset = 0.04f,
                            Speed = npc.Speed,
                            AngularSpeed = 420f,
                            Acceleration = 10f,
                            StoppingDistance = npc.StoppingDistance,
                            AvoidancePriority = npc.AvoidancePriority
                        });

                        if (!IsNavMeshReachable(instance.transform.position))
                        {
                            report.AddWarning($"NPC {npc.NpcId} spawned off NavMesh.");
                            agent.enabled = false;
                        }
                    }

                    var persona = instance.GetComponent<NpcPersona>();
                    if (persona != null)
                    {
                        persona.Configure(npc.NpcId, npc.RoleName, npc.Organization, npc.DialogueStyle);
                    }

                    npcInstanceCount++;
                }
            }

            report.LogSummary($"Rebuild complete: Buildings={buildingCount}, Interiors={interiorCount}, Interactables={interactableCount}, Portals={portalCount}, NPCSpawns={npcSpawnCount}");
            BakeNavMesh(report);
        }

        private static void ClearPreviousBuild()
        {
            var existing = GameObject.Find("World_Built");
            if (existing != null)
            {
                Object.DestroyImmediate(existing);
            }

            var interiors = GameObject.Find("Interiors");
            if (interiors != null)
            {
                Object.DestroyImmediate(interiors);
            }

            var portals = GameObject.Find("InteriorPortals");
            if (portals != null)
            {
                Object.DestroyImmediate(portals);
            }

            var markers = GameObject.Find("PortalMarkers");
            if (markers != null)
            {
                Object.DestroyImmediate(markers);
            }
        }

        private static void EnsureDataFolder()
        {
            if (AssetDatabase.IsValidFolder("Assets/Data"))
            {
                return;
            }

            AssetDatabase.CreateFolder("Assets", "Data");
        }

        private static GameObject CreateChild(GameObject parent, string name)
        {
            var child = new GameObject(name);
            child.transform.SetParent(parent.transform);
            return child;
        }

        private static InteriorPortal CreatePortal(Transform parent, string name, Vector3 position, Quaternion rotation, bool inside, Vector3 colliderSize)
        {
            var portalObject = new GameObject(name);
            portalObject.transform.SetParent(parent);
            portalObject.transform.position = position;
            portalObject.transform.rotation = rotation;

            var collider = portalObject.AddComponent<BoxCollider>();
            collider.isTrigger = true;
            collider.size = new Vector3(
                Mathf.Max(1.2f, colliderSize.x),
                Mathf.Max(2.2f, colliderSize.y),
                Mathf.Max(0.8f, colliderSize.z));

            var portal = portalObject.AddComponent<InteriorPortal>();
            portal.Configure(null, null, inside, autoReturnSeconds: 6f);
            return portal;
        }

        private static void CreatePortalMarker(Transform parent, string name, Vector3 position, Quaternion rotation, Vector3 doorwaySize)
        {
            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = name;
            marker.transform.SetParent(parent);
            marker.transform.position = position;
            marker.transform.rotation = rotation;
            marker.transform.localScale = new Vector3(
                Mathf.Max(1.2f, doorwaySize.x),
                Mathf.Max(2.2f, doorwaySize.y),
                0.1f);

            var collider = marker.GetComponent<Collider>();
            if (collider != null)
            {
                Object.DestroyImmediate(collider);
            }

            var renderer = marker.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = AssetDatabase.GetBuiltinExtraResource<Material>("Default-Material.mat");
                renderer.sharedMaterial.color = new Color(0.05f, 0.05f, 0.05f, 1f);
            }
        }

        private static void EnsureSignage(Transform exterior, BuildingDefinition building, WorldBuildReport report)
        {
            if (exterior == null || building == null)
            {
                return;
            }

            if (building.SignagePrefab != null)
            {
                var sign = (GameObject)PrefabUtility.InstantiatePrefab(building.SignagePrefab);
                sign.name = $"Sign_{building.BuildingId}";
                sign.transform.SetParent(exterior);
                sign.transform.localPosition = new Vector3(0f, 2.2f, 2.8f);
                sign.transform.localRotation = Quaternion.identity;
                return;
            }

            var fallback = GameObject.CreatePrimitive(PrimitiveType.Cube);
            fallback.name = $"Sign_{building.BuildingId}";
            fallback.transform.SetParent(exterior);
            fallback.transform.localPosition = new Vector3(0f, 2.2f, 2.8f);
            fallback.transform.localScale = new Vector3(2.4f, 0.6f, 0.1f);
        }

        private static void EnsureEntranceProps(Transform exterior, BuildingDefinition building, WorldBuildReport report)
        {
            if (exterior == null || building == null)
            {
                return;
            }

            if (building.KeyProps != null && building.KeyProps.Count > 0)
            {
                for (int i = 0; i < building.KeyProps.Count; i++)
                {
                    if (building.KeyProps[i] == null)
                    {
                        continue;
                    }

                    var prop = (GameObject)PrefabUtility.InstantiatePrefab(building.KeyProps[i]);
                    prop.name = $"Prop_{building.BuildingId}_{i}";
                    prop.transform.SetParent(exterior);
                    prop.transform.localPosition = new Vector3(1.2f - i * 0.8f, 0f, 2.4f);
                    prop.transform.localRotation = Quaternion.identity;
                }
                return;
            }

            for (int i = 0; i < 4; i++)
            {
                var prop = GameObject.CreatePrimitive(PrimitiveType.Cube);
                prop.name = $"Prop_{building.BuildingId}_{i}";
                prop.transform.SetParent(exterior);
                prop.transform.localPosition = new Vector3(-1.2f + i * 0.8f, 0.3f, 2.6f);
                prop.transform.localScale = new Vector3(0.5f, 0.5f, 0.5f);
            }
        }

        private static void EnsureDoorMesh(Transform exterior, BuildingDefinition building)
        {
            if (exterior == null || building == null)
            {
                return;
            }

            if (exterior.Find($"Door_{building.BuildingId}") != null)
            {
                return;
            }

            var door = GameObject.CreatePrimitive(PrimitiveType.Cube);
            door.name = $"Door_{building.BuildingId}";
            door.transform.SetParent(exterior, false);
            door.transform.localPosition = building.DoorwayLocalOffset + new Vector3(0f, building.DoorwaySize.y * 0.5f, 0f);
            door.transform.localRotation = Quaternion.identity;
            door.transform.localScale = new Vector3(building.DoorwaySize.x * 0.9f, building.DoorwaySize.y, building.DoorwaySize.z);

            var collider = door.GetComponent<Collider>();
            if (collider != null)
            {
                collider.isTrigger = true;
            }
        }

        private static void EnsureInteriorProps(Transform interior, BuildingDefinition building, WorldBuildReport report)
        {
            if (interior == null || building == null)
            {
                return;
            }

            int rendererCount = interior.GetComponentsInChildren<Renderer>(true).Length;
            int target = 6;
            if (rendererCount >= target)
            {
                EnsureInteriorLight(interior);
                return;
            }

            int toSpawn = Mathf.Max(0, target - rendererCount);
            for (int i = 0; i < toSpawn; i++)
            {
                var prop = GameObject.CreatePrimitive(PrimitiveType.Cube);
                prop.name = $"InteriorProp_{building.BuildingId}_{i}";
                prop.transform.SetParent(interior);
                prop.transform.localPosition = new Vector3(-2f + i * 0.8f, 0.4f, -1f);
                prop.transform.localScale = new Vector3(0.6f, 0.6f, 0.6f);
            }
            EnsureInteriorLight(interior);
        }

        private static void EnsureNavMeshObstacle(Transform exterior)
        {
            if (exterior == null)
            {
                return;
            }

            var renderers = exterior.GetComponentsInChildren<Renderer>(true);
            if (renderers == null || renderers.Length == 0)
            {
                return;
            }

            Bounds bounds = renderers[0].bounds;
            for (int i = 1; i < renderers.Length; i++)
            {
                bounds.Encapsulate(renderers[i].bounds);
            }

            if (bounds.size.sqrMagnitude < 0.001f)
            {
                return;
            }

            var obstacle = exterior.GetComponent<NavMeshObstacle>();
            if (obstacle == null)
            {
                obstacle = exterior.gameObject.AddComponent<NavMeshObstacle>();
            }

            obstacle.carving = true;
            obstacle.shape = NavMeshObstacleShape.Box;
            obstacle.center = exterior.InverseTransformPoint(bounds.center);

            Vector3 scale = exterior.lossyScale;
            obstacle.size = new Vector3(
                scale.x != 0f ? bounds.size.x / scale.x : bounds.size.x,
                scale.y != 0f ? bounds.size.y / scale.y : bounds.size.y,
                scale.z != 0f ? bounds.size.z / scale.z : bounds.size.z);
        }

        private static Vector3 GetSpawnJitter(int index, int total)
        {
            if (total <= 1)
            {
                return Vector3.zero;
            }

            float angle = (360f / total) * index;
            var offset = Quaternion.Euler(0f, angle, 0f) * Vector3.forward * 0.6f;
            offset.y = 0f;
            return offset;
        }

        private static bool IsNavMeshReachable(Vector3 position)
        {
            return NavMesh.SamplePosition(position, out _, 1.2f, NavMesh.AllAreas);
        }

        private static void BakeNavMesh(WorldBuildReport report)
        {
            var surfaceType = ResolveNavMeshSurfaceType();
            if (surfaceType == null)
            {
                report.AddInfo("NavMeshSurface type not found; skip bake.");
                return;
            }

            var surfaces = UnityEngine.Object.FindObjectsByType(surfaceType, FindObjectsInactive.Include, FindObjectsSortMode.None);
            if (surfaces == null || surfaces.Length == 0)
            {
                report.AddWarning("No NavMeshSurface found for bake.");
                return;
            }

            int baked = 0;
            foreach (var surface in surfaces)
            {
                var method = surfaceType.GetMethod("BuildNavMesh", BindingFlags.Instance | BindingFlags.Public);
                method?.Invoke(surface, null);
                baked++;
            }

            report.AddInfo($"NavMesh bake complete: surfaces={baked}");
        }

        private static Type ResolveNavMeshSurfaceType()
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                var surfaceType = assembly.GetType("Unity.AI.Navigation.NavMeshSurface");
                if (surfaceType != null)
                {
                    return surfaceType;
                }
            }

            return null;
        }

        private static void EnsureInteriorLight(Transform interior)
        {
            if (interior == null)
            {
                return;
            }

            var lights = interior.GetComponentsInChildren<Light>(true);
            if (lights != null && lights.Length > 0)
            {
                return;
            }

            var lightObject = new GameObject("InteriorLight");
            lightObject.transform.SetParent(interior);
            lightObject.transform.localPosition = new Vector3(0f, 3f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Point;
            light.intensity = 1.2f;
            light.range = 12f;
            light.color = new Color(1f, 0.96f, 0.9f);
        }

        private static void SpawnZones(WorldDefinition world, Transform root, WorldBuildReport report)
        {
            if (world == null || world.Zones == null || world.Zones.Count == 0)
            {
                return;
            }

            var zonesRoot = CreateChild(root.gameObject, "Zones");
            var eventLog = Object.FindFirstObjectByType<WorldEventLog>();

            for (int i = 0; i < world.Zones.Count; i++)
            {
                var zoneDef = world.Zones[i];
                if (zoneDef == null)
                {
                    continue;
                }

                string zoneName = $"Zone_{zoneDef.ZoneId}";
                if (GameObject.Find(zoneName) != null)
                {
                    continue;
                }

                var zoneObject = new GameObject(zoneName);
                zoneObject.transform.SetParent(zonesRoot.transform);
                zoneObject.transform.position = zoneDef.Center;

                Collider collider = null;
                switch (zoneDef.Shape)
                {
                    case ZoneShape.Sphere:
                        var sphere = zoneObject.AddComponent<SphereCollider>();
                        sphere.radius = Mathf.Max(1f, zoneDef.Size.x * 0.5f);
                        collider = sphere;
                        break;
                    case ZoneShape.Polygon:
                    case ZoneShape.Box:
                    default:
                        var box = zoneObject.AddComponent<BoxCollider>();
                        box.size = zoneDef.Size;
                        collider = box;
                        break;
                }

                if (collider != null)
                {
                    collider.isTrigger = true;
                }

                var zone = zoneObject.AddComponent<Zone>();
                zone.Configure(zoneDef.ZoneId, zoneDef.ZoneType, eventLog);

                var board = zoneObject.GetComponent<SpatialBlackboard>();
                if (board == null)
                {
                    board = zoneObject.AddComponent<SpatialBlackboard>();
                }
                board.Configure(zoneDef.ZoneId, zoneDef.TtlSeconds, zoneDef.BlackboardCapacity);

                if (!IsNavMeshReachable(zoneObject.transform.position))
                {
                    report.AddWarning($"Zone {zoneDef.ZoneId} not on NavMesh.");
                }
            }
        }
    }
}
