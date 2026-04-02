# MVP Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the silent, minimal MVP_Store scene into a playtest-ready social-stealth demo with audio, NPC society simulation, diegetic suspicion feedback, and a 3-act session flow.

**Architecture:** Extend the existing MVP layer (global namespace) with new systems. Shared infrastructure (FloatVariable, event channels) goes in `DreamOfOne.Core`. All new gameplay files in `Assets/Scripts/MVP/`. Uses Unity AudioMixer (not FMOD) for simplicity. NPC behavior via simple FSM with NavMeshAgent. LLM prompt enrichment through ScriptableObject-defined NPC preoccupations.

**Tech Stack:** Unity 2022 LTS, URP 17.3.0, C#, NavMesh (com.unity.ai.navigation 2.0.12), Cinemachine 3.1.6, Input System 1.19.0, TextMeshPro, NUnit

**Spec:** `docs/superpowers/specs/2026-04-02-mvp-improvement-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `Assets/Scripts/Core/FloatVariable.cs` | Shared SO float with change event |
| `Assets/Scripts/Core/GameEventChannel.cs` | Generic SO event channel |
| `Assets/Scripts/MVP/DramaManager.cs` | 3-act session pacing + LLM tone injection |
| `Assets/Scripts/MVP/NPCPreoccupation.cs` | SO: NPC obsession topics |
| `Assets/Scripts/MVP/WorkStation.cs` | E-key cover work toggle |
| `Assets/Scripts/MVP/CoverWorkTracker.cs` | Suspicion modifier based on work state |
| `Assets/Scripts/MVP/SpeechBubbleUI.cs` | World-space NPC speech bubble |
| `Assets/Scripts/MVP/DialogueScheduler.cs` | NPC-NPC ambient dialogue cache + playback |
| `Assets/Scripts/MVP/NPCStateMachine.cs` | Simple FSM: Idle/Patrol/Talk/Work |
| `Assets/Scripts/MVP/MVPAudioService.cs` | AudioMixer-based ambient + SFX + suspicion-reactive BGM |
| `Assets/Scripts/MVP/SuspicionFeedback.cs` | URP post-processing diegetic effects |
| `Assets/Scripts/MVP/ResultScreenUI.cs` | End-of-session result display |
| `Assets/Tests/EditMode/FloatVariableTests.cs` | FloatVariable logic tests |
| `Assets/Tests/EditMode/DramaManagerTests.cs` | Act transition logic tests |
| `Assets/Tests/EditMode/NPCStateMachineTests.cs` | FSM state transition tests |
| `Assets/Tests/EditMode/CoverWorkTrackerTests.cs` | Suspicion modifier tests |
| `Assets/Tests/EditMode/DialogueSchedulerTests.cs` | Dialogue cache logic tests |

### Modified Files
| File | Change |
|------|--------|
| `Assets/Scripts/MVP/NPCInteraction.cs` | Inject preoccupation + drama tone into LLM prompt |
| `Assets/Scripts/MVP/SessionManager.cs` | Wire DramaManager, add result screen trigger |
| `Assets/Scripts/MVP/MVPBootstrap.cs` | Wire new systems on scene load |
| `Assets/Scripts/MVP/ConversationUI.cs` | (no changes needed — speech bubbles handled by DialogueScheduler) |

---

## Task 1: Shared ScriptableObject Infrastructure

**Files:**
- Create: `Assets/Scripts/Core/FloatVariable.cs`
- Create: `Assets/Scripts/Core/GameEventChannel.cs`
- Test: `Assets/Tests/EditMode/FloatVariableTests.cs`

- [ ] **Step 1: Write failing test for FloatVariable**

```csharp
// Assets/Tests/EditMode/FloatVariableTests.cs
using NUnit.Framework;
using UnityEngine;
using DreamOfOne.Core;

public class FloatVariableTests
{
    [Test]
    public void SetValue_RaisesOnChanged()
    {
        var fv = ScriptableObject.CreateInstance<FloatVariable>();
        float received = -1f;
        fv.OnChanged += v => received = v;

        fv.SetValue(0.5f);

        Assert.AreEqual(0.5f, received, 0.001f);
    }

    [Test]
    public void SetValue_ClampsTo01()
    {
        var fv = ScriptableObject.CreateInstance<FloatVariable>();
        fv.SetValue(1.5f);
        Assert.AreEqual(1f, fv.Value, 0.001f);

        fv.SetValue(-0.5f);
        Assert.AreEqual(0f, fv.Value, 0.001f);
    }

    [Test]
    public void SetValue_SameValue_DoesNotFire()
    {
        var fv = ScriptableObject.CreateInstance<FloatVariable>();
        fv.SetValue(0.3f);
        int callCount = 0;
        fv.OnChanged += _ => callCount++;

        fv.SetValue(0.3f);

        Assert.AreEqual(0, callCount);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: Unity Editor → Window → General → Test Runner → EditMode → Run All
Expected: FAIL — `FloatVariable` class not found

- [ ] **Step 3: Implement FloatVariable**

```csharp
// Assets/Scripts/Core/FloatVariable.cs
using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    [CreateAssetMenu(menuName = "DreamOfOne/Core/Float Variable")]
    public class FloatVariable : ScriptableObject
    {
        [SerializeField] float value;

        public float Value => value;
        public event Action<float> OnChanged;

        public void SetValue(float newValue)
        {
            newValue = Mathf.Clamp01(newValue);
            if (Mathf.Approximately(value, newValue)) return;
            value = newValue;
            OnChanged?.Invoke(value);
        }
    }
}
```

- [ ] **Step 4: Implement GameEventChannel**

```csharp
// Assets/Scripts/Core/GameEventChannel.cs
using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    [CreateAssetMenu(menuName = "DreamOfOne/Core/Game Event Channel")]
    public class GameEventChannel : ScriptableObject
    {
        public event Action OnRaised;
        public event Action<string> OnRaisedWithPayload;

        public void Raise() => OnRaised?.Invoke();
        public void Raise(string payload) => OnRaisedWithPayload?.Invoke(payload);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: Unity Editor → Test Runner → EditMode → FloatVariableTests
Expected: 3 tests PASS

- [ ] **Step 6: Create SO assets in project**

Create via Unity Editor (or RunCommand):
- `Assets/Resources/MVP/SuspicionLevel.asset` (FloatVariable, initial value 0)
- `Assets/Resources/MVP/DialogueEvent.asset` (GameEventChannel)
- `Assets/Resources/MVP/SuspicionEvent.asset` (GameEventChannel)

- [ ] **Step 7: Commit**

```bash
git add Assets/Scripts/Core/FloatVariable.cs Assets/Scripts/Core/GameEventChannel.cs Assets/Tests/EditMode/FloatVariableTests.cs
git commit -m "feat(core): add FloatVariable and GameEventChannel ScriptableObjects"
```

---

## Task 2: Drama Manager

**Files:**
- Create: `Assets/Scripts/MVP/DramaManager.cs`
- Test: `Assets/Tests/EditMode/DramaManagerTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// Assets/Tests/EditMode/DramaManagerTests.cs
using NUnit.Framework;

public class DramaManagerTests
{
    [Test]
    public void StartsAtActOne()
    {
        var dm = new DramaManagerLogic(actOneEnd: 180f, actTwoEnd: 480f, sessionEnd: 720f);
        Assert.AreEqual(DramaAct.Peace, dm.CurrentAct);
    }

    [Test]
    public void TransitionsToTension_AtActOneEnd()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        DramaAct? received = null;
        dm.OnActChanged += act => received = act;

        dm.Tick(181f);

        Assert.AreEqual(DramaAct.Tension, dm.CurrentAct);
        Assert.AreEqual(DramaAct.Tension, received);
    }

    [Test]
    public void TransitionsToResolution_AtActTwoEnd()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        dm.Tick(181f);
        dm.Tick(481f);
        Assert.AreEqual(DramaAct.Resolution, dm.CurrentAct);
    }

