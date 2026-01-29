using System.Collections.Generic;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Small in-memory debug log for the last DreamLaw application "why" lines.
    /// Displayed via UI dev overlay.
    /// </summary>
    public static class LucidCoverWhyLog
    {
        private const int Capacity = 12;
        private static readonly Queue<string> lines = new();

        public static IReadOnlyList<string> GetLines()
        {
            return lines.ToArray();
        }

        public static void Remember(string line)
        {
            if (string.IsNullOrEmpty(line))
            {
                return;
            }

            lines.Enqueue(line);
            while (lines.Count > Capacity)
            {
                lines.Dequeue();
            }
        }

        public static void Clear()
        {
            lines.Clear();
        }
    }
}

