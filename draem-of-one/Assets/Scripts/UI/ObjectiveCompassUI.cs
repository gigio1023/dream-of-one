using System;
using System.Collections.Generic;
using System.Text;
using DreamOfOne.Core;
using DreamOfOne.Localization;
using TMPro;
using UnityEngine;

namespace DreamOfOne.UI
{
    /// <summary>
    /// 주요 랜드마크 방문 목표와 방향 안내를 표시한다.
    /// </summary>
    [DefaultExecutionOrder(20)]
    public sealed class ObjectiveCompassUI : MonoBehaviour
    {
        [SerializeField]
        private string[] objectiveAnchors =
        {
            "StoreBuilding",
            "StudioBuilding_L1",
            "ParkArea",
            "Station"
        };

        [SerializeField]
        private float visitRadius = 3.5f;

        [SerializeField]
        private float updateInterval = 0.25f;

        [SerializeField]
        private bool spawnMarkers = true;

        [SerializeField]
        private float markerHeight = 2.4f;

        [SerializeField]
        private float markerScale = 0.6f;

        [Serializable]
        private struct ObjectiveReason
        {
            public string anchorName;
            public LocalizationKey reasonKey;
        }

        [SerializeField]
        private ObjectiveReason[] objectiveReasons =
        {
            new ObjectiveReason { anchorName = "StoreBuilding", reasonKey = LocalizationKey.ObjectiveReasonStore },
            new ObjectiveReason { anchorName = "StudioBuilding_L1", reasonKey = LocalizationKey.ObjectiveReasonStudio },
            new ObjectiveReason { anchorName = "ParkArea", reasonKey = LocalizationKey.ObjectiveReasonPark },
            new ObjectiveReason { anchorName = "Station", reasonKey = LocalizationKey.ObjectiveReasonStation }
        };

        [SerializeField]
        private bool allowMarkerToggle = true;

        [SerializeField]
        private KeyCode toggleMarkersKey = KeyCode.M;

        private readonly Dictionary<string, Transform> anchors = new();
        private readonly HashSet<string> visited = new();
        private readonly Dictionary<string, Renderer> markers = new();
        private TMP_Text outputText = null;
        private Transform player = null;
        private UIManager uiManager = null;
        private WorldEventLog eventLog = null;
        private IncidentHintProvider incidentHints = new();
        private float nextUpdate = 0f;
        private bool completed = false;
        private bool markersVisible = true;
        private readonly StringBuilder outputBuilder = new StringBuilder(256);
        private string lastOutput = string.Empty;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureInstance()
        {
            if (FindFirstObjectByType<ObjectiveCompassUI>() != null)
            {
                return;
            }

            var host = new GameObject("ObjectiveCompassUI");
            host.AddComponent<ObjectiveCompassUI>();
        }

        private void Awake()
        {
            player = GameObject.FindGameObjectWithTag("Player")?.transform;
            uiManager = FindFirstObjectByType<UIManager>();
            eventLog = FindFirstObjectByType<WorldEventLog>();
            ResolveAnchors();
            EnsureOutputText();
            EnsureMarkers();
        }

        private void Update()
        {
            if (allowMarkerToggle && WasToggleMarkersPressed())
            {
                markersVisible = !markersVisible;
                SetMarkersActive(markersVisible);
            }

            if (Time.time < nextUpdate)
            {
                return;
            }

            nextUpdate = Time.time + updateInterval;
            if (player == null)
            {
                player = GameObject.FindGameObjectWithTag("Player")?.transform;
            }

            UpdateVisited();
            UpdateMarkers();
            UpdateOutput();
        }

        private void ResolveAnchors()
        {
            anchors.Clear();
            var anchorRoot = GameObject.Find("CITY_Anchors");
            if (anchorRoot == null)
            {
                return;
            }

            for (int i = 0; i < objectiveAnchors.Length; i++)
            {
                string name = objectiveAnchors[i];
                if (string.IsNullOrEmpty(name))
                {
                    continue;
                }

                var anchor = GameObject.Find($"CITY_Anchors/{name}");
                if (anchor != null && !anchors.ContainsKey(name))
                {
                    anchors.Add(name, anchor.transform);
                }
            }
        }

        private void EnsureOutputText()
        {
            if (outputText != null)
            {
                return;
            }

            var canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                return;
            }

            foreach (var text in canvas.GetComponentsInChildren<TMP_Text>(true))
            {
                if (text != null && text.name == "ObjectiveText")
                {
                    outputText = text;
                    break;
                }
            }