    [Test]
    public void GetToneDirective_ReturnsCorrectTone()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        Assert.IsTrue(dm.GetToneDirective().Contains("casual"));

        dm.Tick(181f);
        Assert.IsTrue(dm.GetToneDirective().Contains("suspicious"));

        dm.Tick(481f);
        Assert.IsTrue(dm.GetToneDirective().Contains("confrontational"));
    }

    [Test]
    public void NormalizedTime_CorrectWithinAct()
    {
        var dm = new DramaManagerLogic(180f, 480f, 720f);
        dm.Tick(90f);
        Assert.AreEqual(0.5f, dm.ActProgress, 0.01f);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — `DramaManagerLogic`, `DramaAct` not found

- [ ] **Step 3: Implement DramaManager**

```csharp
// Assets/Scripts/MVP/DramaManager.cs
using System;
using UnityEngine;

public enum DramaAct { Peace, Tension, Resolution }

/// <summary>
/// Pure logic class for testability. DramaManagerMB wraps this as MonoBehaviour.
/// </summary>
public class DramaManagerLogic
{
    readonly float actOneEnd;
    readonly float actTwoEnd;
    readonly float sessionEnd;

    float elapsed;
    DramaAct currentAct = DramaAct.Peace;

    public DramaAct CurrentAct => currentAct;
    public float Elapsed => elapsed;
    public float SessionEnd => sessionEnd;
    public event Action<DramaAct> OnActChanged;

    public float ActProgress
    {
        get
        {
            float actStart = currentAct switch
            {
                DramaAct.Peace => 0f,
                DramaAct.Tension => actOneEnd,
                DramaAct.Resolution => actTwoEnd,
                _ => 0f
            };
            float actEnd = currentAct switch
            {
                DramaAct.Peace => actOneEnd,
                DramaAct.Tension => actTwoEnd,
                DramaAct.Resolution => sessionEnd,
                _ => 1f
            };
            return Mathf.Clamp01((elapsed - actStart) / (actEnd - actStart));
        }
    }

    public DramaManagerLogic(float actOneEnd, float actTwoEnd, float sessionEnd)
    {
        this.actOneEnd = actOneEnd;
        this.actTwoEnd = actTwoEnd;
        this.sessionEnd = sessionEnd;
    }

    public void Tick(float totalElapsed)
    {
        elapsed = totalElapsed;
        DramaAct newAct;
        if (elapsed < actOneEnd) newAct = DramaAct.Peace;
        else if (elapsed < actTwoEnd) newAct = DramaAct.Tension;
        else newAct = DramaAct.Resolution;

        if (newAct != currentAct)
        {
            currentAct = newAct;
            OnActChanged?.Invoke(currentAct);
        }
    }

    public string GetToneDirective()
    {
        return currentAct switch
        {
            DramaAct.Peace => "[TONE: casual, friendly. Greet the player warmly. Stick to small talk.]",
            DramaAct.Tension => "[TONE: suspicious, probing. Mention odd things you noticed. Ask pointed questions.]",
            DramaAct.Resolution => "[TONE: confrontational or relieved depending on suspicion. Be direct.]",
            _ => ""
        };
    }
}

/// <summary>
/// MonoBehaviour wrapper. Place on a scene GameObject.
/// </summary>
public class DramaManagerMB : MonoBehaviour
{
    [SerializeField] float actOneEndSeconds = 180f;
    [SerializeField] float actTwoEndSeconds = 480f;
    [SerializeField] float sessionEndSeconds = 720f;

    DramaManagerLogic logic;
    float startTime;

    public DramaManagerLogic Logic => logic;

    void Awake()
    {
        logic = new DramaManagerLogic(actOneEndSeconds, actTwoEndSeconds, sessionEndSeconds);
    }

    void Start()
    {
        startTime = Time.time;
    }

    void Update()
    {
        if (GameStateManager.CurrentState == GameState.GameOver) return;
        logic.Tick(Time.time - startTime);
    }
}
```

- [ ] **Step 4: Run tests**

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/MVP/DramaManager.cs Assets/Tests/EditMode/DramaManagerTests.cs
git commit -m "feat(mvp): add DramaManager with 3-act session pacing"
```

---

## Task 3: NPC Preoccupation System

**Files:**
- Create: `Assets/Scripts/MVP/NPCPreoccupation.cs`
- Modify: `Assets/Scripts/MVP/NPCInteraction.cs`

- [ ] **Step 1: Create NPCPreoccupation ScriptableObject**

```csharp
// Assets/Scripts/MVP/NPCPreoccupation.cs
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
```

- [ ] **Step 2: Read NPCInteraction.cs current prompt building**

Read: `Assets/Scripts/MVP/NPCInteraction.cs` — locate `BuildPrompt` or the string where the LLM prompt is assembled.

- [ ] **Step 3: Modify NPCInteraction to inject preoccupation + drama tone**

Add fields and update prompt:

```csharp
// In NPCInteraction.cs — add serialized fields:
[SerializeField] NPCPreoccupation preoccupation;

// In the prompt building section (ProcessPlayerMessage or equivalent),
// insert preoccupation and drama tone before the existing prompt:
string preoccupationBlock = preoccupation != null ? preoccupation.ToPromptBlock() : "";
DramaManagerMB drama = FindFirstObjectByType<DramaManagerMB>();
string toneDirective = drama != null ? drama.Logic.GetToneDirective() : "";

// Prepend to existing prompt:
string enrichedPrompt = $"{preoccupationBlock}\n{toneDirective}\n{existingPrompt}";
```

The exact edit depends on the current prompt structure — read the file and insert at the prompt assembly point.

- [ ] **Step 4: Create 3 preoccupation SO assets**

Create in Unity Editor:
- `Assets/Resources/MVP/Preoccupation_Coworker.asset` — role: "store clerk", topics: ["night shifts are exhausting", "boss watches CCTV"]
- `Assets/Resources/MVP/Preoccupation_Regular.asset` — role: "regular customer", topics: ["neighborhood redevelopment rumors", "that strange person yesterday"]
- `Assets/Resources/MVP/Preoccupation_Delivery.asset` — role: "delivery driver", topics: ["how many deliveries left today", "that rude shop owner nearby"]

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/MVP/NPCPreoccupation.cs Assets/Scripts/MVP/NPCInteraction.cs
git commit -m "feat(mvp): add NPC preoccupation system for LLM prompt enrichment"
```

---

## Task 4: Player Cover Work

**Files:**
- Create: `Assets/Scripts/MVP/WorkStation.cs`
- Create: `Assets/Scripts/MVP/CoverWorkTracker.cs`
- Test: `Assets/Tests/EditMode/CoverWorkTrackerTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// Assets/Tests/EditMode/CoverWorkTrackerTests.cs
using NUnit.Framework;

public class CoverWorkTrackerTests
{
    [Test]
    public void IsWorking_True_ReturnsBonusDecay()
    {
        var tracker = new CoverWorkLogic(bonusDecay: -0.5f, idlePenalty: 0.2f);
        tracker.SetWorking(true);
        Assert.AreEqual(-0.5f, tracker.GetSuspicionModifier(), 0.001f);
    }

    [Test]
    public void IsWorking_False_ReturnsPenalty()
    {
        var tracker = new CoverWorkLogic(bonusDecay: -0.5f, idlePenalty: 0.2f);
        tracker.SetWorking(false);
        Assert.AreEqual(0.2f, tracker.GetSuspicionModifier(), 0.001f);
    }

    [Test]
    public void ToggleWork_SwitchesState()
    {
        var tracker = new CoverWorkLogic(-0.5f, 0.2f);
        Assert.IsFalse(tracker.IsWorking);
        tracker.SetWorking(true);
        Assert.IsTrue(tracker.IsWorking);
    }
}
```

- [ ] **Step 2: Run tests — verify fail**

Expected: FAIL — `CoverWorkLogic` not found

- [ ] **Step 3: Implement CoverWorkTracker**

```csharp
// Assets/Scripts/MVP/CoverWorkTracker.cs
using UnityEngine;

/// <summary>Pure logic for testability.</summary>
public class CoverWorkLogic
{
    readonly float bonusDecay;
    readonly float idlePenalty;

    public bool IsWorking { get; private set; }

    public CoverWorkLogic(float bonusDecay, float idlePenalty)
    {
        this.bonusDecay = bonusDecay;
        this.idlePenalty = idlePenalty;
    }

    public void SetWorking(bool working) => IsWorking = working;

    public float GetSuspicionModifier() => IsWorking ? bonusDecay : idlePenalty;
}

/// <summary>
/// Applies suspicion modifier per-frame based on whether player is at a WorkStation.
/// </summary>
public class CoverWorkTracker : MonoBehaviour
{
    [SerializeField] float bonusDecayPerSecond = -0.5f;
    [SerializeField] float idlePenaltyPerSecond = 0.2f;

    CoverWorkLogic logic;
    public CoverWorkLogic Logic => logic;

    void Awake()
    {
        logic = new CoverWorkLogic(bonusDecayPerSecond, idlePenaltyPerSecond);
    }

    void Update()
    {
        if (GameStateManager.CurrentState != GameState.Roaming) return;

        // Apply modifier to all nearby NPC suspicion components
        float mod = logic.GetSuspicionModifier() * Time.deltaTime;
        if (Mathf.Approximately(mod, 0f)) return;

        var npcs = FindObjectsByType<DreamOfOne.NPC.SuspicionComponent>(FindObjectsSortMode.None);
        foreach (var npc in npcs)
        {
            npc.AddSuspicion(mod, logic.IsWorking ? "cover_work" : "idle_wander", "");
        }
    }
}
```

- [ ] **Step 4: Implement WorkStation**

```csharp
// Assets/Scripts/MVP/WorkStation.cs
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

/// <summary>
/// Place on a GameObject in the scene. Player presses E nearby to toggle "working" state.
/// </summary>
public class WorkStation : MonoBehaviour
{
    [SerializeField] float interactionRange = 2.5f;
    [SerializeField] string stationLabel = "work here";

    CoverWorkTracker tracker;
    Transform playerTransform;
    bool isPlayerNearby;

    void Start()
    {
        tracker = FindFirstObjectByType<CoverWorkTracker>();
        var player = FindFirstObjectByType<DreamOfOne.Core.PlayerController>();
        if (player != null) playerTransform = player.transform;
    }

    void Update()
    {
        if (playerTransform == null || tracker == null) return;

        float dist = Vector3.Distance(transform.position, playerTransform.position);
        isPlayerNearby = dist <= interactionRange;

        if (!isPlayerNearby)
        {
            if (tracker.Logic.IsWorking)
                tracker.Logic.SetWorking(false);
            return;
        }

        bool pressed = false;
#if ENABLE_INPUT_SYSTEM
        pressed = Keyboard.current != null && Keyboard.current.eKey.wasPressedThisFrame;
#else
        pressed = Input.GetKeyDown(KeyCode.E);
#endif

        if (pressed && GameStateManager.CurrentState == GameState.Roaming)
        {
            tracker.Logic.SetWorking(!tracker.Logic.IsWorking);
        }
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.green;
        Gizmos.DrawWireSphere(transform.position, interactionRange);
    }
}
```

- [ ] **Step 5: Run tests**

Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add Assets/Scripts/MVP/WorkStation.cs Assets/Scripts/MVP/CoverWorkTracker.cs Assets/Tests/EditMode/CoverWorkTrackerTests.cs
git commit -m "feat(mvp): add WorkStation and CoverWorkTracker for player cover work"
```

---

## Task 5: Speech Bubble UI

**Files:**
- Create: `Assets/Scripts/MVP/SpeechBubbleUI.cs`

- [ ] **Step 1: Implement SpeechBubbleUI**

```csharp
// Assets/Scripts/MVP/SpeechBubbleUI.cs
using UnityEngine;
using TMPro;

/// <summary>
/// Attach to NPC. Creates a world-space speech bubble above the NPC's head.
/// Call Show(text, duration) to display, auto-hides after duration.
/// Fades with distance from player.
/// </summary>
public class SpeechBubbleUI : MonoBehaviour
{
    [SerializeField] Vector3 offset = new(0f, 2.2f, 0f);
    [SerializeField] float maxVisibleDistance = 8f;
    [SerializeField] float fadeStartDistance = 5f;

    Canvas canvas;
    CanvasGroup canvasGroup;
    TextMeshProUGUI textComponent;
    RectTransform bubbleRect;
    Transform playerTransform;

    float hideTime;
    bool isShowing;

    void Awake()
    {
        CreateBubble();
        Hide();
    }

    void Start()
    {
        var player = FindFirstObjectByType<DreamOfOne.Core.PlayerController>();
        if (player != null) playerTransform = player.transform;
    }

    void CreateBubble()
    {
        var go = new GameObject("SpeechBubble");
        go.transform.SetParent(transform);
        go.transform.localPosition = offset;

        canvas = go.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.WorldSpace;
        canvas.sortingOrder = 100;

        canvasGroup = go.AddComponent<CanvasGroup>();

        var rt = canvas.GetComponent<RectTransform>();
        rt.sizeDelta = new Vector2(2f, 0.5f);
        rt.localScale = Vector3.one * 0.01f;

        var textGo = new GameObject("Text");
        textGo.transform.SetParent(go.transform, false);
        bubbleRect = textGo.AddComponent<RectTransform>();
        bubbleRect.sizeDelta = new Vector2(200f, 50f);

        textComponent = textGo.AddComponent<TextMeshProUGUI>();
        textComponent.fontSize = 24;
        textComponent.alignment = TextAlignmentOptions.Center;
        textComponent.enableWordWrapping = true;
        textComponent.color = Color.white;
    }

    void Update()
    {
        if (!isShowing) return;

        if (Time.time >= hideTime)
        {
            Hide();
            return;
        }

        // Face camera
        if (Camera.main != null)
            canvas.transform.forward = Camera.main.transform.forward;

        // Distance-based fade
        if (playerTransform != null)
        {
            float dist = Vector3.Distance(transform.position, playerTransform.position);
            if (dist > maxVisibleDistance)
                canvasGroup.alpha = 0f;
            else if (dist > fadeStartDistance)
                canvasGroup.alpha = 1f - (dist - fadeStartDistance) / (maxVisibleDistance - fadeStartDistance);
            else
                canvasGroup.alpha = 1f;
        }
    }

    public void Show(string text, float duration = 4f)
    {
        textComponent.text = text;
        hideTime = Time.time + duration;
        isShowing = true;
        canvas.gameObject.SetActive(true);
    }

    public void Hide()
    {
        isShowing = false;
        if (canvas != null) canvas.gameObject.SetActive(false);
    }
}
```

- [ ] **Step 2: Manual verification**

In MVP_Store scene:
1. Add `SpeechBubbleUI` component to an NPC GameObject
2. Enter Play mode
3. Call `speechBubble.Show("test", 5f)` from inspector or temp script
4. Verify: bubble appears above NPC, faces camera, fades with distance

- [ ] **Step 3: Commit**

```bash
git add Assets/Scripts/MVP/SpeechBubbleUI.cs
git commit -m "feat(mvp): add world-space speech bubble UI for NPC dialogue"
```

---

## Task 6: NPC-NPC Dialogue Scheduler

**Files:**
- Create: `Assets/Scripts/MVP/DialogueScheduler.cs`
- Test: `Assets/Tests/EditMode/DialogueSchedulerTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// Assets/Tests/EditMode/DialogueSchedulerTests.cs
using NUnit.Framework;
using System.Collections.Generic;

public class DialogueSchedulerTests
{
    [Test]
    public void AddCachedDialogue_StoresCorrectly()
    {
        var cache = new DialogueCache();
        var lines = new List<DialogueLine>
        {
            new("Kim", "Delivery was late again."),
            new("Park", "Always late on Mondays.")
        };
        cache.Add("kim_park_01", lines);

        Assert.IsTrue(cache.HasDialogue("kim_park_01"));
        Assert.AreEqual(2, cache.Get("kim_park_01").Count);
    }

    [Test]
    public void GetRandom_ReturnsDialogue_WhenAvailable()
    {
        var cache = new DialogueCache();
        cache.Add("pair_01", new List<DialogueLine> { new("A", "Hello") });
        cache.Add("pair_02", new List<DialogueLine> { new("B", "World") });

        var result = cache.GetRandom();
        Assert.IsNotNull(result);
        Assert.AreEqual(1, result.Count);
    }

    [Test]
    public void GetRandom_ReturnsNull_WhenEmpty()
    {
        var cache = new DialogueCache();
        Assert.IsNull(cache.GetRandom());
    }
}

```

Note: `DialogueLine` struct is defined in `DialogueScheduler.cs` (Step 3). Tests reference it from there.

- [ ] **Step 2: Run tests — verify fail**

Expected: FAIL — `DialogueCache` not found

- [ ] **Step 3: Implement DialogueScheduler**

```csharp
// Assets/Scripts/MVP/DialogueScheduler.cs
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public struct DialogueLine
{
    public string Speaker;
    public string Text;

    public DialogueLine(string speaker, string text)
    {
        Speaker = speaker;
        Text = text;
    }
}

/// <summary>Pure data cache, testable without MonoBehaviour.</summary>
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

    public List<DialogueLine> Get(string id) =>
        cache.TryGetValue(id, out var lines) ? lines : null;

    public List<DialogueLine> GetRandom()
    {
        if (keys.Count == 0) return null;
        string key = keys[UnityEngine.Random.Range(0, keys.Count)];
        return cache[key];
    }

    public int Count => keys.Count;
}

