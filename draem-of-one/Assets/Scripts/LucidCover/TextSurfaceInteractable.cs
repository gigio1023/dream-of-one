using DreamOfOne.Core;
using UnityEngine;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Allows player interaction with a TextSurface using the existing IInteractable pipeline.
    /// The actual UI flow is handled by a separate controller (Phase 3).
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class TextSurfaceInteractable : MonoBehaviour, IInteractable
    {
        public static event System.Action<TextSurfaceInteractable, TextSurface, InteractContext> OnTextSurfaceInteract;

        [SerializeField]
        private string promptText = "E: Read";

        [SerializeField]
        private float interactionCooldownSeconds = 0.5f;

        [SerializeField]
        private float maxInteractDistance = 2.2f;

        private float lastInteractTime = -999f;
        private TextSurface surface = null;
        private string promptOverride = string.Empty;

        private void Awake()
        {
            surface = GetComponent<TextSurface>();
        }

        public void ConfigurePrompt(string prompt)
        {
            if (!string.IsNullOrEmpty(prompt))
            {
                promptText = prompt;
            }
        }

        public void SetPromptOverride(string prompt)
        {
            promptOverride = prompt ?? string.Empty;
        }

        public void ClearPromptOverride()
        {
            promptOverride = string.Empty;
        }

        public string GetPrompt(InteractContext context)
        {
            return !string.IsNullOrEmpty(promptOverride) ? promptOverride : promptText;
        }

        public bool CanInteract(InteractContext context)
        {
            float now = Time.time;
            if (now - lastInteractTime < interactionCooldownSeconds)
            {
                return false;
            }

            return IsWithinRange(context);
        }

        public void Interact(InteractContext context)
        {
            if (!CanInteract(context))
            {
                return;
            }

            lastInteractTime = Time.time;
            if (surface == null)
            {
                surface = GetComponent<TextSurface>();
            }

            if (surface == null)
            {
                return;
            }

            OnTextSurfaceInteract?.Invoke(this, surface, context);
        }

        private bool IsWithinRange(InteractContext context)
        {
            if (maxInteractDistance <= 0f)
            {
                return true;
            }

            float sqr = (context.ActorPosition - transform.position).sqrMagnitude;
            return sqr <= maxInteractDistance * maxInteractDistance;
        }

        public string GetWorldStateSummary()
        {
            return surface != null ? $"TextSurface:{surface.TextSurfaceId}" : "TextSurface";
        }
    }
}
