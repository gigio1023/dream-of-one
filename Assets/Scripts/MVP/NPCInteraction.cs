using UnityEngine;
using System.Threading.Tasks;
using DreamOfOne.NPC;

public class NPCInteraction : MonoBehaviour
{
    [SerializeField] float interactionRange = 3f;
    [SerializeField] string npcRole = "Store Clerk";
    [SerializeField] string[] dreamLaws = new string[]
    {
        "꿈에 대해 언급하면 안 됨",
        "현실 테스트를 하면 안 됨",
        "비논리적 질문을 하면 안 됨"
    };

    ILLMBackend llmBackend;
    SuspicionComponent suspicion;
    ConversationUI conversationUI;
    Transform playerTransform;
    bool isInConversation;

    public bool IsInRange => playerTransform != null &&
        Vector3.Distance(transform.position, playerTransform.position) <= interactionRange;

    public bool IsInConversation => isInConversation;

    void Start()
    {
        suspicion = GetComponent<SuspicionComponent>();
        llmBackend = FindFirstObjectByType<OllamaBackend>();
        conversationUI = FindFirstObjectByType<ConversationUI>();
        playerTransform = GameObject.FindGameObjectWithTag("Player")?.transform;
    }

    void Update()
    {
        if (isInConversation) return;

        if (IsInRange && Input.GetKeyDown(KeyCode.E))
        {
            StartConversation();
        }
    }

    void StartConversation()
    {
        isInConversation = true;
        conversationUI?.Show(this, npcRole);
    }

    public async Task<string> ProcessPlayerMessage(string playerMessage)
    {
        string prompt = BuildPrompt(playerMessage);
        var response = llmBackend != null
            ? await llmBackend.SendAsync(prompt)
            : LLMResponse.Fallback();

        // Apply suspicion
        if (suspicion != null && response.suspicionDelta != 0)
        {
            suspicion.AddSuspicion(response.suspicionDelta, "conversation", "");
        }

        return response.text;
    }

    public void EndConversation()
    {
        isInConversation = false;
    }

    string BuildPrompt(string playerMessage)
    {
        string laws = string.Join("\n", dreamLaws);
        return $@"당신은 편의점의 {npcRole}입니다.

규칙:
{laws}

손님이 말했습니다: ""{playerMessage}""

다음 JSON 형식으로 응답하세요:
{{""text"": ""당신의 인캐릭터 응답 (1-2문장, 한국어)"", ""suspicionDelta"": 0, ""success"": true}}

suspicionDelta 규칙:
- 정상적 대화: 0
- 약간 이상한 말: 5~15
- 꿈/현실 언급: 20~30
- 매우 정상적이고 예의바른 말: -5~-10";
    }
}