/// <summary>
/// Schedules NPC-NPC ambient dialogue. Pre-generates via LLM when player is far.
/// Plays back cached conversations via SpeechBubbleUI when player approaches.
/// </summary>
public class DialogueScheduler : MonoBehaviour
{
    [SerializeField] float generateInterval = 30f;
    [SerializeField] float playbackInterval = 15f;
    [SerializeField] float playerProximityThreshold = 12f;
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
    Transform playerTransform;
    float lastGenerateTime;
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
        var player = FindFirstObjectByType<DreamOfOne.Core.PlayerController>();
        if (player != null) playerTransform = player.transform;
    }

    void PreloadFallbacks()
    {
        for (int i = 0; i < fallbackDialogues.Length; i++)
        {
            var lines = ParseDialogue(fallbackDialogues[i]);
            cache.Add($"fallback_{i}", lines);
        }
    }

    void Update()
    {
        if (playerTransform == null || bubbles.Length < 2) return;

        // Playback: show cached dialogue on nearby NPCs
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
            float delay = i * 3f; // 3 seconds between lines
            var bubble = bubbles[i];
            var line = dialogue[i];
            StartCoroutine(ShowDelayed(bubble, line.Text, delay));
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
```

- [ ] **Step 4: Run tests**

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/MVP/DialogueScheduler.cs Assets/Tests/EditMode/DialogueSchedulerTests.cs
git commit -m "feat(mvp): add DialogueScheduler for NPC-NPC ambient conversation"
```

---

## Task 7: NPC Behavior FSM

**Files:**
- Create: `Assets/Scripts/MVP/NPCStateMachine.cs`
- Test: `Assets/Tests/EditMode/NPCStateMachineTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// Assets/Tests/EditMode/NPCStateMachineTests.cs
using NUnit.Framework;

public class NPCStateMachineTests
{
    class CountingState : INPCState
    {
        public int EnterCount;
        public int ExecuteCount;
        public int ExitCount;
        public void Enter() => EnterCount++;
        public void Execute(float dt) => ExecuteCount++;
        public void Exit() => ExitCount++;
    }

    [Test]
    public void ChangeState_CallsEnterOnNew()
    {
        var fsm = new SimpleStateMachine();
        var state = new CountingState();
        fsm.ChangeState(state);
        Assert.AreEqual(1, state.EnterCount);
    }

    [Test]
    public void ChangeState_CallsExitOnPrevious()
    {
        var fsm = new SimpleStateMachine();
        var first = new CountingState();
        var second = new CountingState();
        fsm.ChangeState(first);
        fsm.ChangeState(second);
        Assert.AreEqual(1, first.ExitCount);
    }

    [Test]
    public void Update_CallsExecuteOnCurrent()
    {
        var fsm = new SimpleStateMachine();
        var state = new CountingState();
        fsm.ChangeState(state);
        fsm.Update(0.016f);
        fsm.Update(0.016f);
        Assert.AreEqual(2, state.ExecuteCount);
    }

    [Test]
    public void ChangeState_ToSame_DoesNothing()
    {
        var fsm = new SimpleStateMachine();
        var state = new CountingState();
        fsm.ChangeState(state);
        fsm.ChangeState(state);
        Assert.AreEqual(1, state.EnterCount);
        Assert.AreEqual(0, state.ExitCount);
    }
}
```

- [ ] **Step 2: Run tests — verify fail**

Expected: FAIL — `INPCState`, `SimpleStateMachine` not found

- [ ] **Step 3: Implement NPCStateMachine**

```csharp
// Assets/Scripts/MVP/NPCStateMachine.cs
using UnityEngine;
using UnityEngine.AI;

public interface INPCState
{
    void Enter();
    void Execute(float dt);
    void Exit();
}

public class SimpleStateMachine
{
    INPCState current;
    public INPCState Current => current;

    public void ChangeState(INPCState next)
    {
        if (next == current) return;
        current?.Exit();
        current = next;
        current?.Enter();
    }

    public void Update(float dt) => current?.Execute(dt);
}

// --- Concrete states ---

public class NPCIdleState : INPCState
{
    readonly float duration;
    float elapsed;
    public bool Finished => elapsed >= duration;

    public NPCIdleState(float duration = 3f) { this.duration = duration; }
    public void Enter() => elapsed = 0f;
    public void Execute(float dt) => elapsed += dt;
    public void Exit() { }
}

public class NPCPatrolState : INPCState
{
    readonly NavMeshAgent agent;
    readonly Transform[] waypoints;
    int index;

    public NPCPatrolState(NavMeshAgent agent, Transform[] waypoints)
    {
        this.agent = agent;
        this.waypoints = waypoints;
    }

    public void Enter()
    {
        if (waypoints.Length == 0) return;
        agent.isStopped = false;
        agent.SetDestination(waypoints[index].position);
    }

    public void Execute(float dt)
    {
        if (waypoints.Length == 0) return;
        if (!agent.pathPending && agent.remainingDistance < 0.5f)
        {
            index = (index + 1) % waypoints.Length;
            agent.SetDestination(waypoints[index].position);
        }
    }

    public void Exit() => agent.isStopped = true;
}

public class NPCTalkState : INPCState
{
    readonly float duration;
    float elapsed;
    public bool Finished => elapsed >= duration;

    public NPCTalkState(float duration = 6f) { this.duration = duration; }
    public void Enter() => elapsed = 0f;
    public void Execute(float dt) => elapsed += dt;
    public void Exit() { }
}

public class NPCWorkState : INPCState
{
    readonly float duration;
    float elapsed;
    public bool Finished => elapsed >= duration;

    public NPCWorkState(float duration = 10f) { this.duration = duration; }
    public void Enter() => elapsed = 0f;
    public void Execute(float dt) => elapsed += dt;
    public void Exit() { }
}

/// <summary>
/// MonoBehaviour that drives an NPC through Idle → Patrol → Talk → Work cycle.
/// Attach to NPC with NavMeshAgent.
/// </summary>
[RequireComponent(typeof(NavMeshAgent))]
public class NPCBehavior : MonoBehaviour
{
    [SerializeField] Transform[] waypoints;
    [SerializeField] float idleDuration = 3f;
    [SerializeField] float talkDuration = 6f;
    [SerializeField] float workDuration = 10f;

    SimpleStateMachine fsm;
    NavMeshAgent agent;

    NPCIdleState idleState;
    NPCPatrolState patrolState;
    NPCTalkState talkState;
    NPCWorkState workState;

    void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        fsm = new SimpleStateMachine();

        idleState = new NPCIdleState(idleDuration);
        patrolState = new NPCPatrolState(agent, waypoints);
        talkState = new NPCTalkState(talkDuration);
        workState = new NPCWorkState(workDuration);

        fsm.ChangeState(idleState);
    }

    void Update()
    {
        fsm.Update(Time.deltaTime);

        // Simple round-robin transitions
        if (fsm.Current == idleState && idleState.Finished)
            fsm.ChangeState(patrolState);
        else if (fsm.Current == patrolState && !agent.pathPending && agent.remainingDistance < 0.5f)
            fsm.ChangeState(workState);
        else if (fsm.Current == workState && workState.Finished)
            fsm.ChangeState(idleState);
    }

    /// <summary>Called by DialogueScheduler to make NPC enter talk state.</summary>
    public void EnterTalkState()
    {
        fsm.ChangeState(talkState);
    }

    /// <summary>Called when talk is done.</summary>
    public void ExitTalkState()
    {
        fsm.ChangeState(idleState);
    }
}
```

- [ ] **Step 4: Run tests**

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/MVP/NPCStateMachine.cs Assets/Tests/EditMode/NPCStateMachineTests.cs
git commit -m "feat(mvp): add NPC behavior FSM with Idle/Patrol/Talk/Work states"
```

---

## Task 8: Audio System

**Files:**
- Create: `Assets/Scripts/MVP/MVPAudioService.cs`

- [ ] **Step 1: Create AudioMixer asset**

In Unity Editor:
1. Create → AudioMixer: `Assets/Audio/MVPMixer.mixer`
2. Create groups: `Master` → `BGM`, `SFX`, `Ambient`
3. On `BGM` group, expose parameter `BGMTensionBlend` (float 0-1)
4. Create 2 snapshots: `Peaceful` (tension=0) and `Tense` (tension=1)

- [ ] **Step 2: Implement MVPAudioService**

```csharp
// Assets/Scripts/MVP/MVPAudioService.cs
using UnityEngine;
using UnityEngine.Audio;
using DreamOfOne.Core;

/// <summary>
/// Manages ambient loops, SFX, and suspicion-reactive BGM via AudioMixer.
/// </summary>
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
        if (suspicionLevel != null)
            suspicionLevel.OnChanged += OnSuspicionChanged;
    }

    void OnDisable()
    {
        if (suspicionLevel != null)
            suspicionLevel.OnChanged -= OnSuspicionChanged;
    }

    void OnSuspicionChanged(float value)
    {
        currentTension = value;
    }

    void Update()
    {
        // Smooth crossfade between peaceful and tense BGM
        if (bgmPeaceful != null && bgmTense != null)
        {
            bgmPeaceful.volume = Mathf.Lerp(bgmPeaceful.volume, 1f - currentTension, Time.deltaTime * 2f);
            bgmTense.volume = Mathf.Lerp(bgmTense.volume, currentTension, Time.deltaTime * 2f);
        }

        // Ambient volume drops as tension rises (crowd goes quiet)
        if (ambientLoop != null)
        {
            ambientLoop.volume = Mathf.Lerp(ambientLoop.volume, 1f - currentTension * 0.6f, Time.deltaTime);
        }

        // Mixer parameter
        if (mixer != null)
        {
            mixer.SetFloat(tensionParameter, currentTension);
        }
    }

    public void PlayDoorChime()
    {
        if (doorChimeClip != null)
            sfxOneShot.PlayOneShot(doorChimeClip);
    }

    public void PlayScannerBeep()
    {
        if (scannerBeepClip != null)
            sfxOneShot.PlayOneShot(scannerBeepClip);
    }

    public void PlaySFX(AudioClip clip, float volume = 1f)
    {
        if (clip != null)
            sfxOneShot.PlayOneShot(clip, volume);
    }
}
```

- [ ] **Step 3: Wire suspicion to FloatVariable**

In `Assets/Scripts/MVP/MVPBootstrap.cs`, add a bridge that writes `GlobalSuspicionSystem.OnGlobalSuspicionChanged` to the `FloatVariable`:

```csharp
// Add to MVPBootstrap.Awake() or Start():
var suspicionVar = Resources.Load<FloatVariable>("MVP/SuspicionLevel");
var globalSuspicion = FindFirstObjectByType<DreamOfOne.Core.GlobalSuspicionSystem>();
if (suspicionVar != null && globalSuspicion != null)
{
    globalSuspicion.OnGlobalSuspicionChanged += v => suspicionVar.SetValue(v);
}
```

- [ ] **Step 4: Manual verification**

1. Import placeholder audio clips (any .wav/.ogg) into `Assets/Audio/`
2. Set up MVPAudioService in scene with AudioSources
3. Play mode → verify ambient plays, BGM crossfades when suspicion changes

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/MVP/MVPAudioService.cs
git commit -m "feat(mvp): add AudioMixer-based audio service with suspicion-reactive BGM"
```

