using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace DreamOfOne.UI
{
    public static class FontFallbackResolver
    {
        private const string DefaultFontResource = "Fonts & Materials/LiberationSans SDF";
        private const string SourceFontResource = "Fonts/NotoSansCJKkr-Regular";
        private const string FallbackFontAssetResource = "Fonts/NotoSansCJKkr-Regular_SDF";
        private const int RuntimePointSize = 90;
        private const int RuntimeAtlasSize = 2048;
        private static TMP_FontAsset runtimeFallback = null;
        private static Font runtimeSourceFont = null;

        private static readonly string[] OsFontCandidates =
        {
            "Apple SD Gothic Neo",
            "AppleGothic",
            "Noto Sans CJK KR",
            "Noto Sans KR",
            "Malgun Gothic",
            "NanumGothic",
            "Dotum",
            "Arial Unicode MS"
        };

        public static TMP_FontAsset EnsureDefaultAndFallback(TMP_FontAsset preferred)
        {
            if (!Application.isPlaying)
            {
                runtimeFallback = null;
                runtimeSourceFont = null;
            }

            CleanupFallbackList();

            TMP_FontAsset defaultFont = preferred;
            if (!IsFontAssetValid(defaultFont))
            {
                defaultFont = TMP_Settings.defaultFontAsset;
            }

            var resourceFallback = Resources.Load<TMP_FontAsset>(FallbackFontAssetResource);

            if (!IsFontAssetValid(defaultFont))
            {
                defaultFont = IsFontAssetValid(resourceFallback)
                    ? resourceFallback
                    : Resources.Load<TMP_FontAsset>(DefaultFontResource);
            }

            CleanupFallbackTable(defaultFont);

            bool defaultHasHangul = HasHangul(defaultFont);
            TMP_FontAsset fallbackFont = null;
            bool allowRuntimeFallback = Application.isPlaying;
            if (!defaultHasHangul)
            {
                fallbackFont = IsFontAssetValid(resourceFallback)
                    ? resourceFallback
                    : (allowRuntimeFallback ? EnsureRuntimeFallback() : null);
            }

            if (IsFontAssetValid(defaultFont))
            {
                TMP_Settings.defaultFontAsset = defaultFont;
            }
            else if (TMP_Settings.defaultFontAsset != null)
            {
                TMP_Settings.defaultFontAsset = null;
            }

            if (IsFontAssetValid(fallbackFont))
            {
                EnsureFallbackAdded(defaultFont, fallbackFont);
            }

            return defaultHasHangul ? defaultFont : (fallbackFont ?? defaultFont);
        }

        public static void ApplyToAllTexts(TMP_FontAsset font, float minSize)
        {
            if (font == null)
            {
                return;
            }

            foreach (var text in UnityEngine.Object.FindObjectsByType<TMP_Text>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (text == null)
                {
                    continue;
                }

                text.font = font;
                text.fontSize = Mathf.Max(text.fontSize, minSize);
                text.enableAutoSizing = true;
                text.fontSizeMin = Mathf.Max(minSize, text.fontSizeMin);
                text.fontSizeMax = Mathf.Max(text.fontSizeMax, text.fontSize);
                text.UpdateMeshPadding();
                text.ForceMeshUpdate();
            }
        }

        private static TMP_FontAsset EnsureRuntimeFallback()
        {
            if (IsFontAssetValid(runtimeFallback))
            {
                return runtimeFallback;
            }

            Font source = runtimeSourceFont;
            if (source == null)
            {
                source = Resources.Load<Font>(SourceFontResource);
            }

            if (source == null)
            {
                source = TryCreateOsFont();
            }

            if (source == null)
            {
                Debug.LogError("[FontFallback] No source font available for Hangul fallback.");
                return null;
            }

            runtimeSourceFont = source;
            runtimeSourceFont.hideFlags = HideFlags.DontUnloadUnusedAsset;

            runtimeFallback = TMP_FontAsset.CreateFontAsset(
                runtimeSourceFont,
                RuntimePointSize,
                9,
                GlyphRenderMode.SDFAA,
                RuntimeAtlasSize,
                RuntimeAtlasSize,
                AtlasPopulationMode.Dynamic);

            if (runtimeFallback == null)
            {
                Debug.LogError("[FontFallback] TMP_FontAsset.CreateFontAsset returned null.");
                return null;
            }

            runtimeFallback.name = "Runtime_KoreanFallback";
            runtimeFallback.atlasPopulationMode = AtlasPopulationMode.Dynamic;
            if (runtimeFallback.fallbackFontAssetTable != null)
            {
                runtimeFallback.fallbackFontAssetTable.Clear();
            }
            runtimeFallback.hideFlags = HideFlags.DontUnloadUnusedAsset;

            MarkAssetPersistent(runtimeFallback);
            runtimeFallback.TryAddCharacters("한글", out _);

            return runtimeFallback;
        }

        private static void EnsureFallbackAdded(TMP_FontAsset defaultFont, TMP_FontAsset fallback)
        {
            if (fallback == null)
            {
                return;
            }

            if (TMP_Settings.fallbackFontAssets == null)
            {
                TMP_Settings.fallbackFontAssets = new List<TMP_FontAsset>();
            }

            if (!TMP_Settings.fallbackFontAssets.Contains(fallback))
            {
                TMP_Settings.fallbackFontAssets.Add(fallback);
            }

            if (defaultFont != null && !defaultFont.fallbackFontAssetTable.Contains(fallback))
            {
                defaultFont.fallbackFontAssetTable.Add(fallback);
            }
        }

        private static void CleanupFallbackList()
        {
            var fallbacks = TMP_Settings.fallbackFontAssets;
            if (fallbacks == null)
            {
                return;
            }

            var seen = new HashSet<TMP_FontAsset>();
            for (int i = fallbacks.Count - 1; i >= 0; i--)
            {
                var asset = fallbacks[i];
                if (!IsFontAssetValid(asset))
                {
                    fallbacks.RemoveAt(i);
                    continue;
                }

                if (!seen.Add(asset))
                {
                    fallbacks.RemoveAt(i);
                }
            }
        }

        private static void CleanupFallbackTable(TMP_FontAsset asset)
        {
            if (asset == null || asset.fallbackFontAssetTable == null)
            {
                return;
            }

            var fallbacks = asset.fallbackFontAssetTable;
            var seen = new HashSet<TMP_FontAsset>();
            for (int i = fallbacks.Count - 1; i >= 0; i--)
            {
                var entry = fallbacks[i];
                if (!IsFontAssetValid(entry))
                {
                    fallbacks.RemoveAt(i);
                    continue;
                }

                if (!seen.Add(entry))
                {
                    fallbacks.RemoveAt(i);
                }
            }
        }

        private static void MarkAssetPersistent(TMP_FontAsset asset)
        {
            if (asset == null)
            {
                return;
            }

            asset.hideFlags = HideFlags.DontUnloadUnusedAsset;

            if (asset.material != null)
            {
                asset.material.hideFlags = HideFlags.DontUnloadUnusedAsset;
            }

            asset.ReadFontAssetDefinition();
            if (asset.atlasTextures == null)
            {
                return;
            }

            for (int i = 0; i < asset.atlasTextures.Length; i++)
            {
                if (asset.atlasTextures[i] != null)
                {
                    asset.atlasTextures[i].hideFlags = HideFlags.DontUnloadUnusedAsset;
                }
            }
        }

        private static Font TryCreateOsFont()
        {
            string[] installed = Font.GetOSInstalledFontNames();
            if (installed == null || installed.Length == 0)
            {
                return null;
            }

            foreach (var candidate in OsFontCandidates)
            {
                string match = FindInstalledFont(installed, candidate);
                if (string.IsNullOrEmpty(match))
                {
                    continue;
                }

                var font = Font.CreateDynamicFontFromOSFont(match, RuntimePointSize);
                if (font != null && font.HasCharacter('한'))
                {
                    Debug.Log($"[FontFallback] OS font: {match}");
                    return font;
                }
            }

            var fallback = Font.CreateDynamicFontFromOSFont(installed[0], RuntimePointSize);
            if (fallback != null)
            {
                Debug.Log($"[FontFallback] OS fallback font: {installed[0]}");
            }

            return fallback;
        }

        private static string FindInstalledFont(string[] installed, string candidate)
        {
            for (int i = 0; i < installed.Length; i++)
            {
                if (string.Equals(installed[i], candidate, StringComparison.OrdinalIgnoreCase))
                {
                    return installed[i];
                }
            }

            for (int i = 0; i < installed.Length; i++)
            {
                if (installed[i].IndexOf(candidate, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return installed[i];
                }
            }

            return null;
        }

        private static bool HasHangul(TMP_FontAsset asset)
        {
            if (!IsFontAssetValid(asset))
            {
                return false;
            }

            return asset.HasCharacters("한글", out _);
        }

        private static bool IsFontAssetValid(TMP_FontAsset asset)
        {
            if (asset == null)
            {
                return false;
            }

#if UNITY_EDITOR
            if (!Application.isPlaying)
            {
                string path = AssetDatabase.GetAssetPath(asset);
                if (string.IsNullOrEmpty(path))
                {
                    return false;
                }
            }
#endif

            try
            {
                asset.ReadFontAssetDefinition();
            }
            catch (Exception)
            {
                return false;
            }

            var textures = asset.atlasTextures;
            if (textures == null || textures.Length == 0)
            {
                return false;
            }

            for (int i = 0; i < textures.Length; i++)
            {
                if (textures[i] == null)
                {
                    return false;
                }
            }

            if (asset.material == null || asset.material.mainTexture == null)
            {
                return false;
            }

            return true;
        }
    }
}
