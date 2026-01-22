using System;
using System.Collections;
using System.Text;
using DreamOfOne.Core;
using UnityEngine;
using UnityEngine.Networking;

namespace DreamOfOne.LLM
{
    /// <summary>
    /// LLM에 요청을 보내 한 줄 대사를 받아온다.
    /// 로컬 엔드포인트와 OpenAI Chat Completions를 지원한다.
    /// </summary>
    public sealed class LLMClient : MonoBehaviour
    {
        public enum Provider
        {
            Mock,
            LocalEndpoint,
            OpenAIChatCompletions
        }

        [SerializeField]
        [Tooltip("LLM 제공자 선택")]
        private Provider provider = Provider.Mock;

        [Header("OpenAI Chat Completions")]
        [SerializeField]
        [Tooltip("OpenAI Chat Completions API 엔드포인트")]
        private string openAiEndpoint = "https://api.openai.com/v1/chat/completions";

        [SerializeField]
        [Tooltip("OpenAI 모델 이름")]
        private string openAiModel = "gpt-4.1-mini";

        [SerializeField]
        [Tooltip("API 키 환경 변수 이름")]
        private string apiKeyEnvVar = "OPENAI_API_KEY";

        [SerializeField]
        [Tooltip("환경 변수 우선 사용")]
        private bool preferEnvironmentKey = true;

        [SerializeField]
        [Tooltip("인스펙터에 API 키를 직접 입력할 때만 사용(권장하지 않음)")]
        private string apiKey = string.Empty;

        [SerializeField]
        [Tooltip("OpenAI 응답 저장 여부")]
        private bool storeResponses = false;

        [SerializeField]
        [Tooltip("OpenAI max_tokens")]
        private int maxTokens = 80;

        [SerializeField]
        [Tooltip("OpenAI temperature")]
        private float temperature = 0.7f;

        [SerializeField]
        [Tooltip("Chat Completions에서 developer 역할 사용")]
        private bool useDeveloperRole = false;

        [Header("Local Endpoint")]
        [SerializeField]
        [Tooltip("로컬 LLM 서버 또는 프록시 엔드포인트")]
        private string endpoint = "http://localhost:11434/utterance";

        [SerializeField]
        [Tooltip("네트워크 요청 타임아웃(초). UnityWebRequest는 정수만 허용하므로 반올림 적용.")]
        private float timeoutSeconds = 2f;

        [SerializeField]
        [Tooltip("LLM 실패 시 사용할 폴백 문장")]
        private string fallbackLine = "규칙 위반을 확인했습니다. 조심해 주세요.";

        [SerializeField]
        [Tooltip("Mock 모드에서도 역할별 간단 변주를 사용")]
        private bool useMockVariations = true;

        [SerializeField]
        [Tooltip("한 줄 최대 글자 수")]
        private int maxChars = 80;

        [SerializeField]
        [Tooltip("기본 톤")]
        private string defaultTone = "neutral";

        [SerializeField]
        [Tooltip("기본 제약")]
        private string defaultConstraints = "한 줄, 80자 이내";

        [SerializeField]
        [Tooltip("실패/오류를 콘솔에 출력")]
        private bool logErrors = true;

        [Serializable]
        public struct LineRequest
        {
            public string role;
            public string persona;
            public string situation;
            public string tone;
            public string constraints;
        }

        [Serializable]
        private struct UtteranceRequest
        {
            public string role;
            public string situation_summary;
            public string tone;
            public string constraints;
        }

        [Serializable]
        private struct UtteranceResponse
        {
            public string utterance;
        }

        [Serializable]
        private struct ChatMessage
        {
            public string role;
            public string content;
        }

        [Serializable]
        private struct ChatCompletionRequest
        {
            public string model;
            public ChatMessage[] messages;
            public float temperature;
            public int max_tokens;
            public bool store;
        }

        [Serializable]
        private struct ChatChoice
        {
            public int index;
            public ChatMessage message;
        }

        [Serializable]
        private struct ChatCompletionResponse
        {
            public ChatChoice[] choices;
        }

        public void RequestLine(string role, string summary, Action<string> onResult)
        {
            RequestLine(new LineRequest
            {
                role = role,
                situation = summary,
                tone = defaultTone,
                constraints = defaultConstraints
            }, onResult);
        }

        public void RequestLine(LineRequest request, Action<string> onResult)
        {
            StartCoroutine(RequestCoroutine(request, onResult));
        }

