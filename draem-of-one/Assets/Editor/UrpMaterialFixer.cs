#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Rendering;
using UnityEngine;

namespace DreamOfOne.EditorTools
{
    public static class UrpMaterialFixer
    {
        private const string MenuPath = "Tools/DreamOfOne/Upgrade Built-in Materials to URP";

        [MenuItem(MenuPath)]
        private static void UpgradeBuiltInMaterials()
        {
            var upgraders = GetUpgraders();
            if (upgraders == null || upgraders.Count == 0)
            {
                Debug.LogWarning("[URP] No upgraders found; aborting.");
                return;
            }

            var materials = FindBuiltInMaterials();
            if (materials.Count == 0)
            {
                Debug.Log("[URP] No built-in materials found to upgrade.");
                return;
            }

            var paths = materials.Select(AssetDatabase.GetAssetPath).Where(path => !string.IsNullOrEmpty(path)).ToList();
            Debug.Log($"[URP] Converting {paths.Count} built-in materials to URP:\n- {string.Join("\n- ", paths)}");

            foreach (var material in materials)
            {
                MaterialUpgrader.Upgrade(material, upgraders, MaterialUpgrader.UpgradeFlags.LogMessageWhenNoUpgraderFound);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[URP] Material upgrade completed.");
        }

        private static List<Material> FindBuiltInMaterials()
        {
            var guids = AssetDatabase.FindAssets("t:Material");
            var results = new List<Material>();
            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var material = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (material == null || material.shader == null)
                {
                    continue;
                }

                var shaderName = material.shader.name;
                if (IsBuiltInShader(shaderName))
                {
                    results.Add(material);
                }
            }

            return results;
        }

        private static bool IsBuiltInShader(string shaderName)
        {
            if (string.IsNullOrEmpty(shaderName))
            {
                return false;
            }

            if (shaderName.StartsWith("Universal Render Pipeline", StringComparison.Ordinal))
            {
                return false;
            }

            return shaderName == "Standard"
                || shaderName.StartsWith("Legacy Shaders/", StringComparison.Ordinal)
                || shaderName.StartsWith("Mobile/", StringComparison.Ordinal)
                || shaderName.StartsWith("Nature/", StringComparison.Ordinal)
                || shaderName.StartsWith("Particles/", StringComparison.Ordinal)
                || shaderName.StartsWith("Sprites/", StringComparison.Ordinal)
                || shaderName.StartsWith("UI/", StringComparison.Ordinal);
        }

        private static List<MaterialUpgrader> GetUpgraders()
        {
            try
            {
                var type = Type.GetType("UnityEditor.Rendering.Universal.UniversalRenderPipelineMaterialUpgrader, Unity.RenderPipelines.Universal.Editor");
                if (type == null)
                {
                    Debug.LogWarning("[URP] UniversalRenderPipelineMaterialUpgrader type not found.");
                    return new List<MaterialUpgrader>();
                }

                var instance = Activator.CreateInstance(type);
                var property = type.GetProperty("upgraders", BindingFlags.Instance | BindingFlags.Public);
                if (property == null)
                {
                    Debug.LogWarning("[URP] Upgrader property not found.");
                    return new List<MaterialUpgrader>();
                }

                if (property.GetValue(instance) is IReadOnlyList<MaterialUpgrader> list)
                {
                    return list.ToList();
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[URP] Failed to resolve upgraders: {ex.Message}");
            }

            return new List<MaterialUpgrader>();
        }
    }
}
#endif
