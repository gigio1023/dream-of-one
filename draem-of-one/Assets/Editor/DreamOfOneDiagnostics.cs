using System.Collections.Generic;
using System.Linq;
using DreamOfOne.LLM;
using DreamOfOne.Core;
using DreamOfOne.LucidCover;
using DreamOfOne.NPC;
using DreamOfOne.UI;
using DreamOfOne.World;
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
                var worldV2 = GameObject.Find("World_v2");
                if (worldV2 == null)
                {
                    warnings.Add("CITY_Package root not found (POLYGON city pack layout missing).");
                }
                else
                {
                    info.Add("World_v2 root detected (CITY_Package legacy disabled).");
                }
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
                info.Add("TMP default font lacks Hangul glyphs; relying on fallback font.");
            }

            ValidateWorldData(warnings, errors);
            ValidateWorldRuntime(warnings, errors, info);

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

        private static void ValidateWorldData(List<string> warnings, List<string> errors)
        {
#if UNITY_EDITOR
            var world = AssetDatabase.LoadAssetAtPath<WorldDefinition>("Assets/Data/WorldDefinition.asset");
            if (world == null)
            {
                warnings.Add("WorldDefinition asset missing: Assets/Data/WorldDefinition.asset");
                return;
            }

            if (world.Buildings == null || world.Buildings.Count == 0)
            {
                warnings.Add("WorldDefinition has no building definitions.");
            }

            if (world.Interactables == null || world.Interactables.Count < 20)
            {
                warnings.Add($"WorldDefinition interactables < 20 (found {world.Interactables?.Count ?? 0}).");
            }

            if (world.Incidents == null || world.Incidents.Count < 2)
            {
                warnings.Add("WorldDefinition incidents < 2 (MCSS incidents not fully defined).");
            }

            ValidateLucidCoverData(world, warnings, errors);
#endif
        }

#if UNITY_EDITOR
        private static void ValidateLucidCoverData(WorldDefinition world, List<string> warnings, List<string> errors)
        {
            if (world == null)
            {
                return;
            }

            var lawDb = world.DreamLawDatabase;
            var surfaceDb = world.TextSurfaceDatabase;
            var coverDb = world.CoverTestDatabase;

            if (lawDb == null)
            {
                warnings.Add("WorldDefinition DreamLawDatabase is null (LucidCover laws disabled).");
            }

            if (surfaceDb == null)
            {
                warnings.Add("WorldDefinition TextSurfaceDatabase is null (LucidCover text surfaces disabled).");
            }

            if (coverDb == null)
            {
                warnings.Add("WorldDefinition CoverTestDatabase is null (LucidCover cover tests disabled).");
            }

            var lawIds = new HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
            var lawDuplicates = new List<string>();
            if (lawDb != null && lawDb.DreamLaws != null)
            {
                foreach (var law in lawDb.DreamLaws)
                {
                    if (law == null)
                    {
                        continue;
                    }

                    if (string.IsNullOrEmpty(law.DreamLawId))
                    {
                        errors.Add("DreamLawDefinition missing DreamLawId.");
                        continue;
                    }

                    if (!lawIds.Add(law.DreamLawId))
                    {
                        lawDuplicates.Add(law.DreamLawId);
                    }

                    if (law.DetectorIds == null || law.DetectorIds.Length == 0)
                    {
                        warnings.Add($"DreamLawDefinition {law.DreamLawId} has no detectorIds.");
                    }

                    if (law.ScopeKind == DreamLawScopeKind.Landmark && string.IsNullOrEmpty(law.ScopeId))
                    {
                        warnings.Add($"DreamLawDefinition {law.DreamLawId} is Landmark-scoped but missing ScopeId.");
                    }
                }
            }

            if (lawDuplicates.Count > 0)
            {
                errors.Add($"DreamLawDatabase duplicate ids: {string.Join(", ", lawDuplicates.Distinct())}");
            }

            var surfaceIds = new HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
            var surfaceDuplicates = new List<string>();
            if (surfaceDb != null && surfaceDb.TextSurfaces != null)
            {
                foreach (var surface in surfaceDb.TextSurfaces)
                {
                    if (surface == null)
                    {
                        continue;
                    }

                    if (string.IsNullOrEmpty(surface.TextSurfaceId))
                    {
                        errors.Add("TextSurfaceDefinition missing TextSurfaceId.");
                        continue;
                    }

                    if (!surfaceIds.Add(surface.TextSurfaceId))
                    {
                        surfaceDuplicates.Add(surface.TextSurfaceId);
                    }

                    if (surface.DreamLawIds == null || surface.DreamLawIds.Length == 0)
                    {
                        warnings.Add($"TextSurfaceDefinition {surface.TextSurfaceId} has no DreamLawIds.");
                    }
                    else if (lawIds.Count > 0)
                    {
                        foreach (var lawId in surface.DreamLawIds)
                        {
                            if (!string.IsNullOrEmpty(lawId) && !lawIds.Contains(lawId))
                            {
                                errors.Add($"TextSurfaceDefinition {surface.TextSurfaceId} references missing DreamLawId: {lawId}");
                            }
                        }
                    }
                }
            }

            if (surfaceDuplicates.Count > 0)
            {
                errors.Add($"TextSurfaceDatabase duplicate ids: {string.Join(", ", surfaceDuplicates.Distinct())}");
            }

            var coverIds = new HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
            var coverDuplicates = new List<string>();
            if (coverDb != null && coverDb.CoverTests != null)
            {
                foreach (var cover in coverDb.CoverTests)
                {
                    if (cover == null)
                    {
                        continue;
                    }

                    if (string.IsNullOrEmpty(cover.CoverTestId))
                    {
                        errors.Add("CoverTestDefinition missing CoverTestId.");
                        continue;
                    }

                    if (!coverIds.Add(cover.CoverTestId))
                    {
                        coverDuplicates.Add(cover.CoverTestId);
                    }

                    if (cover.DreamLawIds == null || cover.DreamLawIds.Length == 0)
                    {
                        warnings.Add($"CoverTestDefinition {cover.CoverTestId} has no DreamLawIds.");
                    }
                    else if (lawIds.Count > 0)
                    {
                        foreach (var lawId in cover.DreamLawIds)
                        {
                            if (!string.IsNullOrEmpty(lawId) && !lawIds.Contains(lawId))
                            {
                                errors.Add($"CoverTestDefinition {cover.CoverTestId} references missing DreamLawId: {lawId}");
                            }
                        }
                    }

                    if (cover.RequiredTextSurfaces != null && surfaceIds.Count > 0)
                    {
                        foreach (var surfaceId in cover.RequiredTextSurfaces)
                        {
                            if (!string.IsNullOrEmpty(surfaceId) && !surfaceIds.Contains(surfaceId))
                            {
                                errors.Add($"CoverTestDefinition {cover.CoverTestId} references missing TextSurfaceId: {surfaceId}");
                            }
                        }
                    }
                }
            }

            if (coverDuplicates.Count > 0)
            {
                errors.Add($"CoverTestDatabase duplicate ids: {string.Join(", ", coverDuplicates.Distinct())}");
            }
        }