            if (outputText == null)
            {
                var obj = new GameObject("ObjectiveText", typeof(RectTransform), typeof(TextMeshProUGUI));
                obj.transform.SetParent(canvas.transform, false);
                outputText = obj.GetComponent<TextMeshProUGUI>();
            }

            if (outputText != null)
            {
                outputText.fontSize = 26f;
                outputText.alignment = TextAlignmentOptions.TopRight;
                outputText.raycastTarget = false;

                var rect = outputText.rectTransform;
                rect.anchorMin = new Vector2(1f, 1f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(1f, 1f);
                rect.sizeDelta = new Vector2(460f, 80f);
                rect.anchoredPosition = new Vector2(-20f, -20f);
            }
        }

        private void EnsureMarkers()
        {
            if (!spawnMarkers || anchors.Count == 0)
            {
                return;
            }

            var root = GameObject.Find("ObjectiveMarkers") ?? new GameObject("ObjectiveMarkers");
            markers.Clear();

            foreach (var entry in anchors)
            {
                var marker = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                marker.name = $"ObjectiveMarker_{entry.Key}";
                marker.transform.SetParent(root.transform);
                marker.transform.position = entry.Value.position + Vector3.up * markerHeight;
                marker.transform.localScale = new Vector3(markerScale, markerScale, markerScale);
                marker.SetActive(markersVisible);

                var collider = marker.GetComponent<Collider>();
                if (collider != null)
                {
                    Destroy(collider);
                }

                var renderer = marker.GetComponent<Renderer>();
                if (renderer != null)
                {
                    renderer.material.color = new Color(0.2f, 0.6f, 0.9f, 0.8f);
                    markers[entry.Key] = renderer;
                }
            }
        }

        private void UpdateVisited()
        {
            if (player == null || anchors.Count == 0)
            {
                return;
            }

            foreach (var entry in anchors)
            {
                if (visited.Contains(entry.Key))
                {
                    continue;
                }

                float dist = Vector3.Distance(player.position, entry.Value.position);
                if (dist <= visitRadius)
                {
                    visited.Add(entry.Key);
                    uiManager?.ShowToast(LocalizationManager.Text(LocalizationKey.LandmarkVisitedToast, entry.Key), 2f);
                    RecordVisit(entry.Key, entry.Value.position);
                }
            }

            if (!completed && visited.Count >= anchors.Count)
            {
                completed = true;
                uiManager?.ShowToast(LocalizationManager.Text(LocalizationKey.AllLandmarksVisitedToast), 4f);
            }
        }

        private void UpdateMarkers()
        {
            if (markers.Count == 0)
            {
                return;
            }

            string target = GetCurrentTarget();
            foreach (var entry in markers)
            {
                if (entry.Value == null)
                {
                    continue;
                }

                if (visited.Contains(entry.Key))
                {
                    entry.Value.material.color = new Color(0.3f, 0.85f, 0.4f, 0.9f);
                }
                else if (entry.Key == target)
                {
                    entry.Value.material.color = new Color(0.95f, 0.85f, 0.2f, 0.95f);
                }
                else
                {
                    entry.Value.material.color = new Color(0.2f, 0.6f, 0.9f, 0.8f);
                }
            }
        }

        private void UpdateOutput()
        {
            if (outputText == null)
            {
                return;
            }

            string target = GetCurrentTarget();
            if (string.IsNullOrEmpty(target) || completed)
            {
                SetOutputText(LocalizationManager.Text(LocalizationKey.ObjectiveAllVisited));
                return;
            }

            string reason = GetReasonFor(target);
            string incidentHint = incidentHints != null ? incidentHints.BuildHint(target) : string.Empty;
            if (!anchors.TryGetValue(target, out var targetTransform) || targetTransform == null || player == null)
            {
                string header = LocalizationManager.Text(LocalizationKey.ObjectiveTarget, target);
                SetOutputText(BuildOutput(header, reason, incidentHint, string.Empty));
                return;
            }

            Vector3 delta = targetTransform.position - player.position;
            delta.y = 0f;
            float distance = delta.magnitude;
            string direction = ToCardinal(delta);
            string remaining = BuildRemainingList();
            string headerLine = LocalizationManager.Text(LocalizationKey.ObjectiveTargetWithDirection, target, direction, distance);
            string remainingLine = LocalizationManager.Text(LocalizationKey.ObjectiveRemainingLine, remaining);
            SetOutputText(BuildOutput(headerLine, reason, incidentHint, remainingLine));
        }

        private string GetCurrentTarget()
        {
            foreach (var entry in anchors)
            {
                if (!visited.Contains(entry.Key))
                {
                    return entry.Key;
                }
            }

            return string.Empty;
        }

