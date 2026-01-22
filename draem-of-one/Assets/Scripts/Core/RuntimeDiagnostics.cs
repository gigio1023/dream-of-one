using TMPro;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 런타임 초기 상태를 자동 점검하고 콘솔에 결과를 남긴다.
    /// </summary>
    public sealed class RuntimeDiagnostics : MonoBehaviour
    {
        private void Start()
        {
            CheckFonts();
            CheckSystems();
        }

        private void CheckFonts()
        {
            var sample = "한글 테스트";
            var defaultFont = TMP_Settings.defaultFontAsset;
            if (!IsFontAssetValid(defaultFont))
            {
                Debug.LogWarning("[Diag] TMP 기본 폰트가 없거나 손상됨");
            }

            var text = FindFirstObjectByType<TMP_Text>();
            if (text == null)
            {
                Debug.LogWarning("[Diag] TMP_Text 없음: 폰트 점검 불가");
                return;
            }

            if (text.font == null)
            {
                Debug.LogWarning("[Diag] TMP 폰트 없음");
                return;
            }

            var missing = new System.Collections.Generic.List<char>();
            bool hasAll = text.font.HasCharacters(sample, out missing);
            if (!hasAll)
            {
                string missingChars = new string(missing.ToArray());
                Debug.LogWarning($"[Diag] 한글 글리프 누락: {missingChars}");
                var ui = FindFirstObjectByType<DreamOfOne.UI.UIManager>();
                ui?.ShowToast("한글 폰트 누락. FontBootstrap 확인.");
                return;
            }

            Debug.Log("[Diag] 한글 글리프 정상");
        }

        private static bool IsFontAssetValid(TMP_FontAsset asset)
        {
            if (asset == null)
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

            return true;
        }

        private void CheckSystems()
        {
            bool hasLog = FindFirstObjectByType<WorldEventLog>() != null;
            bool hasUi = FindFirstObjectByType<DreamOfOne.UI.UIManager>() != null;
            bool hasPolice = FindFirstObjectByType<DreamOfOne.NPC.PoliceController>() != null;
            bool hasDialogue = FindFirstObjectByType<DreamOfOne.NPC.NpcDialogueSystem>() != null;
            Debug.Log($"[Diag] Systems WEL={hasLog} UI={hasUi} Police={hasPolice} Dialogue={hasDialogue}");
        }
    }
}
