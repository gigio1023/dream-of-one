using DreamOfOne.Core;
using DreamOfOne.LLM;
using DreamOfOne.NPC;
using DreamOfOne.World;
using UnityEngine;

namespace DreamOfOne.Society
{
    /// <summary>
    /// Attaches a SocietyBrain to NPCs and provides a policy pack for runtime planning.
    /// </summary>
    public sealed class SocietyDirector : MonoBehaviour
    {
        [SerializeField]
        private string resourcesPolicyPackPath = "Policies/PolicyPack_Default";

        [SerializeField]
        private PolicyPackDefinition policyPack = null;

        [SerializeField]
        private bool attachToPolice = true;

        [SerializeField]
        private bool attachToCitizens = true;

        [SerializeField]
        private bool verbose = false;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureDirector()
        {
            if (FindFirstObjectByType<SocietyDirector>() != null)
            {
                return;
            }

            var host = new GameObject("SocietyDirector");
            host.AddComponent<SocietyDirector>();
        }

        private void Awake()
        {
            if (policyPack == null && !string.IsNullOrEmpty(resourcesPolicyPackPath))
            {
                policyPack = Resources.Load<PolicyPackDefinition>(resourcesPolicyPackPath);
                if (verbose)
                {
                    Debug.Log(policyPack != null
                        ? $"[SocietyDirector] Loaded policy pack: {policyPack.name}"
                        : $"[SocietyDirector] Policy pack not found at Resources/{resourcesPolicyPackPath}. Using defaults.");
                }
            }
        }

        private void Start()
        {
            var eventLog = FindFirstObjectByType<WorldEventLog>();
            var llmClient = FindFirstObjectByType<LLMClient>();
            var reportManager = FindFirstObjectByType<ReportManager>();
            var shaper = FindFirstObjectByType<SemanticShaper>();

            if (eventLog == null || llmClient == null)
            {
                if (verbose)
                {
                    Debug.LogWarning("[SocietyDirector] Missing WorldEventLog or LLMClient; society planning disabled.");
                }
                return;
            }

            var personas = FindObjectsByType<NpcPersona>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            for (int i = 0; i < personas.Length; i++)
            {
                var persona = personas[i];
                if (persona == null)
                {
                    continue;
                }

                bool isPolice = persona.RoleId is RoleId.Police or RoleId.Officer
                    || persona.GetComponent<PoliceController>() != null;

                if (isPolice && !attachToPolice)
                {
                    continue;
                }

                if (!isPolice && !attachToCitizens)
                {
                    continue;
                }

                if (persona.GetComponent<SocietyBrain>() != null)
                {
                    continue;
                }

                var brain = persona.gameObject.AddComponent<SocietyBrain>();
                brain.Configure(policyPack, eventLog, llmClient, reportManager, shaper);
            }
        }
    }
}
