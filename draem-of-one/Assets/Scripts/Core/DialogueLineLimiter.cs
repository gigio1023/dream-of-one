namespace DreamOfOne.Core
{
    public static class DialogueLineLimiter
    {
        public static string ClampLine(string input, int maxChars)
        {
            if (string.IsNullOrWhiteSpace(input) || maxChars <= 0)
            {
                return string.Empty;
            }

            string normalized = input.Replace('\r', ' ').Replace('\n', ' ').Trim();
            while (normalized.Contains("  "))
            {
                normalized = normalized.Replace("  ", " ");
            }

            if (normalized.Length <= maxChars)
            {
                return normalized;
            }

            return normalized.Substring(0, maxChars);
        }
    }
}