---

## Task 9: Suspicion Diegetic Feedback

**Files:**
- Create: `Assets/Scripts/MVP/SuspicionFeedback.cs`

- [ ] **Step 1: Implement SuspicionFeedback**

```csharp
// Assets/Scripts/MVP/SuspicionFeedback.cs
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using DreamOfOne.Core;

/// <summary>
/// Drives URP post-processing effects based on suspicion level.
/// Attach to a GameObject with a Volume component (global).
/// </summary>
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
        {
            vignette = volume.profile.Add<Vignette>();
        }
        if (!volume.profile.TryGet(out chromAb))
        {
            chromAb = volume.profile.Add<ChromaticAberration>();
        }
        if (!volume.profile.TryGet(out colorAdj))
        {
            colorAdj = volume.profile.Add<ColorAdjustments>();
        }

        vignette.active = true;
        chromAb.active = true;
        colorAdj.active = true;
    }

    void OnEnable()
    {
        if (suspicionLevel != null)
            suspicionLevel.OnChanged += OnSuspicionChanged;
    }

    void OnDisable()
    {
        if (suspicionLevel != null)
            suspicionLevel.OnChanged -= OnSuspicionChanged;
    }

    void OnSuspicionChanged(float value)
    {
        currentSuspicion = value;
    }

    void Update()
    {
        // Smooth interpolation to avoid jarring changes
        smoothedSuspicion = Mathf.Lerp(smoothedSuspicion, currentSuspicion, Time.deltaTime * 3f);

        vignette.intensity.value = Mathf.Lerp(vignetteMin, vignetteMax, smoothedSuspicion);
        chromAb.intensity.value = Mathf.Lerp(chromAbMin, chromAbMax, smoothedSuspicion);
        colorAdj.saturation.value = Mathf.Lerp(saturationMin, saturationMax, smoothedSuspicion);
        colorAdj.colorFilter.value = Color.Lerp(Color.white,
            new Color(0.85f, 0.9f, 1f), smoothedSuspicion); // Cool tint
    }
}
```

