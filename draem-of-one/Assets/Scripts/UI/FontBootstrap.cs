using TMPro;
using UnityEngine;

namespace DreamOfOne.UI
{
    /// <summary>
    /// 런타임에 TMP 폰트를 교체해 한글 깨짐을 방지한다.
    /// </summary>
    [DefaultExecutionOrder(-200)]
    public sealed class FontBootstrap : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("Resources TMP 폰트 에셋 이름(확장자 제외)")]
        private string resourcesFontAssetName = "Fonts/NotoSansCJKkr-Regular_SDF";

        [SerializeField]
        private bool applyOnAwake = true;

        [SerializeField]
        [Tooltip("모든 TMP_Text에 적용")]
        private bool applyToAllTexts = true;

        [SerializeField]
        [Tooltip("TMP 기본 폰트로 설정")]
        private bool setAsDefault = true;

        [SerializeField]
        private TMP_FontAsset fontAsset = null;

        [SerializeField]
        private float minFontSize = 20f;

        private void Awake()
        {
            if (applyOnAwake)
            {
                Apply();
            }
        }

        public void Apply()
        {
            if (fontAsset == null)
            {
                fontAsset = Resources.Load<TMP_FontAsset>(resourcesFontAssetName);
            }

            TMP_FontAsset resolved = FontFallbackResolver.EnsureDefaultAndFallback(setAsDefault ? fontAsset : null);
            if (resolved == null)
            {
                Debug.LogError("[FontBootstrap] TMP 폰트 설정 실패.");
                return;
            }

            fontAsset = resolved;

            if (applyToAllTexts)
            {
                FontFallbackResolver.ApplyToAllTexts(resolved, minFontSize);
            }
        }
    }
}
