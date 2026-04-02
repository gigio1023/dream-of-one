// Assets/Scripts/MVP/MVPAudioService.cs
using UnityEngine;
using UnityEngine.Audio;
using DreamOfOne.Core;

public class MVPAudioService : MonoBehaviour
{
    [Header("Mixer")]
    [SerializeField] AudioMixer mixer;
    [SerializeField] string tensionParameter = "BGMTensionBlend";

    [Header("Sources")]
    [SerializeField] AudioSource bgmPeaceful;
    [SerializeField] AudioSource bgmTense;
    [SerializeField] AudioSource ambientLoop;
    [SerializeField] AudioSource sfxOneShot;

    [Header("Suspicion Binding")]
    [SerializeField] FloatVariable suspicionLevel;

    [Header("Audio Clips")]
    [SerializeField] AudioClip ambientClip;
    [SerializeField] AudioClip bgmPeacefulClip;
    [SerializeField] AudioClip bgmTenseClip;
    [SerializeField] AudioClip doorChimeClip;
    [SerializeField] AudioClip scannerBeepClip;

    float currentTension;

    void Start()
    {
        if (ambientClip != null)
        {
            ambientLoop.clip = ambientClip;
            ambientLoop.loop = true;
            ambientLoop.Play();
        }
        if (bgmPeacefulClip != null)
        {
            bgmPeaceful.clip = bgmPeacefulClip;
            bgmPeaceful.loop = true;
            bgmPeaceful.Play();
        }
        if (bgmTenseClip != null)
        {
            bgmTense.clip = bgmTenseClip;
            bgmTense.loop = true;
            bgmTense.volume = 0f;
            bgmTense.Play();
        }
    }

    void OnEnable()
    {
        if (suspicionLevel != null) suspicionLevel.OnChanged += OnSuspicionChanged;
    }

    void OnDisable()
    {
        if (suspicionLevel != null) suspicionLevel.OnChanged -= OnSuspicionChanged;
    }

    void OnSuspicionChanged(float value) => currentTension = value;

    void Update()
    {
        if (bgmPeaceful != null && bgmTense != null)
        {
            bgmPeaceful.volume = Mathf.Lerp(bgmPeaceful.volume, 1f - currentTension, Time.deltaTime * 2f);
            bgmTense.volume = Mathf.Lerp(bgmTense.volume, currentTension, Time.deltaTime * 2f);
        }
        if (ambientLoop != null)
            ambientLoop.volume = Mathf.Lerp(ambientLoop.volume, 1f - currentTension * 0.6f, Time.deltaTime);
        if (mixer != null)
            mixer.SetFloat(tensionParameter, currentTension);
    }

    public void PlayDoorChime()
    {
        if (doorChimeClip != null) sfxOneShot.PlayOneShot(doorChimeClip);
    }

    public void PlayScannerBeep()
    {
        if (scannerBeepClip != null) sfxOneShot.PlayOneShot(scannerBeepClip);
    }

    public void PlaySFX(AudioClip clip, float volume = 1f)
    {
        if (clip != null) sfxOneShot.PlayOneShot(clip, volume);
    }
}
