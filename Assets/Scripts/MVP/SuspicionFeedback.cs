// Assets/Scripts/MVP/SuspicionFeedback.cs
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using DreamOfOne.Core;

[RequireComponent(typeof(Volume))]
public class SuspicionFeedback : MonoBehaviour
{
    [SerializeField] FloatVariable suspicionLevel;

    [Header("Vignette")]
    [SerializeField] float vignetteMin = 0.1f;
    [SerializeField] float vignetteMax = 0.55f;

    [Header("Chromatic Aberration")]
    [SerializeField] float chromAbMin = 0f;
    [SerializeField] float chromAbMax = 0.4f;

    [Header("Color Adjustments")]
    [SerializeField] float saturationMin = 0f;
    [SerializeField] float saturationMax = -40f;
    [SerializeField] float colorTempMin = 0f;
    [SerializeField] float colorTempMax = -30f;

    Volume volume;
    Vignette vignette;
    ChromaticAberration chromAb;
    ColorAdjustments colorAdj;
    float currentSuspicion;
    float smoothedSuspicion;

    void Awake()
    {
        volume = GetComponent<Volume>();
        if (!volume.profile.TryGet(out vignette))
            vignette = volume.profile.Add<Vignette>();
        if (!volume.profile.TryGet(out chromAb))
            chromAb = volume.profile.Add<ChromaticAberration>();
        if (!volume.profile.TryGet(out colorAdj))
            colorAdj = volume.profile.Add<ColorAdjustments>();

        vignette.active = true;
        chromAb.active = true;
        colorAdj.active = true;
    }

    void OnEnable()
    {
        if (suspicionLevel != null) suspicionLevel.OnChanged += OnSuspicionChanged;
    }

    void OnDisable()
    {
        if (suspicionLevel != null) suspicionLevel.OnChanged -= OnSuspicionChanged;
    }

    void OnSuspicionChanged(float value) => currentSuspicion = value;

    void Update()
    {
        smoothedSuspicion = Mathf.Lerp(smoothedSuspicion, currentSuspicion, Time.deltaTime * 3f);
        vignette.intensity.value = Mathf.Lerp(vignetteMin, vignetteMax, smoothedSuspicion);
        chromAb.intensity.value = Mathf.Lerp(chromAbMin, chromAbMax, smoothedSuspicion);
        colorAdj.saturation.value = Mathf.Lerp(saturationMin, saturationMax, smoothedSuspicion);
        colorAdj.colorFilter.value = Color.Lerp(Color.white, new Color(0.85f, 0.9f, 1f), smoothedSuspicion);
    }
}
