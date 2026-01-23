using System.Collections.Generic;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.World;
using UnityEditor;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;

namespace DreamOfOne.Editor
{
    public static class WorldDefinitionSeeder
    {
        private const string WorldAssetPath = "Assets/Data/WorldDefinition.asset";
        private const string DataRoot = "Assets/Data";
        private const string WorldRoot = "Assets/Data/World";
        private const string InteriorRoot = "Assets/Data/Interiors";
        private const string PrefabRoot = "Assets/Data/Prefabs";

        [MenuItem("Tools/DreamOfOne/Seed World Definition (Default)")]
        public static void SeedDefaultWorld()
        {
            EnsureFolders();

            var world = AssetDatabase.LoadAssetAtPath<WorldDefinition>(WorldAssetPath);
            if (world == null)
            {
                world = ScriptableObject.CreateInstance<WorldDefinition>();
                AssetDatabase.CreateAsset(world, WorldAssetPath);
            }

            var interactablePrefab = EnsureInteractablePrefab();
            var citizenPrefab = EnsureNpcPrefab("NPC_Citizen", new Color(0.35f, 0.9f, 0.35f, 1f), false);
            var policePrefab = EnsureNpcPrefab("NPC_Police", new Color(0.2f, 0.45f, 0.95f, 1f), true);

            var buildings = new List<BuildingDefinition>
            {
                CreateBuilding("Store", "StoreBuilding", CreateInteriorPrefab("Interior_Store", new Vector3(10f, 3f, 10f), InteriorStyle.Store)),
                CreateBuilding("Studio", "StudioBuilding_L1", CreateInteriorPrefab("Interior_Studio", new Vector3(12f, 3f, 10f), InteriorStyle.Studio)),
                CreateBuilding("Police", "Station", CreateInteriorPrefab("Interior_Police", new Vector3(9f, 3f, 9f), InteriorStyle.Police)),
                CreateBuilding("Cafe", "Cafe", CreateInteriorPrefab("Interior_Cafe", new Vector3(8f, 3f, 8f), InteriorStyle.Cafe)),
                CreateBuilding("Park", "ParkArea", null)
            };

            var interactables = new List<InteractableDefinition>
            {
                // Store
                CreateInteractable("Store_QueueMarker", "StoreBuilding", interactablePrefab, new Vector3(1.5f, 0f, -1.5f), CoreEventType.ViolationDetected, EventCategory.Rule, ZoneType.Queue, "R_QUEUE", "Queue marker", "Store"),
                CreateInteractable("Store_LabelBoard", "StoreBuilding", interactablePrefab, new Vector3(-1.5f, 0f, -0.5f), CoreEventType.LabelChanged, EventCategory.Evidence, ZoneType.None, "R_LABEL", "Label update", "Store"),
                CreateInteractable("Store_Printer", "StoreBuilding", interactablePrefab, new Vector3(0.5f, 0f, 0.5f), CoreEventType.TicketIssued, EventCategory.Evidence, ZoneType.None, "R_QUEUE", "Receipt/ticket", "Store"),
                CreateInteractable("Store_CounterBell", "StoreBuilding", interactablePrefab, new Vector3(0.5f, 0f, -0.5f), CoreEventType.QueueUpdated, EventCategory.Organization, ZoneType.None, "R_QUEUE", "Queue update", "Store"),
                CreateInteractable("Store_StockShelf", "StoreBuilding", interactablePrefab, new Vector3(-0.5f, 0f, 0.8f), CoreEventType.TaskCompleted, EventCategory.Organization, ZoneType.None, "R_LABEL", "Stock update", "Store"),

                // Studio
                CreateInteractable("Studio_Kanban", "StudioBuilding_L1", interactablePrefab, new Vector3(1.2f, 0f, 0.8f), CoreEventType.TaskStarted, EventCategory.Organization, ZoneType.None, "PROC_KANBAN", "Kanban moved", "Studio"),
                CreateInteractable("Studio_PatchTerminal", "StudioBuilding_L1", interactablePrefab, new Vector3(-1.2f, 0f, 0.8f), CoreEventType.TaskCompleted, EventCategory.Organization, ZoneType.None, "PROC_PATCH", "Patch note", "Studio"),
                CreateInteractable("Studio_ApprovalDesk", "StudioBuilding_L1", interactablePrefab, new Vector3(0.6f, 0f, -0.6f), CoreEventType.ApprovalGranted, EventCategory.Procedure, ZoneType.None, "PROC_APPROVAL", "Approval granted", "Studio"),
                CreateInteractable("Studio_RCInsert", "StudioBuilding_L1", interactablePrefab, new Vector3(-0.6f, 0f, -0.6f), CoreEventType.RcInserted, EventCategory.Procedure, ZoneType.None, "PROC_RC", "RC inserted", "Studio"),
                CreateInteractable("Studio_Lounge", "StudioBuilding_L1", interactablePrefab, new Vector3(0f, 0f, 1.6f), CoreEventType.RumorShared, EventCategory.Gossip, ZoneType.None, "GOSSIP", "Lounge gossip", "Studio"),

                // Park
                CreateInteractable("Park_Bench", "ParkArea", interactablePrefab, new Vector3(1.5f, 0f, 1f), CoreEventType.SeatClaimed, EventCategory.Zone, ZoneType.Seat, "R_SEAT", "Seat claimed", "Park"),
                CreateInteractable("Park_QuietSign", "ParkArea", interactablePrefab, new Vector3(-1.5f, 0f, 1f), CoreEventType.NoiseObserved, EventCategory.Rule, ZoneType.None, "R_NOISE", "Noise warning", "Park"),
                CreateInteractable("Park_Bulletin", "ParkArea", interactablePrefab, new Vector3(0f, 0f, -1.2f), CoreEventType.RumorShared, EventCategory.Gossip, ZoneType.None, "GOSSIP", "Bulletin rumor", "Park"),
                CreateInteractable("Park_PhotoSpot", "ParkArea", interactablePrefab, new Vector3(0.8f, 0f, -0.6f), CoreEventType.ViolationDetected, EventCategory.Rule, ZoneType.Photo, "R_PHOTO", "Photo violation", "Park"),

                // Police
                CreateInteractable("Police_ReportDesk", "Station", interactablePrefab, new Vector3(1f, 0f, -0.6f), CoreEventType.ReportFiled, EventCategory.Report, ZoneType.None, "R_QUEUE", "Report filed", "Police"),
                CreateInteractable("Police_EvidenceBoard", "Station", interactablePrefab, new Vector3(-1f, 0f, -0.6f), CoreEventType.EvidenceCaptured, EventCategory.Evidence, ZoneType.None, "EVIDENCE", "Evidence attached", "Police"),
                CreateInteractable("Police_TicketPrinter", "Station", interactablePrefab, new Vector3(0.6f, 0f, 0.6f), CoreEventType.TicketIssued, EventCategory.Evidence, ZoneType.None, "R_QUEUE", "Ticket issued", "Police"),
                CreateInteractable("Police_CCTVConsole", "Station", interactablePrefab, new Vector3(-0.6f, 0f, 0.6f), CoreEventType.CctvCaptured, EventCategory.Evidence, ZoneType.None, "CCTV", "CCTV capture", "Police"),
                CreateInteractable("Police_Interrogation", "Station", interactablePrefab, new Vector3(0f, 0f, 1.2f), CoreEventType.InterrogationStarted, EventCategory.Procedure, ZoneType.None, "PROC_INTERROGATION", "Interrogation started", "Police"),
                CreateInteractable("Police_CaseBoard", "Station", interactablePrefab, new Vector3(0f, 0f, -1.2f), CoreEventType.TaskCompleted, EventCategory.Procedure, ZoneType.None, "PROC_CASE", "Case review", "Police")
            };

            var incidents = new List<IncidentDefinition>
            {
                CreateIncident(
                    "Incident_StoreQueue",
                    "Store queue/label friction -> gossip/report -> police follow-up.",
                    new [] { "Store_QueueMarker", "Store_LabelBoard", "Police_ReportDesk" },
                    new [] { "TicketIssued", "CctvCaptured" }),
                CreateIncident(
                    "Incident_StudioRC",
                    "Studio RC procedure slip -> approval artifact -> verdict.",
                    new [] { "Studio_Kanban", "Studio_ApprovalDesk", "Studio_RCInsert" },
                    new [] { "ApprovalGranted", "RcInserted" })
            };

            var npcs = new List<NpcDefinition>
            {
                CreateNpc("Citizen_A", "Citizen", "StoreBuilding", new Vector3(2f, 0f, 2f), false, 1.2f, 0.2f, 60, citizenPrefab),
                CreateNpc("Citizen_B", "Citizen", "ParkArea", new Vector3(-2f, 0f, 1f), false, 1.2f, 0.2f, 60, citizenPrefab),
                CreateNpc("Citizen_C", "Citizen", "StudioBuilding_L1", new Vector3(1f, 0f, -1f), false, 1.2f, 0.2f, 60, citizenPrefab),
                CreateNpc("Citizen_D", "Citizen", "Cafe", new Vector3(-1f, 0f, 1f), false, 1.2f, 0.2f, 60, citizenPrefab),
                CreateNpc("Citizen_E", "Citizen", "ParkArea", new Vector3(1f, 0f, -1f), false, 1.2f, 0.2f, 60, citizenPrefab),
                CreateNpc("Citizen_F", "Citizen", "StoreBuilding", new Vector3(-1f, 0f, -1f), false, 1.2f, 0.2f, 60, citizenPrefab),
                CreateNpc("Police_Officer", "Police", "Station", new Vector3(1f, 0f, 1f), true, 1.5f, 0.35f, 45, policePrefab)
            };

            ApplyWorldAsset(world, buildings, interactables, incidents, npcs);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Selection.activeObject = world;
            Debug.Log("[WorldSeeder] Default world data seeded.");
        }