- [ ] **Step 2: Create Volume Profile**

In Unity Editor:
1. Create → Volume Profile: `Assets/Settings/SuspicionVolumeProfile.asset`
2. Add overrides: Vignette, Chromatic Aberration, Color Adjustments
3. In MVP_Store scene, create GameObject "SuspicionVolume" with Global Volume component
4. Assign the profile and `SuspicionFeedback` script
5. Wire `SuspicionLevel` FloatVariable SO reference

- [ ] **Step 3: Manual verification**

1. Play mode
2. Artificially set suspicion via inspector on FloatVariable SO
3. Verify: vignette increases, color cools, chromatic aberration at high levels

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/MVP/SuspicionFeedback.cs
git commit -m "feat(mvp): add diegetic suspicion feedback via URP post-processing"
```

---

## Task 10: Session Flow + Result Screen

**Files:**
- Create: `Assets/Scripts/MVP/ResultScreenUI.cs`
- Modify: `Assets/Scripts/MVP/SessionManager.cs`

- [ ] **Step 1: Implement ResultScreenUI**

```csharp
// Assets/Scripts/MVP/ResultScreenUI.cs
using UnityEngine;
using TMPro;

/// <summary>
/// Full-screen result display. Shows "Survived" or "Exposed" with session stats.
/// </summary>
public class ResultScreenUI : MonoBehaviour
{
    [SerializeField] GameObject panel;
    [SerializeField] TextMeshProUGUI titleText;
    [SerializeField] TextMeshProUGUI bodyText;