        private IEnumerator RequestCoroutine(LineRequest request, Action<string> onResult)
        {
            switch (provider)
            {
                case Provider.Mock:
                    onResult?.Invoke(DialogueLineLimiter.ClampLine(BuildMockLine(request), maxChars));
                    yield break;
                case Provider.OpenAIChatCompletions:
                    yield return RequestOpenAi(request, onResult);
                    yield break;
                default:
                    yield return RequestLocal(request, onResult);
                    yield break;
            }
        }

        private IEnumerator RequestLocal(LineRequest request, Action<string> onResult)
        {
            string summary = request.situation ?? string.Empty;
            if (!string.IsNullOrEmpty(request.persona))
            {
                summary = $"{request.persona} | {summary}";
            }

            var payload = new UtteranceRequest
            {
                role = request.role,
                situation_summary = summary,
                tone = string.IsNullOrEmpty(request.tone) ? defaultTone : request.tone,
                constraints = string.IsNullOrEmpty(request.constraints) ? defaultConstraints : request.constraints
            };

            string json = JsonUtility.ToJson(payload);

            using UnityWebRequest requestWeb = new(endpoint, "POST");
            byte[] body = Encoding.UTF8.GetBytes(json);
            requestWeb.timeout = Mathf.CeilToInt(timeoutSeconds);
            requestWeb.uploadHandler = new UploadHandlerRaw(body);
            requestWeb.downloadHandler = new DownloadHandlerBuffer();
            requestWeb.SetRequestHeader("Content-Type", "application/json");

            yield return requestWeb.SendWebRequest();

            if (requestWeb.result != UnityWebRequest.Result.Success)
            {
                HandleFailure(requestWeb.error, onResult, request);
                yield break;
            }

            var response = JsonUtility.FromJson<UtteranceResponse>(requestWeb.downloadHandler.text);
            string sanitized = DialogueLineLimiter.ClampLine(response.utterance, maxChars);
            if (string.IsNullOrEmpty(sanitized))
            {
                sanitized = DialogueLineLimiter.ClampLine(fallbackLine, maxChars);
            }

            onResult?.Invoke(sanitized);
        }

        private IEnumerator RequestOpenAi(LineRequest request, Action<string> onResult)
        {
            string apiKeyResolved = ResolveApiKey();
            if (string.IsNullOrEmpty(apiKeyResolved))
            {
                HandleFailure("OPENAI_API_KEY missing", onResult, request);
                yield break;
            }

            string systemText = BuildDeveloperPrompt(request);
            string userText = BuildUserPrompt(request);
            string role = useDeveloperRole ? "developer" : "system";

            var payload = new ChatCompletionRequest
            {
                model = openAiModel,
                messages = new[]
                {
                    new ChatMessage { role = role, content = systemText },
                    new ChatMessage { role = "user", content = userText }
                },
                temperature = temperature,
                max_tokens = maxTokens,
                store = storeResponses
            };

            string json = JsonUtility.ToJson(payload);

            using UnityWebRequest requestWeb = new(openAiEndpoint, "POST");
            byte[] body = Encoding.UTF8.GetBytes(json);
            requestWeb.timeout = Mathf.CeilToInt(timeoutSeconds);
            requestWeb.uploadHandler = new UploadHandlerRaw(body);
            requestWeb.downloadHandler = new DownloadHandlerBuffer();
            requestWeb.SetRequestHeader("Content-Type", "application/json");
            requestWeb.SetRequestHeader("Authorization", $"Bearer {apiKeyResolved}");

            yield return requestWeb.SendWebRequest();

            if (requestWeb.result != UnityWebRequest.Result.Success)
            {
                HandleFailure(requestWeb.error, onResult, request);
                yield break;
            }

            if (!TryParseOpenAiResponse(requestWeb.downloadHandler.text, out string line))
            {
                HandleFailure("OpenAI response parse failed", onResult, request);
                yield break;
            }

            string sanitized = DialogueLineLimiter.ClampLine(line, maxChars);
            if (string.IsNullOrEmpty(sanitized))
            {
                sanitized = DialogueLineLimiter.ClampLine(fallbackLine, maxChars);
            }

            onResult?.Invoke(sanitized);
        }