        private static void ApplyWorldAsset(
            WorldDefinition world,
            List<BuildingDefinition> buildings,
            List<InteractableDefinition> interactables,
            List<IncidentDefinition> incidents,
            List<NpcDefinition> npcs)
        {
            var so = new SerializedObject(world);
            so.FindProperty("buildings").ClearArray();
            so.FindProperty("interactables").ClearArray();
            so.FindProperty("npcs").ClearArray();
            so.FindProperty("incidents").ClearArray();

            var buildingProp = so.FindProperty("buildings");
            for (int i = 0; i < buildings.Count; i++)
            {
                buildingProp.InsertArrayElementAtIndex(i);
                buildingProp.GetArrayElementAtIndex(i).objectReferenceValue = buildings[i];
            }

            var interactableProp = so.FindProperty("interactables");
            for (int i = 0; i < interactables.Count; i++)
            {
                interactableProp.InsertArrayElementAtIndex(i);
                interactableProp.GetArrayElementAtIndex(i).objectReferenceValue = interactables[i];
            }

            var incidentProp = so.FindProperty("incidents");
            for (int i = 0; i < incidents.Count; i++)
            {
                incidentProp.InsertArrayElementAtIndex(i);
                incidentProp.GetArrayElementAtIndex(i).objectReferenceValue = incidents[i];
            }

            var npcProp = so.FindProperty("npcs");
            for (int i = 0; i < npcs.Count; i++)
            {
                npcProp.InsertArrayElementAtIndex(i);
                npcProp.GetArrayElementAtIndex(i).objectReferenceValue = npcs[i];
            }

            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(world);
        }