#endif

        private static void ValidateWorldRuntime(List<string> warnings, List<string> errors, List<string> info)
        {
            var worldRoot = GameObject.Find("World_Built");
            if (worldRoot == null)
            {
                warnings.Add("World_Built root not found. Run Tools/DreamOfOne/Rebuild World From Data.");
                return;
            }

            var log = Object.FindFirstObjectByType<WorldEventLog>();
            if (log == null)
            {
                warnings.Add("WorldEventLog missing in scene.");
            }
            else if (string.IsNullOrEmpty(log.LogFilePath) || !log.LogFilePath.EndsWith(".jsonl"))
            {
                warnings.Add("WorldEventLog is not configured for JSONL output.");
            }

            var interactables = Object.FindObjectsByType<ZoneInteractable>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            if (interactables.Length < 20)
            {
                warnings.Add($"Interactables in scene < 20 (found {interactables.Length}).");
            }

            var portals = Object.FindObjectsByType<InteriorPortal>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            if (portals.Length < 4)
            {
                warnings.Add($"Interior portals in scene < 4 (found {portals.Length}).");
            }

            var interiors = GameObject.Find("Interiors");
            if (interiors == null)
            {
                warnings.Add("Interiors root missing. Interior entry may fail.");
            }

            int missingCollider = 0;
            foreach (var interactable in interactables)
            {
                if (interactable == null)
                {
                    continue;
                }

                if (interactable.GetComponent<Collider>() == null)
                {
                    missingCollider++;
                }
            }

            if (missingCollider > 0)
            {
                warnings.Add($"Interactables missing colliders: {missingCollider}");
            }

            var boards = Object.FindObjectsByType<SpatialBlackboard>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            var boardSystem = Object.FindFirstObjectByType<BlackboardSystem>();
            if (boards.Length == 0 && boardSystem == null)
            {
                warnings.Add("SpatialBlackboard/BlackboardSystem not found (injection may fail).");
            }

            info.Add($"World_Built: Interactables={interactables.Length}, Portals={portals.Length}");
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

            var nonUniformScaleAllowlist = new HashSet<string>
            {
                "CCTV_A",
                "CCTV_B",
                "street"
            };

            var renderers = root.GetComponentsInChildren<Renderer>(true);
            for (int i = 0; i < renderers.Length; i++)
            {
                var renderer = renderers[i];
                if (renderer == null)
                {
                    continue;
                }

                var scale = renderer.transform.localScale;
                if (!nonUniformScaleAllowlist.Contains(renderer.name)
                    && (Mathf.Abs(scale.x - scale.y) > 0.01f || Mathf.Abs(scale.x - scale.z) > 0.01f || Mathf.Abs(scale.y - scale.z) > 0.01f))
                {
                    warnings.Add($"CITY non-uniform scale: {renderer.name}");
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
