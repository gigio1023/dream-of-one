using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 플레이어 Cover 정의.
    /// </summary>
    public sealed class CoverProfile : MonoBehaviour
    {
        [SerializeField]
        private string coverName = "외부 협력자";

        [SerializeField]
        private string affiliation = "외부";

        [SerializeField]
        private string role = "계약직";

        [SerializeField]
        [Tooltip("허용 장소(PlaceId/ZoneId) 목록")]
        private List<string> allowedPlaces = new();

        [SerializeField]
        [Tooltip("허용 토픽/룰 ID 목록")]
        private List<string> allowedTopics = new();

        [SerializeField]
        [Tooltip("금기 토픽/룰 ID 목록")]
        private List<string> tabooTopics = new();

        [SerializeField]
        [Tooltip("조직 용어")]
        private List<string> jargon = new();

        public string CoverName => coverName;
        public string Affiliation => affiliation;
        public string Role => role;
        public IReadOnlyList<string> AllowedPlaces => allowedPlaces;
        public IReadOnlyList<string> AllowedTopics => allowedTopics;
        public IReadOnlyList<string> TabooTopics => tabooTopics;
        public IReadOnlyList<string> Jargon => jargon;

        public bool IsPlaceAllowed(string placeId)
        {
            if (string.IsNullOrEmpty(placeId) || allowedPlaces.Count == 0)
            {
                return true;
            }

            return allowedPlaces.Contains(placeId);
        }

        public bool IsTopicAllowed(string topic)
        {
            if (string.IsNullOrEmpty(topic) || allowedTopics.Count == 0)
            {
                return true;
            }

            return allowedTopics.Contains(topic);
        }

        public bool IsTopicTaboo(string topic)
        {
            if (string.IsNullOrEmpty(topic) || tabooTopics.Count == 0)
            {
                return false;
            }

            return tabooTopics.Contains(topic);
        }

        public void Configure(string name, string affiliationName, string roleName, string[] places, string[] topics, string[] taboos, string[] jargonTerms)
        {
            if (!string.IsNullOrEmpty(name))
            {
                coverName = name;
            }

            if (!string.IsNullOrEmpty(affiliationName))
            {
                affiliation = affiliationName;
            }

            if (!string.IsNullOrEmpty(roleName))
            {
                role = roleName;
            }

            allowedPlaces.Clear();
            if (places != null)
            {
                allowedPlaces.AddRange(places);
            }

            allowedTopics.Clear();
            if (topics != null)
            {
                allowedTopics.AddRange(topics);
            }

            tabooTopics.Clear();
            if (taboos != null)
            {
                tabooTopics.AddRange(taboos);
            }

            jargon.Clear();
            if (jargonTerms != null)
            {
                jargon.AddRange(jargonTerms);
            }
        }
    }
}