        private static BuildingDefinition CreateBuilding(string id, string anchorName, GameObject interiorPrefab)
        {
            string path = $"{WorldRoot}/Buildings/Building_{id}.asset";
            var asset = AssetDatabase.LoadAssetAtPath<BuildingDefinition>(path);
            if (asset == null)
            {
                EnsureFolder($"{WorldRoot}/Buildings");
                asset = ScriptableObject.CreateInstance<BuildingDefinition>();
                AssetDatabase.CreateAsset(asset, path);
            }

            var so = new SerializedObject(asset);
            so.FindProperty("buildingId").stringValue = id;
            so.FindProperty("anchorName").stringValue = anchorName;
            so.FindProperty("interiorPrefab").objectReferenceValue = interiorPrefab;
            so.FindProperty("exteriorOffset").vector3Value = Vector3.zero;
            so.FindProperty("exteriorRotationEuler").vector3Value = Vector3.zero;
            so.FindProperty("interiorLocalOffset").vector3Value = Vector3.zero;
            so.FindProperty("interiorPortalLocalOffset").vector3Value = new Vector3(0f, 0.1f, -3f);
            so.FindProperty("exteriorPortalOffset").vector3Value = new Vector3(0f, 0f, 2.2f);
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(asset);
            return asset;
        }

