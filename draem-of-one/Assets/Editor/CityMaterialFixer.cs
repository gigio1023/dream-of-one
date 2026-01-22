#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class CityMaterialFixer
    {
        private const string PrefKey = "DreamOfOne.CityMaterialsFixed";
        private const string CityRoot = "Assets/POLYGON city pack";

        static CityMaterialFixer()
        {
            EditorApplication.delayCall += AutoFix;
        }

        [MenuItem("Tools/DreamOfOne/Fix City Materials (URP)")]
        public static void FixCityMaterials()
        {
            bool changed = false;
            var materialGuids = AssetDatabase.FindAssets("t:Material", new[] { CityRoot });
            foreach (var guid in materialGuids)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var material = AssetDatabase.LoadAssetAtPath<Material>(path);
                if (material == null)
                {
                    continue;
                }

                if (UpgradeMaterial(material))
                {
                    changed = true;
                }
            }

            if (changed)
            {
                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh();
                Debug.Log("[CityMaterialFixer] Updated POLYGON city pack materials for URP.");
            }
        }

        private static void AutoFix()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            if (EditorPrefs.GetBool(PrefKey, false))
            {
                return;
            }

            FixCityMaterials();
            EditorPrefs.SetBool(PrefKey, true);
        }

        private static bool UpgradeMaterial(Material material)
        {
            if (material == null)
            {
                return false;
            }

            string shaderName = material.shader != null ? material.shader.name : string.Empty;
            bool needsUpgrade = string.IsNullOrEmpty(shaderName)
                || shaderName == "Standard"
                || shaderName.StartsWith("Legacy Shaders")
                || shaderName == "Hidden/InternalErrorShader";

            if (!needsUpgrade)
            {
                return false;
            }

            var mainTex = material.HasProperty("_MainTex") ? material.GetTexture("_MainTex") : null;
            var color = material.HasProperty("_Color") ? material.GetColor("_Color") : Color.white;
            var metallic = material.HasProperty("_Metallic") ? material.GetFloat("_Metallic") : 0f;
            var smoothness = material.HasProperty("_Glossiness") ? material.GetFloat("_Glossiness") : 0.5f;

            var urpShader = Shader.Find("Universal Render Pipeline/Lit");
            if (urpShader == null)
            {
                return false;
            }

            material.shader = urpShader;
            if (material.HasProperty("_BaseMap"))
            {
                material.SetTexture("_BaseMap", mainTex);
            }
            if (material.HasProperty("_BaseColor"))
            {
                material.SetColor("_BaseColor", color);
            }
            if (material.HasProperty("_Metallic"))
            {
                material.SetFloat("_Metallic", metallic);
            }
            if (material.HasProperty("_Smoothness"))
            {
                material.SetFloat("_Smoothness", smoothness);
            }

            EditorUtility.SetDirty(material);
            return true;
        }
    }
}
#endif
