using UnityEngine;

[CreateAssetMenu(menuName = "DreamOfOne/MVP/NPC Preoccupation")]
public class NPCPreoccupation : ScriptableObject
{
    [SerializeField] string npcRole = "store clerk";
    [SerializeField] [TextArea(2, 4)] string personality = "Tired but friendly night-shift worker.";
    [SerializeField] string[] obsessionTopics = {
        "night shifts are exhausting",
        "the boss watches CCTV all the time"
    };
    [SerializeField] string[] knownNpcNames = { "Kim", "Park" };

    public string NpcRole => npcRole;
    public string Personality => personality;
    public string[] ObsessionTopics => obsessionTopics;
    public string[] KnownNpcNames => knownNpcNames;

    public string ToPromptBlock()
    {
        string topics = string.Join("; ", obsessionTopics);
        string names = string.Join(", ", knownNpcNames);
        return $"[PERSONALITY] {personality}\n" +
               $"[PREOCCUPATIONS] You often think about: {topics}\n" +
               $"[SOCIAL_CONTEXT] You know these people: {names}";
    }
}
