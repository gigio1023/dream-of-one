using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.World;
using UnityEditor;
using UnityEngine;

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
            var buildingsRoot = CreateChild(root, "Buildings");
            var interactablesRoot = CreateChild(root, "Interactables");
            var npcSpawnRoot = CreateChild(root, "NPCSpawns");
            var npcRoot = CreateChild(root, "NPCs");

            var interiorsRoot = new GameObject("Interiors");
            var portalRoot = new GameObject("InteriorPortals");
            var markerRoot = new GameObject("PortalMarkers");

            int buildingCount = 0;
            int interiorCount = 0;
            int interactableCount = 0;
            int portalCount = 0;
            int npcSpawnCount = 0;

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

                if (building.ExteriorPrefab == null)
                {
                    report.AddWarning($"Missing exterior prefab for building {building.BuildingId}");
                }
                else
                {
                    var exterior = (GameObject)PrefabUtility.InstantiatePrefab(building.ExteriorPrefab);
                    exterior.name = $"Exterior_{building.BuildingId}";
                    exterior.transform.SetParent(buildingsRoot.transform);
                    exterior.transform.position = anchor.transform.position + building.ExteriorOffset;
                    exterior.transform.rotation = anchor.transform.rotation * Quaternion.Euler(building.ExteriorRotationEuler);
                    buildingCount++;
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

                    var insideSpawn = new GameObject($"{building.BuildingId}_InsideSpawn");
                    insideSpawn.transform.SetParent(interior.transform);
                    insideSpawn.transform.localPosition = Vector3.zero;

                    var outsideSpawn = new GameObject($"{building.BuildingId}_OutsideSpawn");
                    outsideSpawn.transform.SetParent(portalRoot.transform);
                    outsideSpawn.transform.position = anchor.transform.position + building.ExteriorPortalOffset + Vector3.up * 0.5f;
                    outsideSpawn.transform.rotation = anchor.transform.rotation;

                    var interiorPortal = CreatePortal(interior.transform, $"{building.BuildingId}_Portal_Interior",
                        interior.transform.position + building.InteriorPortalLocalOffset, Quaternion.identity, true);
                    var exteriorPortal = CreatePortal(portalRoot.transform, $"{building.BuildingId}_Portal_Exterior",
                        outsideSpawn.transform.position, outsideSpawn.transform.rotation, false);

                    interiorPortal.Configure(exteriorPortal, outsideSpawn.transform, inside: true, autoReturnSeconds: 6f);
                    exteriorPortal.Configure(interiorPortal, insideSpawn.transform, inside: false, autoReturnSeconds: 6f);

                    CreatePortalMarker(markerRoot.transform, $"{building.BuildingId}_PortalMarker", outsideSpawn.transform.position, outsideSpawn.transform.rotation);
                    portalCount += 2;
                }
                else
                {
                    report.AddWarning($"Missing interior prefab for building {building.BuildingId}");
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
            }

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

                if (npc.Prefab != null)
                {
                    var instance = (GameObject)PrefabUtility.InstantiatePrefab(npc.Prefab);
                    instance.name = npc.NpcId;
                    instance.transform.SetParent(npcRoot.transform);
                    instance.transform.position = spawn.transform.position;
                    instance.transform.rotation = anchor.transform.rotation;

                    var agent = instance.GetComponent<UnityEngine.AI.NavMeshAgent>();
                    if (agent != null)
                    {
                        NavMeshAgentTuning.Apply(agent, new NavMeshAgentTuning.Settings
                        {
                            Radius = 0.28f,
                            Height = 1.6f,
                            BaseOffset = 0.05f,
                            Speed = npc.Speed,
                            AngularSpeed = 420f,
                            Acceleration = 10f,
                            StoppingDistance = npc.StoppingDistance,
                            AvoidancePriority = npc.AvoidancePriority
                        });
                    }

                    var persona = instance.GetComponent<NpcPersona>();
                    if (persona != null)
                    {
                        persona.Configure(npc.NpcId, npc.RoleName, "Seeded NPC", "Short");
                    }
                }
            }

            report.LogSummary($"Rebuild complete: Buildings={buildingCount}, Interiors={interiorCount}, Interactables={interactableCount}, Portals={portalCount}, NPCSpawns={npcSpawnCount}");
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

        private static InteriorPortal CreatePortal(Transform parent, string name, Vector3 position, Quaternion rotation, bool inside)
        {
            var portalObject = new GameObject(name);
            portalObject.transform.SetParent(parent);
            portalObject.transform.position = position;
            portalObject.transform.rotation = rotation;

            var collider = portalObject.AddComponent<BoxCollider>();
            collider.isTrigger = true;
            collider.size = new Vector3(2.2f, 2.6f, 1.6f);

            var portal = portalObject.AddComponent<InteriorPortal>();
            portal.Configure(null, null, inside, autoReturnSeconds: 6f);
            return portal;
        }

        private static void CreatePortalMarker(Transform parent, string name, Vector3 position, Quaternion rotation)
        {
            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = name;
            marker.transform.SetParent(parent);
            marker.transform.position = position;
            marker.transform.rotation = rotation;
            marker.transform.localScale = new Vector3(1.4f, 2.2f, 0.1f);

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
    }
}