        private string BuildRemainingList()
        {
            var builder = new System.Text.StringBuilder();
            int count = 0;
            foreach (var entry in anchors)
            {
                if (visited.Contains(entry.Key))
                {
                    continue;
                }

                if (count > 0)
                {
                    builder.Append(", ");
                }

                builder.Append(entry.Key);
                count++;
                if (count >= 3)
                {
                    break;
                }
            }

            if (count == 0)
            {
                return "-";
            }

            return builder.ToString();
        }

        private string GetReasonFor(string target)
        {
            if (string.IsNullOrEmpty(target))
            {
                return string.Empty;
            }

            for (int i = 0; i < objectiveReasons.Length; i++)
            {
                var entry = objectiveReasons[i];
                if (string.Equals(entry.anchorName, target, StringComparison.OrdinalIgnoreCase))
                {
                    return LocalizationManager.Text(entry.reasonKey);
                }
            }

            return string.Empty;
        }

        private string BuildOutput(string header, string reason, string incidentHint, string remaining)
        {
            var builder = outputBuilder;
            builder.Clear();
            if (!string.IsNullOrWhiteSpace(header))
            {
                builder.Append(header.Trim());
            }

            if (!string.IsNullOrWhiteSpace(reason))
            {
                string reasonLine = LocalizationManager.Text(LocalizationKey.ObjectiveReasonLine, reason);
                if (!string.IsNullOrWhiteSpace(reasonLine))
                {
                    if (builder.Length > 0)
                    {
                        builder.Append('\n');
                    }
                    builder.Append(reasonLine.Trim());
                }
            }

            if (!string.IsNullOrWhiteSpace(incidentHint))
            {
                if (builder.Length > 0)
                {
                    builder.Append('\n');
                }
                builder.Append(incidentHint.Trim());
            }

            if (!string.IsNullOrWhiteSpace(remaining))
            {
                if (builder.Length > 0)
                {
                    builder.Append('\n');
                }
                builder.Append(remaining.Trim());
            }

            return builder.Length == 0 ? string.Empty : builder.ToString();
        }

        private void SetOutputText(string text)
        {
            if (outputText == null)
            {
                return;
            }

            if (string.Equals(text, lastOutput, StringComparison.Ordinal))
            {
                return;
            }

            lastOutput = text;
            outputText.SetText(text ?? string.Empty);
        }

        private void SetMarkersActive(bool active)
        {
            foreach (var marker in markers.Values)
            {
                if (marker != null)
                {
                    marker.gameObject.SetActive(active);
                }
            }
        }

        private bool WasToggleMarkersPressed()
        {
#if ENABLE_INPUT_SYSTEM
            if (UnityEngine.InputSystem.Keyboard.current == null)
            {
                return false;
            }

            UnityEngine.InputSystem.Key key = toggleMarkersKey switch
            {
                KeyCode.M => UnityEngine.InputSystem.Key.M,
                _ => UnityEngine.InputSystem.Key.None
            };

            if (key == UnityEngine.InputSystem.Key.None)
            {
                return false;
            }

            return UnityEngine.InputSystem.Keyboard.current[key].wasPressedThisFrame;
#else
            return Input.GetKeyDown(toggleMarkersKey);
#endif
        }

        private void RecordVisit(string anchorName, Vector3 position)
        {
            if (eventLog == null)
            {
                return;
            }

            var record = new EventRecord
            {
                actorId = "Player",
                actorRole = "Player",
                eventType = DreamOfOne.Core.EventType.TaskCompleted,
                placeId = anchorName,
                zoneId = anchorName,
                topic = "LandmarkVisit",
                note = $"Visited {anchorName}",
                position = position
            };

            eventLog.RecordEvent(record);
        }

        private static string ToCardinal(Vector3 delta)
        {
            if (delta.sqrMagnitude <= 0.001f)
            {
                return "Here";
            }

            float angle = Mathf.Atan2(delta.x, delta.z) * Mathf.Rad2Deg;
            if (angle < 0f)
            {
                angle += 360f;
            }

            string[] labels = { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
            int index = Mathf.RoundToInt(angle / 45f) % labels.Length;
            return labels[index];
        }

        public void ResetObjective()
        {
            foreach (var entry in markers.Values)
            {
                if (entry != null)
                {
                    Destroy(entry.gameObject);
                }
            }

            markers.Clear();
            visited.Clear();
            completed = false;
            nextUpdate = 0f;
            ResolveAnchors();
            EnsureMarkers();
            UpdateMarkers();
            UpdateOutput();
        }
    }
}