    void Awake()
    {
        if (panel != null) panel.SetActive(false);
    }

    public void ShowSurvived(float elapsedTime)
    {
        titleText.text = "무사히 하루를 마침";
        bodyText.text = $"근무 시간: {FormatTime(elapsedTime)}\n의심 없이 통과했습니다.";
        panel.SetActive(true);
        GameStateManager.SetState(GameState.GameOver);
    }

    public void ShowExposed(float elapsedTime, float suspicion)
    {
        titleText.text = "정체가 발각됨";
        bodyText.text = $"근무 시간: {FormatTime(elapsedTime)}\n최종 의심도: {suspicion:P0}";
        panel.SetActive(true);
        GameStateManager.SetState(GameState.GameOver);
    }

    string FormatTime(float seconds)
    {
        int min = Mathf.FloorToInt(seconds / 60f);
        int sec = Mathf.FloorToInt(seconds % 60f);
        return $"{min}분 {sec}초";
    }
}
```

- [ ] **Step 2: Read current SessionManager**

Read: `Assets/Scripts/MVP/SessionManager.cs` — understand current timer and lose condition logic.

- [ ] **Step 3: Modify SessionManager to wire DramaManager + ResultScreen**

```csharp
// In SessionManager.cs, add fields:
[SerializeField] ResultScreenUI resultScreen;

