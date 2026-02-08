using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace DreamOfOne.Society
{
    /// <summary>
    /// Bridges Unity society runtime and backend npc-runtime decision API.
    /// </summary>
    public sealed class SocietyRuntimeClient : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("Enable backend decision bridge path.")]
        private bool backendEnabled = true;

        [SerializeField]
        [Tooltip("npc-runtime decision endpoint.")]
        private string decisionEndpoint = "http://127.0.0.1:8787/v1/npc/decision";

        [SerializeField]
        [Tooltip("HTTP timeout in seconds.")]
        private int timeoutSeconds = 8;

        [SerializeField]
        [Tooltip("Verbose runtime bridge logs.")]
        private bool verbose = false;

        public bool BackendEnabled => backendEnabled;
        public string DecisionEndpoint => decisionEndpoint;

        public void RequestDecision(PerceptionPacket packet, Action<DecisionEnvelopePayload, string> onResult)
        {
            if (!backendEnabled)
            {
                onResult?.Invoke(null, "backend_disabled");
                return;
            }

            if (packet == null)
            {
                onResult?.Invoke(null, "invalid_packet:null");
                return;
            }

            if (string.IsNullOrWhiteSpace(packet.sessionId) || string.IsNullOrWhiteSpace(packet.npcId))
            {
                onResult?.Invoke(null, "invalid_packet:missing_session_or_npc");
                return;
            }

            if (string.IsNullOrWhiteSpace(decisionEndpoint))
            {
                onResult?.Invoke(null, "invalid_endpoint");
                return;
            }

            StartCoroutine(RequestDecisionCoroutine(packet, onResult));
        }

        private IEnumerator RequestDecisionCoroutine(PerceptionPacket packet, Action<DecisionEnvelopePayload, string> onResult)
        {
            string requestJson = JsonUtility.ToJson(packet);
            using (var request = new UnityWebRequest(decisionEndpoint, "POST"))
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(requestJson));
                request.downloadHandler = new DownloadHandlerBuffer();
                request.timeout = Mathf.Max(1, timeoutSeconds);
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("Accept", "application/json");

                yield return request.SendWebRequest();

                if (request.result != UnityWebRequest.Result.Success)
                {
                    string reason = $"runtime_http_error:{request.responseCode}:{request.error}";
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyRuntimeClient] {reason}");
                    }

                    onResult?.Invoke(null, reason);
                    yield break;
                }

                string rawResponse = request.downloadHandler != null ? request.downloadHandler.text : string.Empty;
                if (!SocietyJson.TryParseDecisionEnvelope(rawResponse, packet.npcId, out var envelope, out string parseError))
                {
                    string reason = $"runtime_parse_error:{parseError}";
                    if (verbose)
                    {
                        Debug.LogWarning($"[SocietyRuntimeClient] {reason}");
                    }

                    onResult?.Invoke(null, reason);
                    yield break;
                }

                onResult?.Invoke(envelope, string.Empty);
            }
        }
    }
}
