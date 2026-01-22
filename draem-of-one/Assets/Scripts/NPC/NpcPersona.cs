using UnityEngine;

namespace DreamOfOne.NPC
{
    /// <summary>
    /// NPC 역할/페르소나 정의와 발화 쿨다운을 관리한다.
    /// </summary>
    public sealed class NpcPersona : MonoBehaviour
    {
        [SerializeField]
        [Tooltip("NPC 식별자(비워두면 GameObject 이름)")]
        private string npcId = string.Empty;

        [SerializeField]
        [Tooltip("역할 (Clerk/Elder/Tourist/Police 등)")]
        private string role = "Citizen";

        [SerializeField]
        [TextArea(2, 4)]
        [Tooltip("페르소나 설명")]
        private string persona = "동네 주민, 현실적인 한 줄 반응";

        [SerializeField]
        [Tooltip("말투/톤")]
        private string tone = "short, natural Korean";

        [SerializeField]
        [Tooltip("개별 발화 쿨다운(초)")]
        private float speakCooldownSeconds = 6f;

        private float lastSpokeTime = -999f;

        public string NpcId => string.IsNullOrEmpty(npcId) ? name : npcId;
        public string Role => string.IsNullOrEmpty(role) ? "Citizen" : role;
        public string Persona => persona;
        public string Tone => tone;
        public float SpeakCooldownSeconds => speakCooldownSeconds;

        public void Configure(string id, string roleName, string personaText, string toneText)
        {
            if (!string.IsNullOrEmpty(id))
            {
                npcId = id;
            }

            if (!string.IsNullOrEmpty(roleName))
            {
                role = roleName;
            }

            if (!string.IsNullOrEmpty(personaText))
            {
                persona = personaText;
            }

            if (!string.IsNullOrEmpty(toneText))
            {
                tone = toneText;
            }
        }

        public bool CanSpeak(float now)
        {
            return now - lastSpokeTime >= speakCooldownSeconds;
        }

        public void MarkSpoke(float now)
        {
            lastSpokeTime = now;
        }
    }
}