DramaManagerMB dramaManager;

// In Start():
dramaManager = FindFirstObjectByType<DramaManagerMB>();
if (dramaManager != null)
{
    dramaManager.Logic.OnActChanged += OnActChanged;
}

// Add method:
void OnActChanged(DramaAct act)
{
    if (act == DramaAct.Resolution)
    {
        // Check final suspicion after a short delay
        StartCoroutine(ResolveSession());
    }
}

IEnumerator ResolveSession()
{
    // Give resolution act some time to play out
    yield return new WaitForSeconds(30f);

    if (GameStateManager.CurrentState == GameState.GameOver) yield break;

    var globalSuspicion = FindFirstObjectByType<DreamOfOne.Core.GlobalSuspicionSystem>();
    float g = globalSuspicion != null ? globalSuspicion.GlobalSuspicion : 0f;
    float elapsed = dramaManager.Logic.Elapsed;

    if (g < 0.3f)
        resultScreen.ShowSurvived(elapsed);
    else
        resultScreen.ShowExposed(elapsed, g);
}
```

In the existing `CheckLoseCondition()` method, replace the direct `GameStateManager.SetState(GameState.GameOver)` call with `resultScreen.ShowExposed(elapsed, g)` which sets GameOver internally.

- [ ] **Step 4: Manual verification**

1. Play mode with DramaManager configured (180s/480s/720s)
2. Wait for act transitions (or temporarily shorten to 10s/20s/30s for testing)
3. Verify result screen appears at session end

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/MVP/ResultScreenUI.cs Assets/Scripts/MVP/SessionManager.cs
git commit -m "feat(mvp): add result screen and wire DramaManager to session flow"
```

---

## Task 11: Bootstrap Wiring

**Files:**
- Modify: `Assets/Scripts/MVP/MVPBootstrap.cs`

- [ ] **Step 1: Read current MVPBootstrap.cs**