        private static InteractableDefinition CreateInteractable(
            string id,
            string anchorName,
            GameObject prefab,
            Vector3 localOffset,
            CoreEventType eventType,
            EventCategory category,
            ZoneType zoneType,
            string ruleId,
            string note,
            string placeId)
        {
            string path = $"{WorldRoot}/Interactables/Interactable_{id}.asset";
            var asset = AssetDatabase.LoadAssetAtPath<InteractableDefinition>(path);
            if (asset == null)
            {
                EnsureFolder($"{WorldRoot}/Interactables");
                asset = ScriptableObject.CreateInstance<InteractableDefinition>();
                AssetDatabase.CreateAsset(asset, path);
            }

            var so = new SerializedObject(asset);
            so.FindProperty("interactableId").stringValue = id;
            so.FindProperty("anchorName").stringValue = anchorName;
            so.FindProperty("prefab").objectReferenceValue = prefab;
            so.FindProperty("localOffset").vector3Value = localOffset;
            so.FindProperty("localRotationEuler").vector3Value = Vector3.zero;
            so.FindProperty("ruleId").stringValue = ruleId;
            so.FindProperty("eventType").enumValueIndex = (int)eventType;
            so.FindProperty("eventCategory").enumValueIndex = (int)category;
            so.FindProperty("zoneType").enumValueIndex = (int)zoneType;
            so.FindProperty("prompt").stringValue = "E: Interact";
            so.FindProperty("note").stringValue = note;
            so.FindProperty("severity").intValue = 2;
            so.FindProperty("placeId").stringValue = placeId;
            so.FindProperty("triggerSize").vector3Value = new Vector3(2f, 2f, 2f);
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(asset);
            return asset;
        }

        private static NpcDefinition CreateNpc(
            string id,
            string role,
            string anchorName,
            Vector3 spawnOffset,
            bool isPolice,
            float speed,
            float stoppingDistance,
            int avoidancePriority,
            GameObject prefab)
        {
            string path = $"{WorldRoot}/NPCs/NPC_{id}.asset";
            var asset = AssetDatabase.LoadAssetAtPath<NpcDefinition>(path);
            if (asset == null)
            {
                EnsureFolder($"{WorldRoot}/NPCs");
                asset = ScriptableObject.CreateInstance<NpcDefinition>();
                AssetDatabase.CreateAsset(asset, path);
            }

            var so = new SerializedObject(asset);
            so.FindProperty("npcId").stringValue = id;
            so.FindProperty("roleName").stringValue = role;
            so.FindProperty("anchorName").stringValue = anchorName;
            so.FindProperty("spawnOffset").vector3Value = spawnOffset;
            so.FindProperty("isPolice").boolValue = isPolice;
            so.FindProperty("speed").floatValue = speed;
            so.FindProperty("stoppingDistance").floatValue = stoppingDistance;
            so.FindProperty("avoidancePriority").intValue = avoidancePriority;
            so.FindProperty("prefab").objectReferenceValue = prefab;
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(asset);
            return asset;
        }

        private static IncidentDefinition CreateIncident(string id, string description, string[] interactables, string[] artifacts)
        {
            string path = $"{WorldRoot}/Incidents/Incident_{id}.asset";
            var asset = AssetDatabase.LoadAssetAtPath<IncidentDefinition>(path);
            if (asset == null)
            {
                EnsureFolder($"{WorldRoot}/Incidents");
                asset = ScriptableObject.CreateInstance<IncidentDefinition>();
                AssetDatabase.CreateAsset(asset, path);
            }

            var so = new SerializedObject(asset);
            so.FindProperty("incidentId").stringValue = id;
            so.FindProperty("description").stringValue = description;
            SetStringArray(so.FindProperty("requiredInteractables"), interactables);
            SetStringArray(so.FindProperty("requiredArtifacts"), artifacts);
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(asset);
            return asset;
        }

        private static GameObject EnsureInteractablePrefab()
        {
            EnsureFolder(PrefabRoot);
            string path = $"{PrefabRoot}/InteractableMarker.prefab";
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab != null)
            {
                return prefab;
            }

            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = "InteractableMarker";
            marker.transform.localScale = new Vector3(0.4f, 0.4f, 0.4f);

