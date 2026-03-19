using UnityEngine;
using System.Collections.Generic;
using DreamOfOne.Core;
using DreamOfOne.NPC;

public class ZoneSuspicionBridge : MonoBehaviour
{
    [SerializeField] float detectionRange = 10f;

    static readonly Dictionary<string, float> zonePenalties = new()
    {
        { "staff_only", 30f },
        { "queue_cut", 15f },
        { "running", 10f }
    };

    public static float GetSuspicionDelta(string zoneId)
    {
        return zonePenalties.TryGetValue(zoneId, out float val) ? val : 0f;
    }

    void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        var zone = GetComponent<Zone>();
        if (zone == null) return;

        string zoneId = zone.ZoneId;
        float delta = GetSuspicionDelta(zoneId);
        if (delta <= 0) return;

        // Find nearby NPCs and add suspicion
        var npcs = FindObjectsByType<SuspicionComponent>(FindObjectsSortMode.None);
        foreach (var npc in npcs)
        {
            float dist = Vector3.Distance(npc.transform.position, transform.position);
            if (dist <= detectionRange)
            {
                npc.AddSuspicion(delta, zoneId);
                Debug.Log($"[Zone] {npc.name} saw player in {zoneId} zone (+{delta})");
            }
        }
    }
}