Read: `Assets/Scripts/MVP/MVPBootstrap.cs` — understand current FindOrCreate pattern.

- [ ] **Step 2: Add new system wiring**

```csharp
// In MVPBootstrap.Awake() — add after existing systems:

// Drama Manager
FindOrCreate<DramaManagerMB>();

// Cover Work
FindOrCreate<CoverWorkTracker>();

// Dialogue Scheduler
FindOrCreate<DialogueScheduler>();

// Audio Service (requires manual AudioSource setup in scene)
FindOrCreate<MVPAudioService>();

// Suspicion FloatVariable bridge
var suspicionVar = Resources.Load<FloatVariable>("MVP/SuspicionLevel");
var globalSuspicion = FindFirstObjectByType<DreamOfOne.Core.GlobalSuspicionSystem>();
if (suspicionVar != null && globalSuspicion != null)
{
    globalSuspicion.OnGlobalSuspicionChanged += v => suspicionVar.SetValue(v);
}
```

- [ ] **Step 3: Manual verification**

1. Play mode in MVP_Store scene
2. Check console: no missing component errors
3. Verify all systems created (inspector → hierarchy)

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/MVP/MVPBootstrap.cs
git commit -m "feat(mvp): wire new systems in MVPBootstrap"
```

---

## Task 12: Scene Assembly + Audio Import

**Files:**
- Scene: `Assets/Scenes/MVP_Store.unity`
- Assets: `Assets/Audio/` (new directory)

- [ ] **Step 1: Download and import free audio assets**

From Freesound.org (CC-BY or CC0):
1. Search "refrigerator hum loop" → download 1 clip → `Assets/Audio/Ambient/fridge_hum.ogg`
2. Search "store door chime" → download 1 clip → `Assets/Audio/SFX/door_chime.ogg`
3. Search "footsteps indoor tile" → download 1 clip → `Assets/Audio/SFX/footsteps_tile.ogg`
4. Search "barcode scanner beep" → download 1 clip → `Assets/Audio/SFX/scanner_beep.ogg`

From FreePD.com:
5. Browse "Eerie" → download 1 ambient track → `Assets/Audio/BGM/peaceful.ogg`
6. Browse "Ambient" → download 1 tense track → `Assets/Audio/BGM/tense.ogg`

Import all into Unity. Set audio import settings:
- Ambient/BGM: Load In Background, Streaming, Vorbis
- SFX: Decompress On Load, PCM

- [ ] **Step 2: Download and import free 3D props**

From kenney.nl (CC0):
1. Download "Furniture Kit" → import shelf, counter, table models → `Assets/Models/Kenney/`
2. Download "Food Kit" → import bottle, can, box models → `Assets/Models/Kenney/`

From quaternius.com (CC0):
3. Download "Ultimate Food Pack" → import additional props → `Assets/Models/Quaternius/`

- [ ] **Step 3: Download NPC animations from Mixamo**

1. Go to mixamo.com
2. Download as FBX (Without Skin):
   - Idle_Breathing.fbx
   - Idle_LookAround.fbx
   - Walking.fbx
   - Talking_Gesture_01.fbx
   - Talking_Gesture_02.fbx
   - Reaching.fbx
3. Import to `Assets/Animations/Mixamo/`
4. Set rig to Humanoid, configure avatar

- [ ] **Step 4: Dress the MVP_Store scene**

Using Unity Editor (or MCP RunCommand):
1. Place WorkStation markers at 2-3 positions (behind counter, near shelves)
2. Add Kenney props to shelves and counter
3. Add NavMeshSurface to floor → bake NavMesh
4. Set up NPC GameObjects with: NavMeshAgent, NPCBehavior, SpeechBubbleUI, NPCInteraction, SuspicionComponent
5. Assign NPCPreoccupation SOs to each NPC
6. Set up waypoints for each NPC
7. Add DramaManager, CoverWorkTracker, DialogueScheduler, MVPAudioService to scene
8. Wire AudioMixer, AudioSources, and AudioClips to MVPAudioService
9. Add SuspicionFeedback Volume
10. Add ResultScreenUI canvas

- [ ] **Step 5: Create ATTRIBUTION.md**

```markdown
# Asset Attribution

## Audio
- Refrigerator hum: [Author] via Freesound.org (CC-BY 4.0)
- Door chime: [Author] via Freesound.org (CC0)
- BGM: FreePD.com (CC0)

## 3D Models
- Furniture Kit: Kenney.nl (CC0)
- Food Kit: Kenney.nl (CC0)
- Ultimate Food Pack: Quaternius.com (CC0)

## Animations
- NPC animations: Mixamo.com (Adobe, free for use)
```

- [ ] **Step 6: Full integration test**

1. Play mode
2. Verify: ambient audio plays, NPC walks around, speech bubbles appear
3. Approach NPC → E to talk → conversation with LLM
4. Stand at WorkStation → E to work → suspicion decays
5. Idle too long → suspicion rises → vignette/color shift
6. Wait for Act 2 → NPCs get more suspicious in dialogue
7. Wait for session end → result screen appears

- [ ] **Step 7: Commit**

```bash
git add Assets/Audio/ Assets/Models/ Assets/Animations/ Assets/Scenes/MVP_Store.unity ATTRIBUTION.md
git commit -m "feat(mvp): dress store scene with audio, props, animations, and full system wiring"
```

---

## Dependency Graph

```
Task 1 (FloatVariable + Event Channels)
  ├──→ Task 2 (Drama Manager)
  │      └──→ Task 10 (Session Flow)
  ├──→ Task 8 (Audio System)
  └──→ Task 9 (Suspicion Feedback)

Task 3 (Preoccupation) ── independent
Task 4 (Cover Work) ── independent
Task 5 (Speech Bubble) ──→ Task 6 (Dialogue Scheduler)
Task 7 (NPC FSM) ── independent

Task 11 (Bootstrap) ── after Tasks 1-10
Task 12 (Scene Assembly) ── after Task 11
```

**Parallelizable groups:**
- Group A: Tasks 3, 4, 7 (independent, no dependencies)
- Group B: Tasks 5 → 6 (sequential)
- Group C: Tasks 2, 8, 9 (all depend on Task 1, but independent of each other)
- Sequential: Task 1 → Group C, then Task 10, 11, 12
