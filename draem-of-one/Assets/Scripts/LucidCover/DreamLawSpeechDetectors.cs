using System;

namespace DreamOfOne.LucidCover
{
    /// <summary>
    /// Deterministic speech detector helpers used by DreamLawEvaluator.
    /// Note: Keep keyword checks allocation-free (no ToLower/Regex).
    /// </summary>
    public static class DreamLawSpeechDetectors
    {
        // Minimal v1 keyword sets (KO/EN). Tune in data later if needed.
        private static readonly string[] DreamTalkKeywords =
        {
            // KO
            "꿈",
            "자각",
            "자각몽",
            "깨어",
            "깨면",
            "루시드",
            "시뮬레이션",

            // EN
            "dream",
            "lucid",
            "wake up",
            "simulation"
        };

        private static readonly string[] RealityTestKeywords =
        {
            // KO
            "현실체크",
            "현실 체크",
            "테스트",
            "확인해보자",
            "거울",
            "손가락",
            "호흡",
            "시간이",

            // EN
            "reality check",
            "test this",
            "mirror",
            "finger"
        };

        private static readonly string[] MetaLogicKeywords =
        {
            // KO
            "버그",
            "모순",
            "말이 안",
            "이상해",

            // EN
            "bug",
            "glitch",
            "contradiction",
            "impossible"
        };

        private static readonly string[] TimelineProbeKeywords =
        {
            // KO
            "방금",
            "아까",

            // EN
            "just now",
            "a moment ago",
            "earlier"
        };

        public static bool IsTriggered(string detectorId, SpeechAct speechAct, string utterance)
        {
            if (string.IsNullOrEmpty(detectorId))
            {
                return false;
            }

            utterance ??= string.Empty;

            if (string.Equals(detectorId, DreamLawDetectorIds.SpeechDreamTalk, StringComparison.OrdinalIgnoreCase))
            {
                if (speechAct == SpeechAct.Break)
                {
                    // Break is always taboo even if the player typed no explicit keywords.
                    return true;
                }

                return ContainsAny(utterance, DreamTalkKeywords);
            }

            if (string.Equals(detectorId, DreamLawDetectorIds.SpeechRealityTest, StringComparison.OrdinalIgnoreCase))
            {
                return ContainsAny(utterance, RealityTestKeywords);
            }

            if (string.Equals(detectorId, DreamLawDetectorIds.SpeechMetaLogic, StringComparison.OrdinalIgnoreCase))
            {
                return ContainsAny(utterance, MetaLogicKeywords);
            }

            if (string.Equals(detectorId, DreamLawDetectorIds.SpeechTimelineProbe, StringComparison.OrdinalIgnoreCase))
            {
                return ContainsAny(utterance, TimelineProbeKeywords);
            }

            return false;
        }

        private static bool ContainsAny(string text, string[] keywords)
        {
            if (string.IsNullOrEmpty(text) || keywords == null || keywords.Length == 0)
            {
                return false;
            }

            for (int i = 0; i < keywords.Length; i++)
            {
                var keyword = keywords[i];
                if (string.IsNullOrEmpty(keyword))
                {
                    continue;
                }

                if (text.IndexOf(keyword, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return true;
                }
            }

            return false;
        }
    }
}

