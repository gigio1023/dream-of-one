using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public struct DialogueLine
{
    public string Speaker;
    public string Text;
    public DialogueLine(string speaker, string text) { Speaker = speaker; Text = text; }
}

public class DialogueCache
{
    readonly Dictionary<string, List<DialogueLine>> cache = new();
    readonly List<string> keys = new();

    public void Add(string id, List<DialogueLine> lines)
    {
        cache[id] = lines;
        if (!keys.Contains(id)) keys.Add(id);
    }

    public bool HasDialogue(string id) => cache.ContainsKey(id);
    public List<DialogueLine> Get(string id) => cache.TryGetValue(id, out var lines) ? lines : null;

    public List<DialogueLine> GetRandom()
    {
        if (keys.Count == 0) return null;
        string key = keys[UnityEngine.Random.Range(0, keys.Count)];
        return cache[key];
    }

    public int Count => keys.Count;
}

public class DialogueScheduler : MonoBehaviour
{
    [SerializeField] float playbackInterval = 15f;
    [SerializeField] int maxCachedDialogues = 5;

    [Header("Fallback dialogues (if LLM unavailable)")]
    [SerializeField] [TextArea] string[] fallbackDialogues = {
        "Kim: 오늘 배달 또 늦었대.\nPark: 월요일마다 그래.",
        "Kim: 사장님 또 CCTV 확인하더라.\nPark: 요즘 왜 그러시지?",
        "Kim: 저 사람 새로 온 거야?\nPark: 어제부터 본 것 같은데.",
        "Kim: 야간 근무 진짜 힘들다.\nPark: 그래도 손님 적어서 낫지.",
    };

    DialogueCache cache;
    SpeechBubbleUI[] bubbles;
    float lastPlaybackTime;

    public DialogueCache Cache => cache;

    void Awake()
    {
        cache = new DialogueCache();
        PreloadFallbacks();
    }

    void Start()
    {
        bubbles = FindObjectsByType<SpeechBubbleUI>(FindObjectsSortMode.None);
    }

    void PreloadFallbacks()
    {
        for (int i = 0; i < fallbackDialogues.Length; i++)
            cache.Add($"fallback_{i}", ParseDialogue(fallbackDialogues[i]));
    }

    void Update()
    {
        if (bubbles == null || bubbles.Length < 2) return;
        if (Time.time - lastPlaybackTime >= playbackInterval)
        {
            lastPlaybackTime = Time.time;
            TryPlayback();
        }
    }

    void TryPlayback()
    {
        var dialogue = cache.GetRandom();
        if (dialogue == null) return;
        for (int i = 0; i < Mathf.Min(dialogue.Count, bubbles.Length); i++)
        {
            float delay = i * 3f;
            StartCoroutine(ShowDelayed(bubbles[i], dialogue[i].Text, delay));
        }
    }

    IEnumerator ShowDelayed(SpeechBubbleUI bubble, string text, float delay)
    {
        yield return new WaitForSeconds(delay);
        bubble.Show(text, 4f);
    }

    List<DialogueLine> ParseDialogue(string raw)
    {
        var lines = new List<DialogueLine>();
        foreach (string line in raw.Split('\n'))
        {
            int colonIdx = line.IndexOf(':');
            if (colonIdx < 0) continue;
            string speaker = line.Substring(0, colonIdx).Trim();
            string text = line.Substring(colonIdx + 1).Trim();
            lines.Add(new DialogueLine(speaker, text));
        }
        return lines;
    }
}
