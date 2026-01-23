using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.World
{
    public sealed class WorldBuildReport
    {
        private readonly List<string> warnings = new();
        private readonly List<string> errors = new();

        public int WarningCount => warnings.Count;
        public int ErrorCount => errors.Count;
        public bool HasErrors => errors.Count > 0;

        public IReadOnlyList<string> Warnings => warnings;
        public IReadOnlyList<string> Errors => errors;

        public void AddWarning(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return;
            }

            warnings.Add(message);
        }

        public void AddError(string message)
        {
            if (string.IsNullOrEmpty(message))
            {
                return;
            }

            errors.Add(message);
        }

        public void LogSummary(string header)
        {
            Debug.Log($"[WorldBuilder] {header} Warnings={warnings.Count} Errors={errors.Count}");
            for (int i = 0; i < warnings.Count; i++)
            {
                Debug.LogWarning($"[WorldBuilder] {warnings[i]}");
            }
            for (int i = 0; i < errors.Count; i++)
            {
                Debug.LogError($"[WorldBuilder] {errors[i]}");
            }
        }
    }
}
