using System;

namespace DreamOfOne.Society
{
    public static class SocietyJson
    {
        /// <summary>
        /// Extract the first top-level JSON object from a possibly noisy LLM response.
        /// </summary>
        public static bool TryExtractJsonObject(string raw, out string json, out string error)
        {
            json = string.Empty;
            error = string.Empty;

            if (string.IsNullOrEmpty(raw))
            {
                error = "empty response";
                return false;
            }

            int start = raw.IndexOf('{');
            int end = raw.LastIndexOf('}');
            if (start < 0 || end < 0 || end <= start)
            {
                error = "no json object braces found";
                return false;
            }

            json = raw.Substring(start, end - start + 1).Trim();
            if (string.IsNullOrEmpty(json))
            {
                error = "json substring empty";
                return false;
            }

            return true;
        }

        public static bool TryParsePlan(string raw, out SocietyActionPlan plan, out string error)
        {
            plan = null;
            error = string.Empty;

            if (!TryExtractJsonObject(raw, out string json, out error))
            {
                return false;
            }

            try
            {
                plan = UnityEngine.JsonUtility.FromJson<SocietyActionPlan>(json);
                if (plan == null)
                {
                    error = "JsonUtility returned null";
                    return false;
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }

            return true;
        }
    }
}

