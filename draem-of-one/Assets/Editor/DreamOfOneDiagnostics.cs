using System.Collections.Generic;
using System.Linq;
using DreamOfOne.LLM;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.UI;
using TMPro;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class DreamOfOneDiagnostics
    {
        public struct DiagnosticResults
        {
            public List<string> errors;
            public List<string> warnings;
            public List<string> info;

            public bool HasErrors => errors != null && errors.Count > 0;
        }

        static DreamOfOneDiagnostics()
        {
            EditorApplication.delayCall += RunDiagnostics;
        }

        [MenuItem("Tools/DreamOfOne/Run Diagnostics")]
        public static void RunDiagnostics()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            var results = CollectDiagnostics();
            EmitResults(results.errors, results.warnings, results.info);
        }

        public static DiagnosticResults RunDiagnosticsWithResults(bool logToConsole)
        {
            var results = CollectDiagnostics();
            if (logToConsole)
            {
                EmitResults(results.errors, results.warnings, results.info);
            }

            return results;
        }

        private static DiagnosticResults CollectDiagnostics()
        {
            FontFallbackResolver.EnsureDefaultAndFallback(null);

            var warnings = new List<string>();
            var errors = new List<string>();
            var info = new List<string>();

            if (!EditorBuildSettings.scenes.Any(scene => scene.enabled && scene.path == "Assets/Scenes/Prototype.unity"))
            {
                errors.Add("Build settings missing enabled Prototype scene.");
            }

            var ui = GameObject.Find("DreamOfOne/UI");
            if (ui == null)
            {
                errors.Add("Missing GameObject: DreamOfOne/UI");
            }
            else if (ui.GetComponent<FontBootstrap>() == null)
            {
                errors.Add("Missing FontBootstrap on DreamOfOne/UI");
            }

            var systems = GameObject.Find("DreamOfOne/Systems");
            if (systems == null)
            {
                errors.Add("Missing GameObject: DreamOfOne/Systems");
            }
            else
            {
                if (systems.GetComponent<RuntimeBootstrap>() == null)
                {
                    errors.Add("Missing RuntimeBootstrap on DreamOfOne/Systems");
                }

                if (systems.GetComponent<LLMClient>() == null)
                {
                    warnings.Add("Missing LLMClient on DreamOfOne/Systems (LLM disabled).");
                }

                if (systems.GetComponent<NpcDialogueSystem>() == null)
                {
                    warnings.Add("Missing NpcDialogueSystem on DreamOfOne/Systems (NPC dialogue disabled).");
                }
            }

            var cityRoot = GameObject.Find("CITY_Package");
            if (cityRoot == null)
            {
                warnings.Add("CITY_Package root not found (POLYGON city pack layout missing).");
            }
            else
            {
                ValidateCityRenderers(cityRoot, warnings);
            }

            string[] anchors =
            {
                "StoreBuilding",
                "ParkArea",
                "StudioBuilding_L1",
                "Station",
                "Cafe",
                "DeliveryBay",
                "Facility",
                "MediaZone"
            };
            foreach (var anchor in anchors)
            {
                if (GameObject.Find(anchor) == null)
                {
                    warnings.Add($"Missing anchor: {anchor}");
                }
            }

            if (!System.IO.File.Exists("Assets/Resources/Fonts/NotoSansCJKkr-Regular.otf"))
            {
                errors.Add("Missing font file: Assets/Resources/Fonts/NotoSansCJKkr-Regular.otf");
            }
            else
            {
                info.Add("Font file present: NotoSansCJKkr-Regular.otf");
            }

            bool defaultHasHangul = false;
            if (TMP_Settings.defaultFontAsset == null)
            {
                errors.Add("TMP default font asset is null.");
            }
            else if (!HasValidAtlas(TMP_Settings.defaultFontAsset))
            {
                LogAtlasState("DefaultFont", TMP_Settings.defaultFontAsset);
                errors.Add("TMP default font asset has missing atlas textures.");
            }
            else
            {
                defaultHasHangul = TMP_Settings.defaultFontAsset.HasCharacters("한글", out _);
            }

            var fallbacks = TMP_Settings.fallbackFontAssets;
            bool fallbackHasHangul = false;
            if (fallbacks != null)
            {
                for (int i = 0; i < fallbacks.Count; i++)
                {
                    if (!HasValidAtlas(fallbacks[i]))
                    {
                        LogAtlasState($"Fallback[{i}]", fallbacks[i]);
                        warnings.Add($"TMP fallback font asset at index {i} is invalid.");
                    }
                    else if (!fallbackHasHangul && fallbacks[i].HasCharacters("한글", out _))
                    {
                        fallbackHasHangul = true;
                    }
                }
            }

            if (!defaultHasHangul && !fallbackHasHangul)
            {
                errors.Add("TMP default/fallback fonts do not include Hangul glyphs.");
            }
            else if (!defaultHasHangul && fallbackHasHangul)
            {
                warnings.Add("TMP default font lacks Hangul glyphs; relying on fallback font.");
            }

            return new DiagnosticResults
            {
                errors = errors,
                warnings = warnings,
                info = info
            };
        }

        private static void EmitResults(List<string> errors, List<string> warnings, List<string> info)
        {
            if (errors.Count == 0 && warnings.Count == 0)
            {
                Debug.Log("[Diagnostics] OK: no issues found.");
                return;
            }

            foreach (var error in errors)
            {
                Debug.LogError($"[Diagnostics] {error}");
            }

            foreach (var warning in warnings)
            {
                Debug.LogWarning($"[Diagnostics] {warning}");
            }

            foreach (var message in info)
            {
                Debug.Log($"[Diagnostics] {message}");
            }
        }

        private static bool HasValidAtlas(TMP_FontAsset asset)
        {
            if (asset == null)
            {
                return false;
            }

            try
            {
                asset.ReadFontAssetDefinition();
            }
            catch (System.Exception)
            {
                return false;
            }

            if (asset.atlasTextures == null || asset.atlasTextures.Length == 0)
            {
                return false;
            }

            for (int i = 0; i < asset.atlasTextures.Length; i++)
            {
                if (asset.atlasTextures[i] == null)
                {
                    return false;
                }
            }

            return true;
        }

        private static void LogAtlasState(string label, TMP_FontAsset asset)
        {
            if (asset == null)
            {
                Debug.LogWarning($"[Diagnostics] {label}: asset is null.");
                return;
            }

            try
            {
                asset.ReadFontAssetDefinition();
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning($"[Diagnostics] {label}: ReadFontAssetDefinition failed ({ex.GetType().Name}).");
                return;
            }
            int count = asset.atlasTextures == null ? 0 : asset.atlasTextures.Length;
            int nullCount = 0;
            if (asset.atlasTextures != null)
            {
                for (int i = 0; i < asset.atlasTextures.Length; i++)
                {
                    if (asset.atlasTextures[i] == null)
                    {
                        nullCount++;
                    }
                }
            }

            Debug.LogWarning($"[Diagnostics] {label}: atlasTextures={count}, nulls={nullCount}, width={asset.atlasWidth}, height={asset.atlasHeight}");
        }

        private static void ValidateCityRenderers(GameObject root, List<string> warnings)
        {
            if (root == null)
            {
                return;
            }

            var renderers = root.GetComponentsInChildren<Renderer>(true);
            for (int i = 0; i < renderers.Length; i++)
            {
                var renderer = renderers[i];
                if (renderer == null)
                {
                    continue;
                }

                var scale = renderer.transform.localScale;
                if (Mathf.Abs(scale.x - 1f) > 0.01f || Mathf.Abs(scale.y - 1f) > 0.01f || Mathf.Abs(scale.z - 1f) > 0.01f)
                {
                    warnings.Add($"CITY scale not 1.0: {renderer.name}");
                }

                if (renderer.GetComponent<Collider>() == null && renderer.GetComponentInParent<Collider>() == null)
                {
                    warnings.Add($"CITY renderer missing collider: {renderer.name}");
                }

                var material = renderer.sharedMaterial;
                if (material == null)
                {
                    warnings.Add($"CITY renderer missing material: {renderer.name}");
                    continue;
                }

                if (material.shader != null && material.shader.name == "Hidden/InternalErrorShader")
                {
                    warnings.Add($"CITY renderer uses error shader: {renderer.name}");
                }
            }
        }
    }
}
