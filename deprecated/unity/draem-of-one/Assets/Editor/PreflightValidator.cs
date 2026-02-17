#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class PreflightValidator
    {
        public struct PreflightResults
        {
            public List<string> errors;
            public List<string> warnings;
            public List<string> info;

            public bool HasErrors => errors != null && errors.Count > 0;
        }

        public static PreflightResults Run(bool logToConsole)
        {
            var errors = new List<string>();
            var warnings = new List<string>();
            var info = new List<string>();

            if (!CityPackageAutoRunner.EnsureCityBuilt(warnings, errors))
            {
                warnings.Add("CITY build skipped or failed. Check Prototype scene state.");
            }

            CityMaterialFixer.FixCityMaterials();

            var inputIssues = new List<string>();
            InputUsageDiagnostics.CollectIssues(inputIssues);
            for (int i = 0; i < inputIssues.Count; i++)
            {
                errors.Add(inputIssues[i]);
            }

            var diagnostics = DreamOfOneDiagnostics.RunDiagnosticsWithResults(false);
            if (diagnostics.errors != null)
            {
                errors.AddRange(diagnostics.errors);
            }

            if (diagnostics.warnings != null)
            {
                warnings.AddRange(diagnostics.warnings);
            }

            if (diagnostics.info != null)
            {
                info.AddRange(diagnostics.info);
            }

            if (logToConsole)
            {
                EmitResults(errors, warnings, info);
            }

            return new PreflightResults
            {
                errors = errors,
                warnings = warnings,
                info = info
            };
        }

        private static void EmitResults(List<string> errors, List<string> warnings, List<string> info)
        {
            if (errors.Count == 0 && warnings.Count == 0)
            {
                Debug.Log("[Preflight] OK: no issues found.");
                return;
            }

            foreach (var error in errors)
            {
                Debug.LogError($"[Preflight] {error}");
            }

            foreach (var warning in warnings)
            {
                Debug.LogWarning($"[Preflight] {warning}");
            }

            foreach (var message in info)
            {
                Debug.Log($"[Preflight] {message}");
            }
        }
    }
}
#endif