        private string ResolveApiKey()
        {
            if (preferEnvironmentKey)
            {
                string envKey = Environment.GetEnvironmentVariable(apiKeyEnvVar);
                if (!string.IsNullOrEmpty(envKey))
                {
                    return envKey;
                }
            }

            return apiKey;
        }

        private string BuildDeveloperPrompt(LineRequest request)
        {
            var builder = new StringBuilder();
            builder.Append("너는 한국의 편의점 거리 시뮬레이션에 등장하는 NPC다. ");
            if (!string.IsNullOrEmpty(request.role))
            {
                builder.Append($"역할: {request.role}. ");
            }

            if (!string.IsNullOrEmpty(request.persona))
            {
                builder.Append($"페르소나: {request.persona}. ");
            }

            string tone = string.IsNullOrEmpty(request.tone) ? defaultTone : request.tone;
            if (!string.IsNullOrEmpty(tone))
            {
                builder.Append($"톤: {tone}. ");
            }

            string constraints = string.IsNullOrEmpty(request.constraints) ? defaultConstraints : request.constraints;
            if (!string.IsNullOrEmpty(constraints))
            {
                builder.Append($"제약: {constraints}. ");
            }

            builder.Append("출력은 한 줄 대사만 반환한다. ");
            builder.Append("사실/증거/판정은 이미 로그로 결정되어 있으며 새 사실/증거/판정을 만들지 않는다. ");
            builder.Append("Structured Event 내용을 바꾸지 말고 표현만 한다.");
            return builder.ToString();
        }

        private string BuildUserPrompt(LineRequest request)
        {
            if (string.IsNullOrEmpty(request.situation))
            {
                return "상황 설명 없음.";
            }

            return $"상황: {request.situation}";
        }

        private static bool TryParseOpenAiResponse(string json, out string line)
        {
            line = string.Empty;
            if (string.IsNullOrEmpty(json))
            {
                return false;
            }

            try
            {
                var response = JsonUtility.FromJson<ChatCompletionResponse>(json);
                if (response.choices == null || response.choices.Length == 0)
                {
                    return false;
                }

                line = response.choices[0].message.content;
                return !string.IsNullOrEmpty(line);
            }
            catch
            {
                return false;
            }
        }

        private void HandleFailure(string error, Action<string> onResult, LineRequest request)
        {
            if (logErrors && !string.IsNullOrEmpty(error))
            {
                Debug.LogWarning($"[LLM] {error}");
            }

            onResult?.Invoke(DialogueLineLimiter.ClampLine(BuildMockLine(request), maxChars));
        }

        private string BuildMockLine(LineRequest request)
        {
            if (!useMockVariations)
            {
                return fallbackLine;
            }

            string role = request.role ?? string.Empty;
            string persona = request.persona ?? string.Empty;
            string situation = request.situation ?? string.Empty;

            string prefix = role switch
            {
                "편의점 점원" or "Clerk" => "점원",
                "편의점 점장" or "Manager" => "점장",
                "동네 어르신" or "Elder" => "어르신",
                "공원 관리인" or "Caretaker" => "관리인",
                "관광객" or "Tourist" => "관광객",
                "주민 대표" or "Resident" => "주민",
                "학생" or "Student" => "학생",
                "스튜디오 PM" or "PM" => "PM",
                "개발자" or "Developer" => "개발",
                "QA" => "QA",
                "릴리즈 담당" or "Release" => "릴리즈",
                "바리스타" or "Barista" => "바리스타",
                "카페 안내" or "CafeHost" => "카페",
                "배송기사" or "Courier" => "배송",
                "시설 기사" or "FacilityTech" => "시설",
                "리포터" or "Reporter" => "기자",
                "순경" or "Officer" => "경찰",
                "조사관" or "Investigator" => "조사관",
                "경찰" or "Police" => "경찰",
                _ => "시민"
            };

            string[] lines = new[]
            {
                $"{prefix}: 규칙은 지켜야죠.",
                $"{prefix}: 지금은 좀 곤란해요.",
                $"{prefix}: 신고 들어가겠어요.",
                $"{prefix}: 다음엔 조심해 주세요.",
                $"{prefix}: 상황이 좋지 않네요."
            };

            if (!string.IsNullOrEmpty(situation))
            {
                return $"{prefix}: {situation}";
            }

            if (!string.IsNullOrEmpty(persona))
            {
                return $"{prefix}: {persona}";
            }

            return lines[UnityEngine.Random.Range(0, lines.Length)];
        }
    }
}
