using UnityEngine;

namespace DreamOfOne.UI
{
    /// <summary>
    /// Scene 로드 전에 TMP 기본 폰트를 세팅해 폰트 깨짐을 방지한다.
    /// </summary>
    public static class FontRuntimeInitializer
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Initialize()
        {
            FontFallbackResolver.EnsureDefaultAndFallback(null);
        }
    }
}
