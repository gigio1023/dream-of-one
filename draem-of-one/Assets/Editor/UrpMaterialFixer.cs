#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Rendering;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace DreamOfOne.EditorTools
{
    public static class UrpMaterialFixer
    {
        private const string MenuPath = "Tools/DreamOfOne/Upgrade Built-in Materials to URP";
        private const string ReportSceneMenuPath = "Tools/DreamOfOne/Report Scene Non-URP Materials";
        private const string ReplaceDefaultMenuPath = "Tools/DreamOfOne/Replace Scene Default Materials with URP";
        private const string DefaultUrpMaterialPath = "Assets/Materials/DefaultUrpLit.mat";

        [MenuItem(MenuPath)]
        private static void UpgradeBuiltInMaterials()
        {
            var upgraders = GetUpgraders();
            if (upgraders == null || upgraders.Count == 0)
            {
                Debug.LogWarning("[URP] No upgraders found; aborting.");
                return;
            }

            var scan = ScanMaterials();
            if (scan.BuiltIn.Count == 0 && scan.Missing.Count == 0)
            {
                Debug.Log("[URP] No built-in or missing-shader materials found to upgrade.");
            }

            if (scan.BuiltIn.Count > 0)
            {
                var builtInPaths = GetMaterialPaths(scan.BuiltIn);
                Debug.Log($"[URP] Converting {builtInPaths.Count} built-in materials to URP:\n- {string.Join("\n- ", builtInPaths)}");
                foreach (var material in scan.BuiltIn)
                {
                    MaterialUpgrader.Upgrade(material, upgraders, MaterialUpgrader.UpgradeFlags.LogMessageWhenNoUpgraderFound);
                }

                var doubleSided = scan.BuiltIn
                    .Where(material => material != null
                        && material.shader != null
                        && material.shader.name == "StandardDoubleSide")
                    .ToList();
                if (doubleSided.Count > 0)
                {
                    Debug.Log($"[URP] Manually repairing {doubleSided.Count} StandardDoubleSide materials.");
                    foreach (var material in doubleSided)
                    {
                        RepairStandardDoubleSideMaterial(material);
                    }
                }
            }

            if (scan.Missing.Count > 0)
            {
                var missingPaths = GetMaterialPaths(scan.Missing);
                Debug.Log($"[URP] Repairing {missingPaths.Count} materials with missing/error shaders:\n- {string.Join("\n- ", missingPaths)}");
                foreach (var material in scan.Missing)
                {
                    RepairMissingShaderMaterial(material);
                }
            }

            if (scan.NonUrpCustom.Count > 0)
            {
                Debug.Log($"[URP] Non-URP custom shaders detected (left untouched): {scan.NonUrpCustom.Count}");
                foreach (var entry in scan.NonUrpCustom)
                {
                    Debug.Log($"[URP] Non-URP custom: {entry.MaterialName} ({entry.ShaderName})");
                }
            }

            if (scan.BuiltIn.Count > 0 || scan.Missing.Count > 0)
            {
                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh();
                Debug.Log("[URP] Material upgrade completed.");
            }
        }

        [MenuItem(ReportSceneMenuPath)]
        private static void ReportSceneNonUrpMaterials()
        {
            var activeScene = SceneManager.GetActiveScene();
            if (!activeScene.IsValid() || !activeScene.isLoaded)
            {
                Debug.LogWarning("[URP] No active scene loaded for material report.");
                return;
            }

            var entries = new List<string>();
            foreach (var root in activeScene.GetRootGameObjects())
            {
                foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
                {
                    foreach (var material in renderer.sharedMaterials)
                    {
                        if (material == null)
                        {
                            continue;
                        }

                        var shaderName = material.shader != null ? material.shader.name : "MissingShader";
                        if (IsUrpShader(shaderName))
                        {
                            continue;
                        }

                        entries.Add($"{GetHierarchyPath(renderer.transform)} → {material.name} ({shaderName})");
                    }
                }
            }

            if (entries.Count == 0)
            {
                Debug.Log("[URP] Active scene contains no non-URP materials.");
                return;
            }

            Debug.Log($"[URP] Active scene non-URP materials: {entries.Count}");
            foreach (var entry in entries)
            {
                Debug.Log($"[URP] Scene non-URP: {entry}");
            }
        }

        [MenuItem(ReplaceDefaultMenuPath)]
        private static void ReplaceSceneDefaultMaterials()
        {
            var activeScene = SceneManager.GetActiveScene();
            if (!activeScene.IsValid() || !activeScene.isLoaded)
            {
                Debug.LogWarning("[URP] No active scene loaded for default material replacement.");
                return;
            }

            var urpDefault = GetOrCreateDefaultUrpMaterial();
            if (urpDefault == null)
            {
                Debug.LogWarning("[URP] Failed to create/find default URP material.");
                return;
            }

            var replacedCount = 0;
            foreach (var root in activeScene.GetRootGameObjects())
            {
                foreach (var renderer in root.GetComponentsInChildren<Renderer>(true))
                {
                    var materials = renderer.sharedMaterials;
                    var changed = false;
                    for (var i = 0; i < materials.Length; i++)
                    {
                        if (IsDefaultMaterial(materials[i]))
                        {
                            materials[i] = urpDefault;
                            changed = true;
                            replacedCount++;
                        }
                    }

                    if (changed)
                    {
                        renderer.sharedMaterials = materials;
                        EditorUtility.SetDirty(renderer);
                    }
                }
            }

            if (replacedCount == 0)
            {
                Debug.Log("[URP] No default materials found to replace in active scene.");
                return;
            }

            AssetDatabase.SaveAssets();
            Debug.Log($"[URP] Replaced {replacedCount} default materials in active scene.");
        }

        private static MaterialScan ScanMaterials()
        {
            var guids = AssetDatabase.FindAssets("t:Material");
            var builtIn = new List<Material>();
            var missing = new List<Material>();
            var nonUrpCustom = new List<MaterialScanEntry>();
            foreach (var guid in guids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var material = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (material == null)
                {
                    continue;
                }

                if (material.shader == null || IsMissingShader(material.shader.name))
                {
                    missing.Add(material);
                    continue;
                }

                var shaderName = material.shader.name;
                if (IsBuiltInShader(shaderName))
                {
                    builtIn.Add(material);
                    continue;
                }

                if (!IsUrpShader(shaderName))
                {
                    nonUrpCustom.Add(new MaterialScanEntry(material.name, shaderName));
                }
            }

            return new MaterialScan(builtIn, missing, nonUrpCustom);
        }

        private static List<string> GetMaterialPaths(IEnumerable<Material> materials)
        {
            return materials.Select(AssetDatabase.GetAssetPath)
                .Where(path => !string.IsNullOrEmpty(path))
                .ToList();
        }

        private static bool IsUrpShader(string shaderName)
        {
            return !string.IsNullOrEmpty(shaderName)
                   && shaderName.StartsWith("Universal Render Pipeline", StringComparison.Ordinal);
        }

        private static bool IsMissingShader(string shaderName)
        {
            return string.IsNullOrEmpty(shaderName)
                   || shaderName.Equals("Hidden/InternalErrorShader", StringComparison.Ordinal);
        }

        private static bool IsBuiltInShader(string shaderName)
        {
            if (string.IsNullOrEmpty(shaderName))
            {
                return false;
            }

            if (IsUrpShader(shaderName))
            {
                return false;
            }

            return shaderName == "Standard"
                || shaderName == "StandardDoubleSide"
                || shaderName.StartsWith("Legacy Shaders/", StringComparison.Ordinal)
                || shaderName.StartsWith("Mobile/", StringComparison.Ordinal)
                || shaderName.StartsWith("Nature/", StringComparison.Ordinal)
                || shaderName.StartsWith("Particles/", StringComparison.Ordinal)
                || shaderName.StartsWith("Sprites/", StringComparison.Ordinal)
                || shaderName.StartsWith("UI/", StringComparison.Ordinal);
        }

        private static void RepairMissingShaderMaterial(Material material)
        {
            var baseMap = GetFirstTexture(material, "_BaseMap", "_MainTex");
            var baseColor = GetFirstColor(material, "_BaseColor", "_Color");
            var baseScale = GetFirstTextureScale(material, "_BaseMap", "_MainTex");
            var baseOffset = GetFirstTextureOffset(material, "_BaseMap", "_MainTex");
            var metallic = GetFirstFloat(material, "_Metallic");
            var smoothness = GetFirstFloat(material, "_Smoothness", "_Glossiness");
            var normalMap = GetFirstTexture(material, "_BumpMap");
            var normalScale = GetFirstFloat(material, "_BumpScale");
            var occlusionMap = GetFirstTexture(material, "_OcclusionMap");
            var occlusionStrength = GetFirstFloat(material, "_OcclusionStrength");
            var emissionMap = GetFirstTexture(material, "_EmissionMap");
            var emissionColor = GetFirstColor(material, "_EmissionColor");

            var urpLit = Shader.Find("Universal Render Pipeline/Lit");
            if (urpLit == null)
            {
                Debug.LogWarning($"[URP] URP Lit shader not found; skipping repair for {material.name}.");
                return;
            }

            material.shader = urpLit;

            if (material.HasProperty("_BaseMap") && baseMap != null)
            {
                material.SetTexture("_BaseMap", baseMap);
                material.SetTextureScale("_BaseMap", baseScale);
                material.SetTextureOffset("_BaseMap", baseOffset);
            }

            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", baseColor);
            }

            if (material.HasProperty("_Metallic"))
            {
                material.SetFloat("_Metallic", metallic);
            }

            if (material.HasProperty("_Smoothness"))
            {
                material.SetFloat("_Smoothness", smoothness);
            }

            if (material.HasProperty("_BumpMap") && normalMap != null)
            {
                material.SetTexture("_BumpMap", normalMap);
                if (material.HasProperty("_BumpScale"))
                {
                    material.SetFloat("_BumpScale", normalScale);
                }
            }

            if (material.HasProperty("_OcclusionMap") && occlusionMap != null)
            {
                material.SetTexture("_OcclusionMap", occlusionMap);
                if (material.HasProperty("_OcclusionStrength"))
                {
                    material.SetFloat("_OcclusionStrength", occlusionStrength);
                }
            }

            if (material.HasProperty("_EmissionMap") && emissionMap != null)
            {
                material.SetTexture("_EmissionMap", emissionMap);
                if (material.HasProperty("_EmissionColor"))
                {
                    material.SetColor("_EmissionColor", emissionColor);
                }
                material.EnableKeyword("_EMISSION");
            }
        }

        private static void RepairStandardDoubleSideMaterial(Material material)
        {
            RepairMissingShaderMaterial(material);
            if (material.HasProperty("_Cull"))
            {
                material.SetFloat("_Cull", 0f);
            }
        }

        private static Texture GetFirstTexture(Material material, params string[] properties)
        {
            foreach (var property in properties)
            {
                if (material.HasProperty(property))
                {
                    var texture = material.GetTexture(property);
                    if (texture != null)
                    {
                        return texture;
                    }
                }
            }

            return null;
        }

        private static Color GetFirstColor(Material material, params string[] properties)
        {
            foreach (var property in properties)
            {
                if (material.HasProperty(property))
                {
                    return material.GetColor(property);
                }
            }

            return Color.white;
        }

        private static float GetFirstFloat(Material material, params string[] properties)
        {
            foreach (var property in properties)
            {
                if (material.HasProperty(property))
                {
                    return material.GetFloat(property);
                }
            }

            return 0f;
        }

        private static Vector2 GetFirstTextureScale(Material material, params string[] properties)
        {
            foreach (var property in properties)
            {
                if (material.HasProperty(property))
                {
                    return material.GetTextureScale(property);
                }
            }

            return Vector2.one;
        }

        private static Vector2 GetFirstTextureOffset(Material material, params string[] properties)
        {
            foreach (var property in properties)
            {
                if (material.HasProperty(property))
                {
                    return material.GetTextureOffset(property);
                }
            }

            return Vector2.zero;
        }

        private static string GetHierarchyPath(Transform transform)
        {
            if (transform == null)
            {
                return "(null)";
            }

            var path = transform.name;
            var current = transform.parent;
            while (current != null)
            {
                path = $"{current.name}/{path}";
                current = current.parent;
            }

            return path;
        }

        private static Material GetOrCreateDefaultUrpMaterial()
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(DefaultUrpMaterialPath);
            if (existing != null)
            {
                return existing;
            }

            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                return null;
            }

            var folder = System.IO.Path.GetDirectoryName(DefaultUrpMaterialPath);
            if (!string.IsNullOrEmpty(folder) && !AssetDatabase.IsValidFolder(folder))
            {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }

            var material = new Material(shader)
            {
                name = "DefaultUrpLit"
            };
            AssetDatabase.CreateAsset(material, DefaultUrpMaterialPath);
            AssetDatabase.SaveAssets();
            return material;
        }

        private static bool IsDefaultMaterial(Material material)
        {
            if (material == null)
            {
                return false;
            }

            if (material.name == "Default-Material")
            {
                return true;
            }

            var path = AssetDatabase.GetAssetPath(material);
            return string.IsNullOrEmpty(path);
        }

        private readonly struct MaterialScan
        {
            public MaterialScan(List<Material> builtIn, List<Material> missing, List<MaterialScanEntry> nonUrpCustom)
            {
                BuiltIn = builtIn;
                Missing = missing;
                NonUrpCustom = nonUrpCustom;
            }

            public List<Material> BuiltIn { get; }
            public List<Material> Missing { get; }
            public List<MaterialScanEntry> NonUrpCustom { get; }
        }

        private readonly struct MaterialScanEntry
        {
            public MaterialScanEntry(string materialName, string shaderName)
            {
                MaterialName = materialName;
                ShaderName = shaderName;
            }

            public string MaterialName { get; }
            public string ShaderName { get; }
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
