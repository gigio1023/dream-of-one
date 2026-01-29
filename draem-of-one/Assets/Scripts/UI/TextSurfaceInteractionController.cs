using DreamOfOne.Core;
using DreamOfOne.LucidCover;
using DreamOfOne.NPC;
using UnityEngine;
using CoreEventType = DreamOfOne.Core.EventType;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DreamOfOne.UI
{
    /// <summary>
    /// Phase 3: TextSurface -> SpeechAct input -> DreamLaw evaluation/apply.
    /// Minimal keyboard UX: press 1/2/3/4 to pick COMPLY/INQUIRE/FRAME/BREAK.
    /// </summary>
    public sealed class TextSurfaceInteractionController : MonoBehaviour
    {
        [SerializeField]
        private UIManager uiManager = null;

        [SerializeField]
        private WorldEventLog eventLog = null;

        [SerializeField]
        private ExposureSystem exposureSystem = null;

        [SerializeField]
        private LucidCoverRuntime lucidCoverRuntime = null;

        [SerializeField]
        [Tooltip("Witness lookup radius (meters). Fallback witness is used when no NPC is nearby.")]
        private float witnessSearchRadius = 8f;

        [SerializeField]
        [Tooltip("Also show why lines as toast (dev overlay remains the primary surface).")]
        private bool showWhyAsToast = false;

        private readonly DreamLawViolationApplier applier = new();

        private TextSurfaceInteractable activeInteractable = null;
        private TextSurface activeSurface = null;
        private bool isActive = false;
        private string activeWitnessId = "Witness";
        private string activeWitnessRole = "Citizen";

        private void Awake()
        {
            if (uiManager == null)
            {
                uiManager = GetComponent<UIManager>();
            }

            if (uiManager == null)
            {
                uiManager = FindFirstObjectByType<UIManager>();
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (exposureSystem == null)
            {
                exposureSystem = FindFirstObjectByType<ExposureSystem>();
            }

            if (lucidCoverRuntime == null)
            {
                lucidCoverRuntime = FindFirstObjectByType<LucidCoverRuntime>();
            }
        }

        private void OnEnable()
        {
            TextSurfaceInteractable.OnTextSurfaceInteract += HandleTextSurfaceInteract;
        }

        private void OnDisable()
        {
            TextSurfaceInteractable.OnTextSurfaceInteract -= HandleTextSurfaceInteract;
        }

        private void HandleTextSurfaceInteract(TextSurfaceInteractable interactable, TextSurface surface, InteractContext context)
        {
            if (surface == null || uiManager == null)
            {
                return;
            }

            if (isActive)
            {
                uiManager.ShowToast("읽기 진행 중: 1/2/3/4로 반응을 선택하세요.", 1.5f);
                return;
            }

            activeInteractable = interactable;
            activeSurface = surface;
            isActive = true;
            ResolveWitness(context.ActorPosition);

            uiManager.AddDialogueLine($"[Read] {BuildSurfaceHeader(surface)}");
            if (!string.IsNullOrEmpty(surface.SurfaceText))
            {
                uiManager.AddDialogueLine(surface.SurfaceText);
            }
            activeInteractable?.SetPromptOverride("1: COMPLY  2: INQUIRE  3: FRAME  4: BREAK");
        }

        private void Update()
        {
            if (!isActive || activeSurface == null)
            {
                return;
            }

            var act = ReadSpeechActInput();
            if (act == null)
            {
                return;
            }

            ApplySpeech(act.Value);
        }

        private SpeechAct? ReadSpeechActInput()
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current == null)
            {
                return null;
            }

            if (Keyboard.current.digit1Key.wasPressedThisFrame) return SpeechAct.Comply;
            if (Keyboard.current.digit2Key.wasPressedThisFrame) return SpeechAct.Inquire;
            if (Keyboard.current.digit3Key.wasPressedThisFrame) return SpeechAct.Frame;
            if (Keyboard.current.digit4Key.wasPressedThisFrame) return SpeechAct.Break;
            return null;
#else
            if (Input.GetKeyDown(KeyCode.Alpha1)) return SpeechAct.Comply;
            if (Input.GetKeyDown(KeyCode.Alpha2)) return SpeechAct.Inquire;
            if (Input.GetKeyDown(KeyCode.Alpha3)) return SpeechAct.Frame;
            if (Input.GetKeyDown(KeyCode.Alpha4)) return SpeechAct.Break;
            return null;
#endif
        }

        private void ApplySpeech(SpeechAct act)
        {
            if (uiManager == null)
            {
                EndInteraction();
                return;
            }

            if (lucidCoverRuntime == null)
            {
                lucidCoverRuntime = FindFirstObjectByType<LucidCoverRuntime>();
            }

            var database = lucidCoverRuntime != null ? lucidCoverRuntime.DreamLawDatabase : null;
            if (database == null)
            {
                uiManager.ShowToast("DreamLawDatabase missing. Run LucidCover seed + rebuild.", 2f);
                EndInteraction();
                return;
            }

            if (eventLog == null)
            {
                eventLog = FindFirstObjectByType<WorldEventLog>();
            }

            if (eventLog == null)
            {
                uiManager.ShowToast("WorldEventLog missing in scene.", 2f);
                EndInteraction();
                return;
            }

            if (exposureSystem == null)
            {
                exposureSystem = FindFirstObjectByType<ExposureSystem>();
            }

            string utterance = BuildPlayerUtterance(act);
            if (!string.IsNullOrEmpty(utterance))
            {
                uiManager.AddDialogueLine($"[You/{act}] {utterance}");
            }

            string placeId = !string.IsNullOrEmpty(activeSurface.PlaceId)
                ? activeSurface.PlaceId
                : activeSurface.TextSurfaceId;

            applier.ApplySpeech(
                database,
                eventLog,
                exposureSystem,
                act,
                utterance,
                placeId,
                activeWitnessId,
                activeWitnessRole,
                activeSurface.transform.position);

            RecordWhyLines(placeId);

            EndInteraction();
        }

        private void RecordWhyLines(string placeId)
        {
            if (eventLog == null || activeSurface == null)
            {
                return;
            }

            var hits = applier.LastHits;
            if (hits == null || hits.Count == 0)
            {
                LucidCoverWhyLog.Remember($"No hits @ {placeId} ({activeSurface.TextSurfaceId}).");
                return;
            }

            for (int i = 0; i < hits.Count; i++)
            {
                var hit = hits[i];
                string lawId = hit.Law != null ? hit.Law.DreamLawId : "UNKNOWN_LAW";
                string detectorId = hit.DetectorId;
                string statementId = TryFindLatestStatementId(lawId, detectorId, activeWitnessId);

                string line = $"WHY law={lawId} det={detectorId} w={activeWitnessId} stmt={statementId} S+{hit.SuspicionDelta} E+{hit.ExposureDelta}";
                if (hit.StationMultiplierApplied)
                {
                    line += " x1.5";
                }

                LucidCoverWhyLog.Remember(line);
                if (showWhyAsToast && uiManager != null)
                {
                    uiManager.ShowToast(line, 2f);
                }
            }
        }

        private string TryFindLatestStatementId(string lawId, string detectorId, string witnessId)
        {
            if (eventLog == null)
            {
                return "*";
            }

            var events = eventLog.Events;
            int start = Mathf.Max(0, events.Count - 128);
            for (int i = events.Count - 1; i >= start; i--)
            {
                var record = events[i];
                if (record == null)
                {
                    continue;
                }

                // Preferred: parse statement event id from the linked violation note (det=...; stmt=...).
                if (record.eventType == CoreEventType.ViolationDetected
                    && (string.IsNullOrEmpty(lawId) || record.ruleId == lawId)
                    && (string.IsNullOrEmpty(detectorId) || record.sourceId == detectorId)
                    && (string.IsNullOrEmpty(witnessId) || record.actorId == witnessId))
                {
                    string parsed = TryParseStatementIdFromViolationNote(record.note);
                    if (!string.IsNullOrEmpty(parsed))
                    {
                        return parsed;
                    }
                }

                // Fallback: try to find the StatementGiven event directly.
                if (record.eventType == CoreEventType.StatementGiven
                    && (string.IsNullOrEmpty(lawId) || record.ruleId == lawId)
                    && (string.IsNullOrEmpty(detectorId) || record.sourceId == detectorId)
                    && (string.IsNullOrEmpty(witnessId) || record.actorId == witnessId))
                {
                    return string.IsNullOrEmpty(record.id) ? "*" : record.id;
                }
            }

            return "*";
        }

        private static string TryParseStatementIdFromViolationNote(string note)
        {
            if (string.IsNullOrEmpty(note))
            {
                return null;
            }

            int start = note.IndexOf("stmt=", System.StringComparison.Ordinal);
            if (start < 0)
            {
                return null;
            }

            start += "stmt=".Length;
            if (start >= note.Length)
            {
                return null;
            }

            int end = note.IndexOf(';', start);
            if (end < 0)
            {
                end = note.Length;
            }

            string token = note.Substring(start, end - start).Trim();
            return string.IsNullOrEmpty(token) ? null : token;
        }

        private void ResolveWitness(Vector3 origin)
        {
            activeWitnessId = "Witness";
            activeWitnessRole = "Citizen";

            float radius = Mathf.Max(0.1f, witnessSearchRadius);
            float bestSqr = radius * radius;
            NpcPersona best = null;

            var personas = FindObjectsByType<NpcPersona>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            for (int i = 0; i < personas.Length; i++)
            {
                var persona = personas[i];
                if (persona == null)
                {
                    continue;
                }

                float sqr = (persona.transform.position - origin).sqrMagnitude;
                if (sqr < bestSqr)
                {
                    bestSqr = sqr;
                    best = persona;
                }
            }

            if (best != null)
            {
                activeWitnessId = best.NpcId;
                activeWitnessRole = best.Role;
            }
        }

        private static string BuildSurfaceHeader(TextSurface surface)
        {
            if (surface == null)
            {
                return "TextSurface";
            }

            if (!string.IsNullOrEmpty(surface.PlaceId))
            {
                return $"{surface.PlaceId} / {surface.TextSurfaceId}";
            }

            return surface.TextSurfaceId;
        }

        private string BuildPlayerUtterance(SpeechAct act)
        {
            return act switch
            {
                SpeechAct.Comply => "네, 절차대로 진행하겠습니다.",
                SpeechAct.Inquire => "확인하겠습니다. 규정 문구가 무엇인가요?",
                SpeechAct.Frame => "절차상 필요해서 확인했습니다.",
                SpeechAct.Break => "이거 꿈이죠? 현실체크를 해볼게요.",
                _ => string.Empty
            };
        }

        private void EndInteraction()
        {
            isActive = false;
            activeSurface = null;
            activeInteractable?.ClearPromptOverride();
            activeInteractable = null;
        }

#if UNITY_EDITOR
        public void DebugApplyToSurface(TextSurface surface, SpeechAct act)
        {
            if (surface == null)
            {
                return;
            }

            if (isActive)
            {
                EndInteraction();
            }

            activeSurface = surface;
            isActive = true;
            ResolveWitness(surface.transform.position);
            ApplySpeech(act);
        }
#endif
    }
}
