#if UNITY_EDITOR
using System;
using System.Linq;
using System.Reflection;
using DreamOfOne.Core;
using DreamOfOne.World;
using UnityEditor;
using UnityEngine;
using Object = UnityEngine.Object;

namespace DreamOfOne.Editor
{
    public static class SimpleVerificationModeTools
    {
        private const string WorldDefinitionAssetPath = "Assets/Data/WorldDefinition.asset";
        private const string SimpleCityBuildMenuPath = "Tools/DreamOfOne/Build City (POLYGON, Simple Verification)";
        private const string SimpleSeedMenuPath = "Tools/DreamOfOne/Seed World Definition (Simple Verification)";

        [MenuItem("Tools/DreamOfOne/Apply Simple Verification Mode")]
        public static void ApplySimpleVerificationMode()
        {
            if (!RunSimpleCityBuild())
            {
                Debug.LogError("[SimpleVerificationMode] Simple city build entrypoint not found. Expected menu: Tools/DreamOfOne/Build City (POLYGON, Simple Verification).");
                return;
            }

            if (!RunSimpleWorldSeed())
            {
                Debug.LogError("[SimpleVerificationMode] Simple world seeder entrypoint not found. Expected menu: Tools/DreamOfOne/Seed World Definition (Simple Verification).");
                return;
            }

            WorldDefinitionBuilder.RebuildWorldFromData();
            LogSummary();
        }

        private static bool RunSimpleCityBuild()
        {
            if (EditorApplication.ExecuteMenuItem(SimpleCityBuildMenuPath))
            {
                return true;
            }

            var builderType = typeof(CityPackageSceneBuilder);
            var method = builderType
                .GetMethods(BindingFlags.Public | BindingFlags.Static)
                .FirstOrDefault(m =>
                    m.GetParameters().Length == 0
                    && m.Name.IndexOf("Build", StringComparison.OrdinalIgnoreCase) >= 0
                    && m.Name.IndexOf("Simple", StringComparison.OrdinalIgnoreCase) >= 0);

            if (method == null)
            {
                return false;
            }

            method.Invoke(null, null);
            return true;
        }

        private static bool RunSimpleWorldSeed()
        {
            if (EditorApplication.ExecuteMenuItem(SimpleSeedMenuPath))
            {
                return true;
            }

            var seederType = typeof(WorldDefinitionSeeder);
            var method = seederType
                .GetMethods(BindingFlags.Public | BindingFlags.Static)
                .FirstOrDefault(m =>
                    m.GetParameters().Length == 0
                    && m.Name.IndexOf("Seed", StringComparison.OrdinalIgnoreCase) >= 0
                    && m.Name.IndexOf("Simple", StringComparison.OrdinalIgnoreCase) >= 0);

            if (method == null)
            {
                return false;
            }

            method.Invoke(null, null);
            return true;
        }

        private static void LogSummary()
        {
            var world = AssetDatabase.LoadAssetAtPath<WorldDefinition>(WorldDefinitionAssetPath);
            int worldBuildingCount = world != null && world.Buildings != null ? world.Buildings.Count : 0;
            int worldInteractableCount = world != null && world.Interactables != null ? world.Interactables.Count : 0;
            int worldNpcCount = world != null && world.Npcs != null ? world.Npcs.Count : 0;
            int worldIncidentCount = world != null && world.Incidents != null ? world.Incidents.Count : 0;
            int worldTextSurfaceCount = world != null && world.TextSurfaceDatabase != null && world.TextSurfaceDatabase.TextSurfaces != null
                ? world.TextSurfaceDatabase.TextSurfaces.Count
                : 0;

            int runtimeInteractableCount = Object.FindObjectsByType<ZoneInteractable>(FindObjectsInactive.Include, FindObjectsSortMode.None).Length;
            int runtimePortalCount = Object.FindObjectsByType<InteriorPortal>(FindObjectsInactive.Include, FindObjectsSortMode.None).Length;
            int runtimeNpcSpawnCount = ResolveNpcSpawnCount();

            string npcSpawnSummary = runtimeNpcSpawnCount >= 0
                ? runtimeNpcSpawnCount.ToString()
                : "unavailable";

            Debug.Log(
                $"[SimpleVerificationMode] Applied. " +
                $"WorldAsset(Buildings={worldBuildingCount}, Interactables={worldInteractableCount}, NPCs={worldNpcCount}, Incidents={worldIncidentCount}, TextSurfaces={worldTextSurfaceCount}) " +
                $"Runtime(Interactables={runtimeInteractableCount}, Portals={runtimePortalCount}, NPCSpawns={npcSpawnSummary})");
        }

        private static int ResolveNpcSpawnCount()
        {
            var spawnRoot = GameObject.Find("World_Built/NPCSpawns");
            if (spawnRoot == null)
            {
                return -1;
            }

            return spawnRoot.transform.childCount;
        }
    }
}
#endif