            var renderer = marker.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = AssetDatabase.GetBuiltinExtraResource<Material>("Default-Material.mat");
                renderer.sharedMaterial.color = new Color(0.35f, 0.9f, 0.35f, 1f);
            }

            var prefabAsset = PrefabUtility.SaveAsPrefabAsset(marker, path);
            Object.DestroyImmediate(marker);
            return prefabAsset;
        }

        private static GameObject EnsureNpcPrefab(string name, Color color, bool isPolice)
        {
            EnsureFolder(PrefabRoot);
            string path = $"{PrefabRoot}/{name}.prefab";
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab != null)
            {
                return prefab;
            }

            var npc = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            npc.name = name;
            npc.transform.localScale = new Vector3(0.8f, 0.8f, 0.8f);

            var renderer = npc.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = AssetDatabase.GetBuiltinExtraResource<Material>("Default-Material.mat");
                renderer.sharedMaterial.color = color;
            }

            npc.AddComponent<UnityEngine.AI.NavMeshAgent>();
            npc.AddComponent<NpcPersona>();
            npc.AddComponent<NpcContext>();
            if (!isPolice)
            {
                npc.AddComponent<SuspicionComponent>();
                npc.AddComponent<SimplePatrol>();
            }
            else
            {
                npc.AddComponent<PoliceController>();
            }

            var prefabAsset = PrefabUtility.SaveAsPrefabAsset(npc, path);
            Object.DestroyImmediate(npc);
            return prefabAsset;
        }

        private static GameObject CreateInteriorPrefab(string name, Vector3 size, InteriorStyle style)
        {
            EnsureFolder(InteriorRoot);
            string path = $"{InteriorRoot}/{name}.prefab";
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (prefab != null)
            {
                return prefab;
            }

            var root = new GameObject(name);
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Floor";
            floor.transform.SetParent(root.transform);
            floor.transform.localScale = new Vector3(size.x, 0.2f, size.z);
            floor.transform.localPosition = Vector3.zero;

            var ceiling = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ceiling.name = "Ceiling";
            ceiling.transform.SetParent(root.transform);
            ceiling.transform.localScale = new Vector3(size.x, 0.2f, size.z);
            ceiling.transform.localPosition = new Vector3(0f, size.y, 0f);

            BuildWall(root.transform, "Wall_N", new Vector3(0f, size.y * 0.5f, size.z * 0.5f), new Vector3(size.x, size.y, 0.2f));
            BuildDoorwayWall(root.transform, size);
            BuildWall(root.transform, "Wall_E", new Vector3(size.x * 0.5f, size.y * 0.5f, 0f), new Vector3(0.2f, size.y, size.z));
            BuildWall(root.transform, "Wall_W", new Vector3(-size.x * 0.5f, size.y * 0.5f, 0f), new Vector3(0.2f, size.y, size.z));

            var propsRoot = new GameObject("Props");
            propsRoot.transform.SetParent(root.transform);
            propsRoot.transform.localPosition = Vector3.zero;

            CreateInteriorProps(propsRoot.transform, style);

            var prefabAsset = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefabAsset;
        }

        private static void CreateInteriorProps(Transform parent, InteriorStyle style)
        {
            switch (style)
            {
                case InteriorStyle.Store:
                    CreateProp(parent, "Counter", new Vector3(0f, 0.5f, -1f), new Vector3(3f, 1f, 1f));
                    CreateProp(parent, "Printer", new Vector3(1f, 0.5f, -0.5f), new Vector3(0.6f, 0.4f, 0.4f));
                    CreateProp(parent, "LabelBoard", new Vector3(-1.2f, 1.2f, -0.6f), new Vector3(1.6f, 0.8f, 0.1f));
                    break;
                case InteriorStyle.Studio:
                    CreateProp(parent, "Kanban", new Vector3(0.8f, 1.2f, -1f), new Vector3(1.6f, 0.8f, 0.1f));
                    CreateProp(parent, "Terminal", new Vector3(-0.8f, 0.5f, -0.6f), new Vector3(1.2f, 0.7f, 0.8f));
                    CreateProp(parent, "ApprovalDesk", new Vector3(0f, 0.5f, 0.8f), new Vector3(1.8f, 0.8f, 0.8f));
                    break;
                case InteriorStyle.Police:
                    CreateProp(parent, "ReportDesk", new Vector3(0f, 0.5f, -1f), new Vector3(2.5f, 0.9f, 1f));
                    CreateProp(parent, "EvidenceBoard", new Vector3(-1f, 1.2f, -0.4f), new Vector3(1.8f, 0.9f, 0.1f));
                    CreateProp(parent, "Printer", new Vector3(1f, 0.5f, -0.4f), new Vector3(0.6f, 0.4f, 0.4f));
                    CreateProp(parent, "InterrogationSpot", new Vector3(0f, 0.2f, 1f), new Vector3(0.6f, 0.4f, 0.6f));
                    break;
                case InteriorStyle.Cafe:
                    CreateProp(parent, "OrderDesk", new Vector3(0f, 0.5f, -1f), new Vector3(2.5f, 0.8f, 1f));
                    CreateProp(parent, "Seating", new Vector3(1f, 0.4f, 0.8f), new Vector3(1.2f, 0.6f, 1.2f));
                    CreateProp(parent, "MenuBoard", new Vector3(-1f, 1.2f, -0.5f), new Vector3(1.4f, 0.8f, 0.1f));
                    break;
            }
        }

        private static void CreateProp(Transform parent, string name, Vector3 localPos, Vector3 localScale)
        {
            var prop = GameObject.CreatePrimitive(PrimitiveType.Cube);
            prop.name = name;
            prop.transform.SetParent(parent);
            prop.transform.localPosition = localPos;
            prop.transform.localScale = localScale;
        }

        private static void BuildWall(Transform parent, string name, Vector3 localPosition, Vector3 localScale)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = name;
            wall.transform.SetParent(parent);
            wall.transform.localPosition = localPosition;
            wall.transform.localScale = localScale;
        }

        private static void BuildDoorwayWall(Transform parent, Vector3 size)
        {
            float doorWidth = 2.2f;
            float doorHeight = 2.2f;
            float wallDepth = 0.2f;

            float sideWidth = Mathf.Max(0.5f, (size.x - doorWidth) * 0.5f);
            float zPos = -size.z * 0.5f;

            BuildWall(parent, "Wall_S_Left", new Vector3(-(doorWidth * 0.5f + sideWidth * 0.5f), size.y * 0.5f, zPos), new Vector3(sideWidth, size.y, wallDepth));
            BuildWall(parent, "Wall_S_Right", new Vector3(doorWidth * 0.5f + sideWidth * 0.5f, size.y * 0.5f, zPos), new Vector3(sideWidth, size.y, wallDepth));

            float topHeight = Mathf.Max(0.2f, size.y - doorHeight);
            BuildWall(parent, "Wall_S_Top", new Vector3(0f, doorHeight + topHeight * 0.5f, zPos), new Vector3(doorWidth, topHeight, wallDepth));
        }

        private static void EnsureFolders()
        {
            EnsureFolder(DataRoot);
            EnsureFolder(WorldRoot);
            EnsureFolder($"{WorldRoot}/Buildings");
            EnsureFolder($"{WorldRoot}/Interactables");
            EnsureFolder($"{WorldRoot}/Incidents");
            EnsureFolder($"{WorldRoot}/NPCs");
            EnsureFolder(InteriorRoot);
            EnsureFolder(PrefabRoot);
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path))
            {
                return;
            }

            string parent = System.IO.Path.GetDirectoryName(path);
            string name = System.IO.Path.GetFileName(path);
            if (!AssetDatabase.IsValidFolder(parent))
            {
                EnsureFolder(parent);
            }

            AssetDatabase.CreateFolder(parent, name);
        }

        private static void SetStringArray(SerializedProperty property, string[] values)
        {
            property.ClearArray();
            if (values == null)
            {
                return;
            }

            for (int i = 0; i < values.Length; i++)
            {
                property.InsertArrayElementAtIndex(i);
                property.GetArrayElementAtIndex(i).stringValue = values[i];
            }
        }

        private enum InteriorStyle
        {
            Store,
            Studio,
            Police,
            Cafe
        }
    }
}
