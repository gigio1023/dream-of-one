#if UNITY_EDITOR
using System.IO;
using DreamOfOne.UI;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.TextCore.LowLevel;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class FontAssetAutoBuilder
    {
        private const string SourceFontPath = "Assets/Resources/Fonts/NotoSansCJKkr-Regular.otf";
        private const string FontAssetPath = "Assets/Resources/Fonts/NotoSansCJKkr-Regular_SDF.asset";
        private const string FontAssetName = "NotoSansCJKkr-Regular_SDF";
        private const int FontPointSize = 90;
        private const int FontPadding = 9;
        private const int AtlasSize = 2048;

        static FontAssetAutoBuilder()
        {
            EditorApplication.delayCall += EnsureFontAssets;
        }

        private static void EnsureFontAssets()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            if (!File.Exists(SourceFontPath))
            {
                Debug.LogError($"[FontAutoBuilder] Missing font file: {SourceFontPath}");
                return;
            }

            var sourceFont = AssetDatabase.LoadAssetAtPath<Font>(SourceFontPath);
            if (sourceFont == null)
            {
                Debug.LogError("[FontAutoBuilder] Failed to load source font asset.");
                return;
            }

            var existing = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(FontAssetPath);
            if (IsFontAssetValid(existing))
            {
                return;
            }

            if (existing != null)
            {
                AssetDatabase.DeleteAsset(FontAssetPath);
            }

            var fontAsset = TMP_FontAsset.CreateFontAsset(
                sourceFont,
                FontPointSize,
                FontPadding,
                GlyphRenderMode.SDFAA,
                AtlasSize,
                AtlasSize,
                AtlasPopulationMode.Dynamic);

            if (fontAsset == null)
            {
                Debug.LogError("[FontAutoBuilder] TMP_FontAsset.CreateFontAsset returned null.");
                return;
            }

            fontAsset.name = FontAssetName;
            fontAsset.atlasPopulationMode = AtlasPopulationMode.Dynamic;
            if (fontAsset.fallbackFontAssetTable != null)
            {
                fontAsset.fallbackFontAssetTable.Clear();
            }

            AssetDatabase.CreateAsset(fontAsset, FontAssetPath);
            AddSubAsset(fontAsset.material, fontAsset);
            if (fontAsset.atlasTextures != null)
            {
                for (int i = 0; i < fontAsset.atlasTextures.Length; i++)
                {
                    AddSubAsset(fontAsset.atlasTextures[i], fontAsset);
                }
            }

            fontAsset.ReadFontAssetDefinition();
            fontAsset.TryAddCharacters("한글", out _);
            EditorUtility.SetDirty(fontAsset);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            FontFallbackResolver.EnsureDefaultAndFallback(fontAsset);
            Debug.Log("[FontAutoBuilder] Generated TMP font asset for Hangul fallback.");
        }

        private static void AddSubAsset(Object subAsset, Object mainAsset)
        {
            if (subAsset == null || mainAsset == null)
            {
                return;
            }

            var assetPath = AssetDatabase.GetAssetPath(subAsset);
            if (!string.IsNullOrEmpty(assetPath))
            {
                return;
            }

            AssetDatabase.AddObjectToAsset(subAsset, mainAsset);
        }

        private static bool IsFontAssetValid(TMP_FontAsset asset)
        {
            if (asset == null)
            {
                return false;
            }

            asset.ReadFontAssetDefinition();

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

            return asset.material != null && asset.material.mainTexture != null;
        }
    }
}
#endif
