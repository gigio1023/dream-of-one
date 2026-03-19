using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Playmode 스모크 테스트 시 런타임 에러를 수집한다.
    /// </summary>
    public sealed class RuntimeErrorProbe : MonoBehaviour
    {
        [SerializeField]
        private float durationSeconds = 8f;

        private float startTime = 0f;

        private void OnEnable()
        {
            startTime = Time.realtimeSinceStartup;
            Application.logMessageReceived += HandleLog;
        }

        private void OnDisable()
        {
            Application.logMessageReceived -= HandleLog;
        }

        private void Update()
        {
            if (Time.realtimeSinceStartup - startTime >= durationSeconds)
            {
                Finish();
            }
        }

        private void HandleLog(string condition, string stackTrace, LogType type)
        {
            if (type != LogType.Error && type != LogType.Exception && type != LogType.Assert)
            {
                return;
            }

#if UNITY_EDITOR
            int count = UnityEditor.SessionState.GetInt("DreamOfOne.PlayTestErrors", 0);
            UnityEditor.SessionState.SetInt("DreamOfOne.PlayTestErrors", count + 1);

            string existing = UnityEditor.SessionState.GetString("DreamOfOne.PlayTestMessages", string.Empty);
            if (existing.Length < 2000)
            {
                UnityEditor.SessionState.SetString("DreamOfOne.PlayTestMessages", existing + "\n" + condition);
            }
#endif
        }

        private void Finish()
        {
#if UNITY_EDITOR
            UnityEditor.SessionState.SetBool("DreamOfOne.PlayTestDone", true);
            UnityEditor.EditorApplication.ExitPlaymode();
#endif
            enabled = false;
        }
    }
}
