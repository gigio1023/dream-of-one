// Assets/Scripts/MVP/SpeechBubbleUI.cs
using UnityEngine;
using TMPro;

public class SpeechBubbleUI : MonoBehaviour
{
    [SerializeField] Vector3 offset = new(0f, 2.2f, 0f);
    [SerializeField] float maxVisibleDistance = 8f;
    [SerializeField] float fadeStartDistance = 5f;

    Canvas canvas;
    CanvasGroup canvasGroup;
    TextMeshProUGUI textComponent;
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
        var bubbleRect = textGo.AddComponent<RectTransform>();
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
        if (Time.time >= hideTime) { Hide(); return; }

        if (Camera.main != null)
            canvas.transform.forward = Camera.main.transform.forward;

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
