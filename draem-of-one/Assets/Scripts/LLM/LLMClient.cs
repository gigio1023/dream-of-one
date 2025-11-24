using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace DreamOfOne.LLM
{
    /// <summary>
    /// 로컬 혹은 원격 LLM 서버에 간단한 POST 요청을 보내 한 줄 대사를 받아온다.
    /// 초기에는 폴백 문장을 반환해 7주차 이전에도 전체 루프가 끊기지 않도록 한다.
    /// </summary>
    public sealed class LLMClient : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("로컬 LLM 서버 또는 프록시 엔드포인트")]
        private string endpoint = "http://localhost:11434/utterance";

        [SerializeField]
        [Tooltip("네트워크 요청 타임아웃(초). UnityWebRequest는 정수만 허용하므로 반올림 적용.")]
        private float timeoutSeconds = 2f;

        [SerializeField]
        [Tooltip("LLM 실패 시 사용할 폴백 문장")]
        private string fallbackLine = "규칙 위반을 확인했습니다. 조심해 주세요.";

        [System.Serializable]
        private struct UtteranceRequest
        {
            public string role;
            public string situation_summary;
            public string tone;
            public string constraints;
        }

        public void RequestLine(string role, string summary, System.Action<string> onResult)
        {
            StartCoroutine(RequestCoroutine(role, summary, onResult));
        }

        private IEnumerator RequestCoroutine(string role, string summary, System.Action<string> onResult)
        {
            var payload = new UtteranceRequest
            {
                role = role,
                situation_summary = summary,
                tone = "neutral",
                constraints = "한 줄, 80자 이내"
            };

            string json = JsonUtility.ToJson(payload);

            using UnityWebRequest request = new(endpoint, "POST");
            byte[] body = System.Text.Encoding.UTF8.GetBytes(json);
            request.timeout = Mathf.CeilToInt(timeoutSeconds);
            request.uploadHandler = new UploadHandlerRaw(body);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onResult?.Invoke(fallbackLine);
                yield break;
            }

            var response = JsonUtility.FromJson<UtteranceResponse>(request.downloadHandler.text);
            onResult?.Invoke(string.IsNullOrEmpty(response.utterance) ? fallbackLine : response.utterance);
        }

        [System.Serializable]
        private struct UtteranceResponse
        {
            public string utterance;
        }
    }
}
