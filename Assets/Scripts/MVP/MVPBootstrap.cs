using UnityEngine;
using DreamOfOne.Core;
using DreamOfOne.NPC;

public class MVPBootstrap : MonoBehaviour
{
    void Awake()
    {
        var wel = FindOrCreate<WorldEventLog>("WorldEventLog");
        var gss = FindOrCreate<GlobalSuspicionSystem>("GlobalSuspicionSystem");
        var exposure = FindOrCreate<ExposureSystem>("ExposureSystem");
        var reports = FindOrCreate<ReportManager>("ReportManager");

        reports.Configure(wel, gss);

        foreach (var sc in FindObjectsByType<SuspicionComponent>(FindObjectsSortMode.None))
            sc.Configure(reports, gss, wel);

        var player = FindFirstObjectByType<PlayerController>();
        if (player != null)
            player.Configure(wel, null);

        var police = FindFirstObjectByType<PoliceController>();
        if (police != null)
        {
            var playerTransform = player != null ? player.transform : null;
            police.Configure(playerTransform, reports, wel, exposure);
        }

        // New MVP systems
        FindOrCreate<DramaManagerMB>("DramaManagerMB");
        FindOrCreate<CoverWorkTracker>("CoverWorkTracker");
        FindOrCreate<DialogueScheduler>("DialogueScheduler");
        FindOrCreate<MVPAudioService>("MVPAudioService");

        // Suspicion FloatVariable bridge
        var suspicionVar = Resources.Load<FloatVariable>("MVP/SuspicionLevel");
        if (suspicionVar != null && gss != null)
        {
            gss.OnGlobalSuspicionChanged += v => suspicionVar.SetValue(v);
        }

        Debug.Log("[MVPBootstrap] All systems wired.");
    }

    T FindOrCreate<T>(string name) where T : Component
    {
        var existing = FindFirstObjectByType<T>();
        if (existing != null) return existing;
        var go = new GameObject(name);
        return go.AddComponent<T>();
    }
}
