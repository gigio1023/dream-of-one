#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class CityPackageSceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/Prototype.unity";
        private const float WorldScale = 1.6f;
        private const float BuildingScale = 1.25f;
        private const float RoadTileSize = 8f;

        private const string PrefabStore = "Assets/POLYGON city pack/Prefabs/Buildings/Supermaket_prefab.prefab";
        private const string PrefabStudio = "Assets/POLYGON city pack/Prefabs/Buildings/Building_D_prefab.prefab";
        private const string PrefabStation = "Assets/POLYGON city pack/Prefabs/Buildings/Police_station_prefab.prefab";
        private const string PrefabCafe = "Assets/POLYGON city pack/Prefabs/Buildings/Shop_A_prefab.prefab";
        private const string PrefabDelivery = "Assets/POLYGON city pack/Prefabs/Buildings/Building_J_prefab.prefab";
        private const string PrefabFacility = "Assets/POLYGON city pack/Prefabs/Buildings/Building_K_prefab.prefab";
        private const string PrefabMedia = "Assets/POLYGON city pack/Prefabs/Buildings/Building_R_Prefab.prefab";

        private const string PrefabParkTile = "Assets/POLYGON city pack/Prefabs/Floor/Grass_stone_1_prefab.prefab";
        private const string PrefabRoad = "Assets/POLYGON city pack/Prefabs/Floor/Street 8 Prefab.prefab";
        private const string PrefabSidewalk = "Assets/POLYGON city pack/Prefabs/Floor/Sideway 8 prefab.prefab";
        private const string PrefabLamp = "Assets/POLYGON city pack/Prefabs/Lamps/street_lamp 1 prefab.prefab";
        private const string PrefabTrafficLight = "Assets/POLYGON city pack/Prefabs/Props/Traffic light 3 Prefab.prefab";
        private const string PrefabBusStop = "Assets/POLYGON city pack/Prefabs/Props/Bus stop pole prefabe.prefab";
        private const string PrefabTree = "Assets/POLYGON city pack/Prefabs/Props/Tree prefab.prefab";
        private const string PrefabPotTree = "Assets/POLYGON city pack/Prefabs/Props/Pot_tree prefab.prefab";
        private const string PrefabBush = "Assets/POLYGON city pack/Prefabs/Props/Bush 2 mass prefab.prefab";
        private const string PrefabStreetStand = "Assets/POLYGON city pack/Prefabs/Props/StreetSellerStand prefab.prefab";
        private const string PrefabBench = "Assets/POLYGON city pack/Prefabs/Props/bench prefab.prefab";
        private const string PrefabBenchAlt = "Assets/POLYGON city pack/Prefabs/Props/Bench 2 prefab.prefab";
        private const string PrefabHedge = "Assets/POLYGON city pack/Prefabs/Props/hedge prefab.prefab";
        private const string PrefabTrash = "Assets/POLYGON city pack/Prefabs/Props/trashcan prefab 1.prefab";
        private const string PrefabSign = "Assets/POLYGON city pack/Prefabs/Props/platt sign 1 prefab.prefab";

        [MenuItem("Tools/DreamOfOne/Build City (POLYGON)")]
        public static void BuildCity()
        {
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            var root = GetOrCreateRoot("CITY_Package");
            ClearChildren(root);

            var anchors = GetOrCreateRoot("CITY_Anchors");
            ClearChildren(anchors);

            BuildRoadGrid(root);

            PlaceBuilding(root, anchors, PrefabStore, "StoreBuilding", new Vector3(-12f, 0f, 8f), 180f);
            PlaceBuilding(root, anchors, PrefabStudio, "StudioBuilding_L1", new Vector3(0f, 0f, -12f), 0f);
            PlaceBuilding(root, anchors, PrefabStation, "Station", new Vector3(0f, 0f, -18f), 0f);
            PlaceBuilding(root, anchors, PrefabCafe, "Cafe", new Vector3(-12f, 0f, -8f), 90f);
            PlaceBuilding(root, anchors, PrefabDelivery, "DeliveryBay", new Vector3(12f, 0f, -8f), -90f);
            PlaceBuilding(root, anchors, PrefabFacility, "Facility", new Vector3(8f, 0f, -12f), 45f);
            PlaceBuilding(root, anchors, PrefabMedia, "MediaZone", new Vector3(0f, 0f, 12f), 0f);

            PlacePark(root, anchors, new Vector3(12f, 0f, 8f));
            PlaceProps(root);
            PlaceExtraBuildings(root);
            PlaceCctv(root);
            EnsureLighting();
            EnsureNavMesh(root);

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
            Debug.Log("[CityBuilder] POLYGON city pack layout applied to Prototype scene.");
        }

        private static GameObject GetOrCreateRoot(string name)
        {
            var existing = GameObject.Find(name);
            if (existing != null)
            {
                return existing;
            }

            var root = new GameObject(name);
            return root;
        }

        private static void ClearChildren(GameObject root)
        {
            for (int i = root.transform.childCount - 1; i >= 0; i--)
            {
                Object.DestroyImmediate(root.transform.GetChild(i).gameObject);
            }
        }

        private static void BuildRoadGrid(GameObject root)
        {
            float tile = RoadTileSize * WorldScale;
            float half = tile * 0.5f;
            int extent = 2;

            for (int i = -extent; i <= extent; i++)
            {
                float offset = i * tile;
                PlacePrefab(root, PrefabRoad, new Vector3(0f, 0f, offset), 0f, $"MainRoad_X_{i}", Vector3.one);
                PlacePrefab(root, PrefabRoad, new Vector3(offset, 0f, 0f), 90f, $"MainRoad_Z_{i}", Vector3.one);

                PlacePrefab(root, PrefabSidewalk, new Vector3(0f, 0.02f, offset + half), 0f, $"Sidewalk_N_{i}", Vector3.one);
                PlacePrefab(root, PrefabSidewalk, new Vector3(0f, 0.02f, offset - half), 180f, $"Sidewalk_S_{i}", Vector3.one);
                PlacePrefab(root, PrefabSidewalk, new Vector3(offset + half, 0.02f, 0f), 90f, $"Sidewalk_E_{i}", Vector3.one);
                PlacePrefab(root, PrefabSidewalk, new Vector3(offset - half, 0.02f, 0f), -90f, $"Sidewalk_W_{i}", Vector3.one);
            }
        }

        private static void PlaceBuilding(GameObject root, GameObject anchors, string prefabPath, string anchorName, Vector3 position, float yaw)
        {
            var instance = PlacePrefab(root, prefabPath, ScaleXZ(position), yaw, anchorName + "_Prefab", Vector3.one * BuildingScale);
            if (instance == null)
            {
                return;
            }

            var anchor = new GameObject(anchorName);
            anchor.transform.SetParent(anchors.transform);
            anchor.transform.position = ScaleXZ(position);
            anchor.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
        }

        private static void PlacePark(GameObject root, GameObject anchors, Vector3 center)
        {
            PlacePrefab(root, PrefabParkTile, ScaleXZ(center), 0f, "ParkTile", Vector3.one);
            var anchor = new GameObject("ParkArea");
            anchor.transform.SetParent(anchors.transform);
            anchor.transform.position = ScaleXZ(center);
        }

        private static void PlaceProps(GameObject root)
        {
            PlacePrefab(root, PrefabLamp, ScaleXZ(new Vector3(-6f, 0f, 6f)), 0f, "Lamp_NW", Vector3.one);
            PlacePrefab(root, PrefabLamp, ScaleXZ(new Vector3(6f, 0f, 6f)), 0f, "Lamp_NE", Vector3.one);
            PlacePrefab(root, PrefabLamp, ScaleXZ(new Vector3(-6f, 0f, -6f)), 0f, "Lamp_SW", Vector3.one);
            PlacePrefab(root, PrefabLamp, ScaleXZ(new Vector3(6f, 0f, -6f)), 0f, "Lamp_SE", Vector3.one);
            PlacePrefab(root, PrefabTrafficLight, ScaleXZ(new Vector3(0f, 0f, 5f)), 0f, "TrafficLight_N", Vector3.one);
            PlacePrefab(root, PrefabTrafficLight, ScaleXZ(new Vector3(0f, 0f, -5f)), 180f, "TrafficLight_S", Vector3.one);
            PlacePrefab(root, PrefabBusStop, ScaleXZ(new Vector3(-8f, 0f, 0f)), 90f, "BusStop_W", Vector3.one);
            PlacePrefab(root, PrefabTree, ScaleXZ(new Vector3(10f, 0f, 10f)), 0f, "Tree_NE", Vector3.one);
            PlacePrefab(root, PrefabTree, ScaleXZ(new Vector3(-10f, 0f, 10f)), 0f, "Tree_NW", Vector3.one);
            PlacePrefab(root, PrefabTree, ScaleXZ(new Vector3(10f, 0f, -10f)), 0f, "Tree_SE", Vector3.one);
            PlacePrefab(root, PrefabTree, ScaleXZ(new Vector3(-10f, 0f, -10f)), 0f, "Tree_SW", Vector3.one);
            PlacePrefab(root, PrefabPotTree, ScaleXZ(new Vector3(-11f, 0f, 6f)), 0f, "PotTree_Store", Vector3.one);
            PlacePrefab(root, PrefabBush, ScaleXZ(new Vector3(11f, 0f, 6f)), 0f, "Bush_Park", Vector3.one);
            PlacePrefab(root, PrefabStreetStand, ScaleXZ(new Vector3(-9f, 0f, -2f)), 90f, "StreetStand_W", Vector3.one);
            PlacePrefab(root, PrefabBench, ScaleXZ(new Vector3(12f, 0f, 7f)), 180f, "Bench_Park_N", Vector3.one);
            PlacePrefab(root, PrefabBenchAlt, ScaleXZ(new Vector3(12f, 0f, 9f)), 0f, "Bench_Park_S", Vector3.one);
            PlacePrefab(root, PrefabHedge, ScaleXZ(new Vector3(10f, 0f, 8f)), 90f, "Hedge_Park_W", Vector3.one);
            PlacePrefab(root, PrefabHedge, ScaleXZ(new Vector3(14f, 0f, 8f)), -90f, "Hedge_Park_E", Vector3.one);
            PlacePrefab(root, PrefabTrash, ScaleXZ(new Vector3(-11f, 0f, 7f)), 0f, "Trash_Store", Vector3.one);
            PlacePrefab(root, PrefabSign, ScaleXZ(new Vector3(-10f, 0f, 8f)), 90f, "Sign_Store", Vector3.one);
        }

        private static void PlaceExtraBuildings(GameObject root)
        {
            PlacePrefab(root, PrefabStudio, ScaleXZ(new Vector3(22f, 0f, 14f)), 90f, "Studio_Annex", Vector3.one * BuildingScale);
            PlacePrefab(root, PrefabFacility, ScaleXZ(new Vector3(-22f, 0f, 14f)), -90f, "Facility_Annex", Vector3.one * BuildingScale);
            PlacePrefab(root, PrefabCafe, ScaleXZ(new Vector3(22f, 0f, -14f)), 0f, "Cafe_Block", Vector3.one * BuildingScale);
            PlacePrefab(root, PrefabDelivery, ScaleXZ(new Vector3(-22f, 0f, -14f)), 180f, "Delivery_Block", Vector3.one * BuildingScale);
        }

        private static void PlaceCctv(GameObject root)
        {
            var camA = GameObject.CreatePrimitive(PrimitiveType.Cube);
            camA.name = "CCTV_A";
            camA.transform.SetParent(root.transform);
            camA.transform.position = ScaleXZ(new Vector3(-6f, 3f, 6f));
            camA.transform.localScale = new Vector3(0.3f, 0.3f, 0.6f);

            var camB = GameObject.CreatePrimitive(PrimitiveType.Cube);
            camB.name = "CCTV_B";
            camB.transform.SetParent(root.transform);
            camB.transform.position = ScaleXZ(new Vector3(6f, 3f, -6f));
            camB.transform.localScale = new Vector3(0.3f, 0.3f, 0.6f);
        }

        private static void EnsureLighting()
        {
            var sun = GameObject.Find("SunLight");
            if (sun == null)
            {
                sun = new GameObject("SunLight");
                var light = sun.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.1f;
                light.shadows = LightShadows.Soft;
                sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            }

            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.35f, 0.35f, 0.35f);
            QualitySettings.shadowDistance = 80f;

            var probe = GameObject.Find("CITY_ReflectionProbe");
            if (probe == null)
            {
                probe = new GameObject("CITY_ReflectionProbe");
                var reflection = probe.AddComponent<ReflectionProbe>();
                reflection.mode = UnityEngine.Rendering.ReflectionProbeMode.Baked;
                reflection.refreshMode = UnityEngine.Rendering.ReflectionProbeRefreshMode.ViaScripting;
                reflection.size = new Vector3(60f, 20f, 60f);
                probe.transform.position = new Vector3(0f, 8f, 0f);
            }
        }

        private static GameObject PlacePrefab(GameObject root, string prefabPath, Vector3 position, float yaw, string nameOverride, Vector3 scale)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
            if (prefab == null)
            {
                Debug.LogWarning($"[CityBuilder] Missing prefab: {prefabPath}");
                return null;
            }

            var instance = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            if (instance == null)
            {
                Debug.LogWarning($"[CityBuilder] Failed to instantiate prefab: {prefabPath}");
                return null;
            }

            instance.name = nameOverride;
            instance.transform.SetParent(root.transform);
            instance.transform.position = position;
            instance.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            instance.transform.localScale = scale;
            GameObjectUtility.SetStaticEditorFlags(instance, StaticEditorFlags.BatchingStatic | StaticEditorFlags.OccludeeStatic | StaticEditorFlags.OccluderStatic | StaticEditorFlags.ContributeGI);
            return instance;
        }

        private static void EnsureNavMesh(GameObject root)
        {
            var surfaceType = ResolveType("Unity.AI.Navigation.NavMeshSurface");
            if (surfaceType == null)
            {
                return;
            }

            var existing = Object.FindFirstObjectByType(surfaceType) as Component;
            if (existing == null)
            {
                var surfaceObj = new GameObject("City_NavMeshSurface");
                surfaceObj.transform.SetParent(root.transform);
                existing = surfaceObj.AddComponent(surfaceType);
            }

            var buildMethod = surfaceType.GetMethod("BuildNavMesh");
            buildMethod?.Invoke(existing, null);
        }

        private static System.Type ResolveType(string typeName)
        {
            foreach (var assembly in System.AppDomain.CurrentDomain.GetAssemblies())
            {
                var type = assembly.GetType(typeName);
                if (type != null)
                {
                    return type;
                }
            }

            return null;
        }

        private static Vector3 ScaleXZ(Vector3 value)
        {
            return new Vector3(value.x * WorldScale, value.y, value.z * WorldScale);
        }
    }
}
#endif
