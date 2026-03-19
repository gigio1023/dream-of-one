using DreamOfOne.World;
using UnityEngine;
using System.Collections.Generic;

namespace DreamOfOne.UI
{
    public sealed class IncidentHintProvider
    {
        private const string ResourceRoot = "Incidents";
        private readonly Dictionary<string, IncidentDefinition> incidentsByOrg = new();
        private bool loaded = false;

        public string BuildHint(string anchorName)
        {
            if (string.IsNullOrEmpty(anchorName))
            {
                return string.Empty;
            }

            EnsureLoaded();
            string key = AnchorToOrg(anchorName);
            if (string.IsNullOrEmpty(key))
            {
                return string.Empty;
            }

            if (!incidentsByOrg.TryGetValue(key, out var incident) || incident == null)
            {
                return string.Empty;
            }

            string description = incident.Description;
            if (string.IsNullOrWhiteSpace(description))
            {
                return string.Empty;
            }

            return $"Incident: {description}";
        }

        private void EnsureLoaded()
        {
            if (loaded)
            {
                return;
            }

            loaded = true;
            var incidents = Resources.LoadAll<IncidentDefinition>(ResourceRoot);
            for (int i = 0; i < incidents.Length; i++)
            {
                var incident = incidents[i];
                if (incident == null)
                {
                    continue;
                }

                string key = InferOrgKey(incident);
                if (string.IsNullOrEmpty(key))
                {
                    continue;
                }

                if (!incidentsByOrg.ContainsKey(key))
                {
                    incidentsByOrg.Add(key, incident);
                }
            }
        }

        private static string AnchorToOrg(string anchorName)
        {
            if (anchorName.Contains("Store"))
            {
                return "Store";
            }
            if (anchorName.Contains("Studio"))
            {
                return "Studio";
            }
            if (anchorName.Contains("Park"))
            {
                return "Park";
            }
            if (anchorName.Contains("Station") || anchorName.Contains("Police"))
            {
                return "Station";
            }

            return string.Empty;
        }

        private static string InferOrgKey(IncidentDefinition incident)
        {
            string id = incident.IncidentId ?? string.Empty;
            if (id.Contains("Store"))
            {
                return "Store";
            }
            if (id.Contains("Studio"))
            {
                return "Studio";
            }
            if (id.Contains("Park"))
            {
                return "Park";
            }
            if (id.Contains("Station") || id.Contains("Police"))
            {
                return "Station";
            }

            var interactables = incident.RequiredInteractables;
            for (int i = 0; i < interactables.Length; i++)
            {
                string entry = interactables[i] ?? string.Empty;
                if (entry.StartsWith("Store_"))
                {
                    return "Store";
                }
                if (entry.StartsWith("Studio_"))
                {
                    return "Studio";
                }
                if (entry.StartsWith("Park_"))
                {
                    return "Park";
                }
                if (entry.StartsWith("Police_"))
                {
                    return "Station";
                }
            }

            return string.Empty;
        }
    }
}
