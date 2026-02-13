using System;
using System.Collections.Generic;
using DreamOfOne.LucidCover;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class LucidCoverSeeder
    {
        private const string DataRoot = "Assets/Data/LucidCover";
        private const string DreamLawFolder = "Assets/Data/LucidCover/DreamLaws";
        private const string TextSurfaceFolder = "Assets/Data/LucidCover/TextSurfaces";
        private const string CoverTestFolder = "Assets/Data/LucidCover/CoverTests";

        [MenuItem("Tools/DreamOfOne/Seed LucidCover v1")]
        public static void SeedLucidCoverV1()
        {
            EnsureFolder(DataRoot);
            EnsureFolder(DreamLawFolder);
            EnsureFolder(TextSurfaceFolder);
            EnsureFolder(CoverTestFolder);

            var dreamLawAssets = SeedDreamLaws();
            var textSurfaceAssets = SeedTextSurfaces();
            var coverTestAssets = SeedCoverTests();

            UpdateDatabase($"{DataRoot}/DreamLawDatabase.asset", "dreamLaws", dreamLawAssets);
            UpdateDatabase($"{DataRoot}/TextSurfaceDatabase.asset", "textSurfaces", textSurfaceAssets);
            UpdateDatabase($"{DataRoot}/CoverTestDatabase.asset", "coverTests", coverTestAssets);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[LucidCoverSeeder] Seeded Dream Laws, Text Surfaces, Cover Tests.");
        }

        private struct DreamLawSeed
        {
            public string id;
            public DreamLawCategory category;
            public DreamLawScopeKind scope;
            public string scopeId;
            public float severity;
            public int suspicionDelta;
            public int exposureDelta;
            public string[] detectorIds;
            public string evidencePolicy;
            public string canonicalLine;
            public string defuseHints;
        }

        private static List<ScriptableObject> SeedDreamLaws()
        {
            var seeds = new[]
            {
                new DreamLawSeed
                {
                    id = "DL_G1_NO_DREAM_TALK",
                    category = DreamLawCategory.Speech,
                    scope = DreamLawScopeKind.Global,
                    scopeId = string.Empty,
                    severity = 0.9f,
                    suspicionDelta = 10,
                    exposureDelta = 25,
                    detectorIds = new[] { DreamLawDetectorIds.SpeechDreamTalk },
                    evidencePolicy = "1st hit: Witness Statement. 2nd hit: Reporting weight up.",
                    canonicalLine = "[DL_G1][Speech] Dream-related phrasing detected.",
                    defuseHints = "절차 용어로 재진술. 규정 문구를 인용."
                },
                new DreamLawSeed
                {
                    id = "DL_G2_NO_REALITY_TEST",
                    category = DreamLawCategory.Observation,
                    scope = DreamLawScopeKind.Global,
                    scopeId = string.Empty,
                    severity = 1.0f,
                    suspicionDelta = 12,
                    exposureDelta = 30,
                    detectorIds = new[] { DreamLawDetectorIds.SpeechRealityTest, DreamLawDetectorIds.SpeechTimelineProbe },
                    evidencePolicy = "Always Witness Statement. Station context 1.5x.",
                    canonicalLine = "[DL_G2][Global] Reality-check behavior detected.",
                    defuseHints = "확인/테스트 대신 절차 수행으로 전환."
                },
                new DreamLawSeed
                {
                    id = "DL_G3_NO_META_LOGIC",
                    category = DreamLawCategory.Speech,
                    scope = DreamLawScopeKind.Global,
                    scopeId = string.Empty,
                    severity = 0.7f,
                    suspicionDelta = 15,
                    exposureDelta = 10,
                    detectorIds = new[] { DreamLawDetectorIds.SpeechMetaLogic },
                    evidencePolicy = "Challenging state sooner. Defense memo opportunity.",
                    canonicalLine = "[DL_G3][Speech] Meta-logic contempt detected.",
                    defuseHints = "'이상하다' 대신 '절차 확인'으로 표현."
                },
                new DreamLawSeed
                {
                    id = "DL_G4_NO_TIMELINE_PROBING",
                    category = DreamLawCategory.Repetition,
                    scope = DreamLawScopeKind.Global,
                    scopeId = string.Empty,
                    severity = 0.8f,
                    suspicionDelta = 10,
                    exposureDelta = 15,
                    detectorIds = new[] { DreamLawDetectorIds.SpeechTimelineProbe, DreamLawDetectorIds.RepeatLoop },
                    evidencePolicy = "Repeat count escalates suspicion.",
                    canonicalLine = "[DL_G4][Speech] Timeline probing behavior detected.",
                    defuseHints = "반복 중지, 현재 절차로 환원."
                },
                new DreamLawSeed
                {
                    id = "DL_G5_COVER_CONSISTENCY",
                    category = DreamLawCategory.Authority,
                    scope = DreamLawScopeKind.Global,
                    scopeId = string.Empty,
                    severity = 0.6f,
                    suspicionDelta = 18,
                    exposureDelta = 0,
                    detectorIds = new[] { DreamLawDetectorIds.AuthorityMismatch },
                    evidencePolicy = "Cover mismatch tends to report.",
                    canonicalLine = "[DL_G5][Cover] Cover-role inconsistency detected.",
                    defuseHints = "커버 역할 범위로 행동 수정."
                },
                new DreamLawSeed
                {
                    id = "DL_S1_QUEUE_SANCTITY",
                    category = DreamLawCategory.Procedure,
                    scope = DreamLawScopeKind.Landmark,
                    scopeId = "Store",
                    severity = 0.6f,
                    suspicionDelta = 12,
                    exposureDelta = 0,
                    detectorIds = new[] { DreamLawDetectorIds.ProcQueueSkip },
                    evidencePolicy = "Ticket/Receipt + Witness Statement.",
                    canonicalLine = "[DL_S1][Queue] Queue procedure deviation logged.",
                    defuseHints = "순서대로 재수행 + 정상 산출물 생성."
                },
                new DreamLawSeed
                {
                    id = "DL_S2_LABEL_AUTHORITY",
                    category = DreamLawCategory.Procedure,
                    scope = DreamLawScopeKind.Landmark,
                    scopeId = "Store",
                    severity = 0.8f,
                    suspicionDelta = 18,
                    exposureDelta = 5,
                    detectorIds = new[] { DreamLawDetectorIds.ProcLabelTamper, DreamLawDetectorIds.SpeechMetaLogic },
                    evidencePolicy = "Notice snapshot + Statement; conditional report.",
                    canonicalLine = "[DL_S2][Label] Label authority challenged or altered.",
                    defuseHints = "라벨은 정의라는 문구 수용 + 절차 처리."
                },
                new DreamLawSeed
                {
                    id = "DL_ST1_APPROVAL_GATE",
                    category = DreamLawCategory.Procedure,
                    scope = DreamLawScopeKind.Landmark,
                    scopeId = "Studio",
                    severity = 0.7f,
                    suspicionDelta = 15,
                    exposureDelta = 0,
                    detectorIds = new[] { DreamLawDetectorIds.ProcRcBeforeApproval },
                    evidencePolicy = "Approval Note mismatch + Statement.",
                    canonicalLine = "[DL_ST1][Studio] Approval gate mismatch recorded.",
                    defuseHints = "승인노트 확보/제시."
                },
                new DreamLawSeed
                {
                    id = "DL_P1_OBSERVATION_ETIQUETTE",
                    category = DreamLawCategory.Observation,
                    scope = DreamLawScopeKind.Landmark,
                    scopeId = "Park",
                    severity = 0.7f,
                    suspicionDelta = 12,
                    exposureDelta = 10,
                    detectorIds = new[] { DreamLawDetectorIds.ProcUnauthorizedPhoto, DreamLawDetectorIds.SpeechRealityTest },
                    evidencePolicy = "Notice snapshot + Caretaker statement.",
                    canonicalLine = "[DL_P1][Park] Observation pressure behavior logged.",
                    defuseHints = "기록 중지 + 규범 문구 수용."
                },
                new DreamLawSeed
                {
                    id = "DL_N1_PROCEDURE_SPEECH_ONLY",
                    category = DreamLawCategory.Speech,
                    scope = DreamLawScopeKind.Landmark,
                    scopeId = "Station",
                    severity = 0.9f,
                    suspicionDelta = 20,
                    exposureDelta = 15,
                    detectorIds = new[] { DreamLawDetectorIds.SpeechDreamTalk, DreamLawDetectorIds.SpeechMetaLogic, DreamLawDetectorIds.RepeatLoop },
                    evidencePolicy = "Intake record + Officer statement + escalate inquest.",
                    canonicalLine = "[DL_N1][Station] Non-procedural speech during intake.",
                    defuseHints = "짧게 절차적으로 답변 + Defense Memo."
                }
            };

            var results = new List<ScriptableObject>();
            for (int i = 0; i < seeds.Length; i++)
            {
                var seed = seeds[i];
                string path = $"{DreamLawFolder}/{seed.id}.asset";
                var asset = CreateOrLoad<DreamLawDefinition>(path);
                var so = new SerializedObject(asset);
                SetString(so, "dreamLawId", seed.id);
                SetEnum(so, "category", (int)seed.category);
                SetEnum(so, "scopeKind", (int)seed.scope);
                SetString(so, "scopeId", seed.scopeId ?? string.Empty);
                SetFloat(so, "severity", seed.severity);
                SetInt(so, "suspicionDelta", seed.suspicionDelta);
                SetInt(so, "exposureDelta", seed.exposureDelta);
                SetStringArray(so, "detectorIds", seed.detectorIds);
                SetString(so, "evidencePolicy", seed.evidencePolicy ?? string.Empty);
                SetString(so, "canonicalLineTemplate", seed.canonicalLine ?? string.Empty);
                SetString(so, "defuseHints", seed.defuseHints ?? string.Empty);
                so.ApplyModifiedProperties();
                results.Add(asset);
            }

            return results;
        }

        private struct TextSurfaceSeed
        {
            public string id;
            public TextSurfaceKind kind;
            public string anchor;
            public Vector3 offset;
            public Vector3 rotation;
            public string prompt;
            public string text;
            public string[] dreamLawIds;
            public string placeId;
        }

        private static List<ScriptableObject> SeedTextSurfaces()
        {
            var seeds = new[]
            {
                new TextSurfaceSeed
                {
                    id = "TS_STORE_QUEUE_SIGN",
                    kind = TextSurfaceKind.Signage,
                    anchor = "StoreBuilding",
                    offset = new Vector3(0f, 0f, 0f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "순서 확인은 말로 하지 마세요.",
                    dreamLawIds = new[] { "DL_S1_QUEUE_SANCTITY", "DL_G1_NO_DREAM_TALK", "DL_G2_NO_REALITY_TEST" },
                    placeId = "Store"
                },
                new TextSurfaceSeed
                {
                    id = "TS_STORE_COUNTER_POLICY",
                    kind = TextSurfaceKind.Notice,
                    anchor = "StoreBuilding",
                    offset = new Vector3(0.6f, 0f, -0.3f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "호출은 지정된 문구로만 진행합니다.",
                    dreamLawIds = new[] { "DL_S1_QUEUE_SANCTITY", "DL_G1_NO_DREAM_TALK", "DL_G2_NO_REALITY_TEST" },
                    placeId = "Store"
                },
                new TextSurfaceSeed
                {
                    id = "TS_STORE_LABEL_BOARD",
                    kind = TextSurfaceKind.Notice,
                    anchor = "StoreBuilding",
                    offset = new Vector3(-1.2f, 0f, -0.2f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "라벨은 상태를 정의합니다. 의심하지 않습니다.",
                    dreamLawIds = new[] { "DL_S2_LABEL_AUTHORITY", "DL_G3_NO_META_LOGIC", "DL_G1_NO_DREAM_TALK" },
                    placeId = "Store"
                },
                new TextSurfaceSeed
                {
                    id = "TS_STUDIO_APPROVAL_NOTICE",
                    kind = TextSurfaceKind.Notice,
                    anchor = "StudioBuilding_L1",
                    offset = new Vector3(0.4f, 0f, -0.2f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "승인 없는 변경은 존재하지 않습니다.",
                    dreamLawIds = new[] { "DL_ST1_APPROVAL_GATE", "DL_G1_NO_DREAM_TALK", "DL_G3_NO_META_LOGIC" },
                    placeId = "Studio"
                },
                new TextSurfaceSeed
                {
                    id = "TS_STUDIO_RC_FORM",
                    kind = TextSurfaceKind.Form,
                    anchor = "StudioBuilding_L1",
                    offset = new Vector3(-0.4f, 0f, -0.2f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "릴리즈 후보(RC) 삽입은 승인노트와 쌍입니다.",
                    dreamLawIds = new[] { "DL_ST1_APPROVAL_GATE", "DL_G1_NO_DREAM_TALK" },
                    placeId = "Studio"
                },
                new TextSurfaceSeed
                {
                    id = "TS_PARK_NOTICE",
                    kind = TextSurfaceKind.Notice,
                    anchor = "ParkArea",
                    offset = new Vector3(0f, 0f, -0.8f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "기록은 허용되나, 확인은 금지됩니다.",
                    dreamLawIds = new[] { "DL_P1_OBSERVATION_ETIQUETTE", "DL_G2_NO_REALITY_TEST", "DL_G4_NO_TIMELINE_PROBING" },
                    placeId = "Park"
                },
                new TextSurfaceSeed
                {
                    id = "TS_STATION_INTAKE_FORM",
                    kind = TextSurfaceKind.Form,
                    anchor = "Station",
                    offset = new Vector3(0.6f, 0f, -0.4f),
                    rotation = Vector3.zero,
                    prompt = "E: Read",
                    text = "진술은 절차 용어로만 작성합니다.",
                    dreamLawIds = new[] { "DL_N1_PROCEDURE_SPEECH_ONLY", "DL_G1_NO_DREAM_TALK" },
                    placeId = "Station"
                }
            };

            var results = new List<ScriptableObject>();
            for (int i = 0; i < seeds.Length; i++)
            {
                var seed = seeds[i];
                string path = $"{TextSurfaceFolder}/{seed.id}.asset";
                var asset = CreateOrLoad<TextSurfaceDefinition>(path);
                var so = new SerializedObject(asset);
                SetString(so, "textSurfaceId", seed.id);
                SetEnum(so, "kind", (int)seed.kind);
                SetString(so, "anchorName", seed.anchor ?? string.Empty);
                SetVector3(so, "localOffset", seed.offset);
                SetVector3(so, "localRotationEuler", seed.rotation);
                SetString(so, "prompt", seed.prompt ?? "E: Read");
                SetString(so, "surfaceText", seed.text ?? string.Empty);
                SetStringArray(so, "dreamLawIds", seed.dreamLawIds);
                SetString(so, "placeId", seed.placeId ?? string.Empty);
                so.ApplyModifiedProperties();
                results.Add(asset);
            }

            return results;
        }

        private struct CoverTestSeed
        {
            public string id;
            public string location;
            public string purpose;
            public string[] dreamLawIds;
            public string[] requiredActors;
            public string[] requiredTextSurfaces;
            public string playerChecklistStep;
            public string[] triggerDetectorIds;
            public string escalationLadder;
            public string artifactsGenerated;
            public string defuseOptions;
            public string failureCondition;
            public string expectedCanonicalLines;
            public string mcssValidation;
        }

        private static List<ScriptableObject> SeedCoverTests()
        {
            var seeds = new[]
            {
                new CoverTestSeed
                {
                    id = "CT_STORE_QUEUE_LANGUAGE",
                    location = "Store / StoreQueue / Counter area",
                    purpose = "Queue language mismatch triggers suspicion/exposure.",
                    dreamLawIds = new[] { "DL_S1_QUEUE_SANCTITY", "DL_G1_NO_DREAM_TALK", "DL_G2_NO_REALITY_TEST" },
                    requiredActors = new[] { "StoreClerk", "StoreCustomer" },
                    requiredTextSurfaces = new[] { "TS_STORE_QUEUE_SIGN", "TS_STORE_COUNTER_POLICY" },
                    playerChecklistStep = "Store에서 Queue procedure 확인/정상 수행",
                    triggerDetectorIds = new[]
                    {
                        DreamLawDetectorIds.SpeechDreamTalk,
                        DreamLawDetectorIds.SpeechRealityTest,
                        DreamLawDetectorIds.ProcQueueSkip,
                        DreamLawDetectorIds.RepeatLoop
                    },
                    escalationLadder = "Suspicious: 표현 이상. Challenging: 규정 문구 재요구. Reporting: 진술+신고.",
                    artifactsGenerated = "Witness Statement, Complaint Memo(conditional), Ticket/Receipt",
                    defuseOptions = "SA_COMPLY로 규정 문구 재진술 + Queue 절차 정상 수행. Receipt 제출.",
                    failureCondition = "Exposure +40 in one test or Lucid identified verdict.",
                    expectedCanonicalLines = "[DL_S1][Queue] Procedure language mismatch at Store Counter.\n[DL_G1][Speech] Dream-related phrasing detected.",
                    mcssValidation = "CT-01 alone reaches suspicious->challenging; reporting possible on conditions."
                },
                new CoverTestSeed
                {
                    id = "CT_STORE_LABEL_MEANING",
                    location = "Store / LabelBoard",
                    purpose = "Label authority tamper builds suspicion.",
                    dreamLawIds = new[] { "DL_S2_LABEL_AUTHORITY", "DL_G3_NO_META_LOGIC" },
                    requiredActors = new[] { "StoreManager" },
                    requiredTextSurfaces = new[] { "TS_STORE_LABEL_BOARD" },
                    playerChecklistStep = "라벨 보드 점검/업데이트",
                    triggerDetectorIds = new[]
                    {
                        DreamLawDetectorIds.ProcLabelTamper,
                        DreamLawDetectorIds.SpeechMetaLogic,
                        DreamLawDetectorIds.SpeechDreamTalk
                    },
                    escalationLadder = "Suspicious: 라벨은 의심하지 않음. Challenging: 변경 기록 요구. Reporting: 무단 정의 변경.",
                    artifactsGenerated = "Witness Statement, Notice Snapshot, Defense Memo(conditional)",
                    defuseOptions = "정상 절차로 변경 + SA_FRAME로 정당화.",
                    failureCondition = "Label tamper + dream talk 동시에 발생 시 급상승.",
                    expectedCanonicalLines = "[DL_S2][Label] Unauthorized label authority challenge detected.",
                    mcssValidation = "Store에서 CT-01 또는 CT-02가 최소 1회 발동."
                },
                new CoverTestSeed
                {
                    id = "CT_STUDIO_APPROVAL_GATE_SPEECH",
                    location = "Studio / ApprovalDesk / RCInsert",
                    purpose = "Approval gate violation triggers escalation.",
                    dreamLawIds = new[] { "DL_ST1_APPROVAL_GATE", "DL_G1_NO_DREAM_TALK", "DL_G3_NO_META_LOGIC" },
                    requiredActors = new[] { "StudioPM", "QA" },
                    requiredTextSurfaces = new[] { "TS_STUDIO_APPROVAL_NOTICE", "TS_STUDIO_RC_FORM" },
                    playerChecklistStep = "승인 절차 확인 + 릴리즈 후보 관련 업무",
                    triggerDetectorIds = new[]
                    {
                        DreamLawDetectorIds.ProcRcBeforeApproval,
                        DreamLawDetectorIds.SpeechMetaLogic,
                        DreamLawDetectorIds.SpeechDreamTalk
                    },
                    escalationLadder = "Suspicious: 표현 부적절. Challenging: 승인노트 요구. Reporting: 절차 경멸.",
                    artifactsGenerated = "Witness Statement, Approval Note, Complaint/Defense Memo",
                    defuseOptions = "승인노트 확보/제시 + SA_COMPLY",
                    failureCondition = "릴리즈 후보 insert 위반 + meta logic 동시 발생 시 reporting 직행",
                    expectedCanonicalLines = "[DL_ST1][Procedure] Approval gate violation detected.",
                    mcssValidation = "Studio에서 최소 1회 증빙 요구 발생."
                },
                new CoverTestSeed
                {
                    id = "CT_PARK_OBSERVATION_PRESSURE",
                    location = "Park / NoticeBoard / PhotoSpot",
                    purpose = "Observation pressure behavior triggers suspicion.",
                    dreamLawIds = new[] { "DL_P1_OBSERVATION_ETIQUETTE", "DL_G2_NO_REALITY_TEST", "DL_G4_NO_TIMELINE_PROBING" },
                    requiredActors = new[] { "Caretaker", "Elder" },
                    requiredTextSurfaces = new[] { "TS_PARK_NOTICE" },
                    playerChecklistStep = "게시판 확인/갱신 또는 순찰 업무",
                    triggerDetectorIds = new[]
                    {
                        DreamLawDetectorIds.SpeechRealityTest,
                        DreamLawDetectorIds.SpeechTimelineProbe,
                        DreamLawDetectorIds.ProcUnauthorizedPhoto
                    },
                    escalationLadder = "Suspicious: 확인 왜? Challenging: 규범 문구 준수. Reporting: 관찰 압박.",
                    artifactsGenerated = "Witness Statement, Notice Snapshot, Complaint Memo",
                    defuseOptions = "SA_COMPLY + photo 중지 + 규범 문구 수용.",
                    failureCondition = "Reality test 반복 시 Exposure 누적 위험.",
                    expectedCanonicalLines = "[DL_P1][Park] Observation pressure behavior detected.",
                    mcssValidation = "Park에서 최소 1개 artifact 생성."
                },
                new CoverTestSeed
                {
                    id = "CT_STATION_SOFT_INQUEST",
                    location = "Station / ReportDesk",
                    purpose = "Soft inquest pressure before full dossier.",
                    dreamLawIds = new[] { "DL_N1_PROCEDURE_SPEECH_ONLY", "DL_G1_NO_DREAM_TALK" },
                    requiredActors = new[] { "Officer", "Investigator" },
                    requiredTextSurfaces = new[] { "TS_STATION_INTAKE_FORM" },
                    playerChecklistStep = "Station 체크인(정상 보고/서류 처리)",
                    triggerDetectorIds = new[]
                    {
                        DreamLawDetectorIds.SpeechDreamTalk,
                        DreamLawDetectorIds.SpeechMetaLogic,
                        DreamLawDetectorIds.RepeatLoop
                    },
                    escalationLadder = "Suspicious: 절차 용어 요구. Challenging: Defense Memo 요구. Inquest: dossier open.",
                    artifactsGenerated = "Inquest Intake Record, Defense Memo, Officer Statement",
                    defuseOptions = "절차적 답변 + Defense Memo 제출",
                    failureCondition = "Station에서 dream talk 발생 시 inquest 직행",
                    expectedCanonicalLines = "[DL_N1][Station] Non-procedural speech detected during intake.",
                    mcssValidation = "Station은 최종 압박/판정 무대."
                },
                new CoverTestSeed
                {
                    id = "CT_GLOBAL_REALITY_CHECK_CONTAGION",
                    location = "Any",
                    purpose = "NPC reality-check talk contagion test.",
                    dreamLawIds = new[] { "DL_G2_NO_REALITY_TEST", "DL_G1_NO_DREAM_TALK" },
                    requiredActors = new[] { "AnyNPC" },
                    requiredTextSurfaces = Array.Empty<string>(),
                    playerChecklistStep = "(global)",
                    triggerDetectorIds = new[]
                    {
                        DreamLawDetectorIds.NpcRealityCheckContagion,
                        DreamLawDetectorIds.SpeechRealityTest,
                        DreamLawDetectorIds.SpeechDreamTalk
                    },
                    escalationLadder = "NPC 불안 발화 → 플레이어 동조 시 노출 상승",
                    artifactsGenerated = "Witness Statement, Memo(conditional)",
                    defuseOptions = "SA_FRAME로 절차 언어 환원 + 주제 전환",
                    failureCondition = "Exposure 대폭 상승 시 세션 위험",
                    expectedCanonicalLines = "[DL_G2][Global] Reality-check framing escalated by PLAYER.",
                    mcssValidation = "세션당 0~1회 조건부 발생."
                }
            };

            var results = new List<ScriptableObject>();
            for (int i = 0; i < seeds.Length; i++)
            {
                var seed = seeds[i];
                string path = $"{CoverTestFolder}/{seed.id}.asset";
                var asset = CreateOrLoad<CoverTestDefinition>(path);
                var so = new SerializedObject(asset);
                SetString(so, "coverTestId", seed.id);
                SetString(so, "location", seed.location ?? string.Empty);
                SetString(so, "purpose", seed.purpose ?? string.Empty);
                SetStringArray(so, "dreamLawIds", seed.dreamLawIds);
                SetStringArray(so, "requiredActors", seed.requiredActors ?? Array.Empty<string>());
                SetStringArray(so, "requiredTextSurfaces", seed.requiredTextSurfaces ?? Array.Empty<string>());
                SetString(so, "playerChecklistStep", seed.playerChecklistStep ?? string.Empty);
                SetStringArray(so, "triggerDetectorIds", seed.triggerDetectorIds ?? Array.Empty<string>());
                SetString(so, "escalationLadder", seed.escalationLadder ?? string.Empty);
                SetString(so, "artifactsGenerated", seed.artifactsGenerated ?? string.Empty);
                SetString(so, "defuseOptions", seed.defuseOptions ?? string.Empty);
                SetString(so, "failureCondition", seed.failureCondition ?? string.Empty);
                SetString(so, "expectedCanonicalLines", seed.expectedCanonicalLines ?? string.Empty);
                SetString(so, "mcssValidation", seed.mcssValidation ?? string.Empty);
                so.ApplyModifiedProperties();
                results.Add(asset);
            }

            return results;
        }

        private static void UpdateDatabase(string path, string listProperty, List<ScriptableObject> assets)
        {
            var database = AssetDatabase.LoadAssetAtPath<ScriptableObject>(path);
            if (database == null)
            {
                Debug.LogWarning($"[LucidCoverSeeder] Missing database asset at {path}.");
                return;
            }

            var so = new SerializedObject(database);
            var list = so.FindProperty(listProperty);
            if (list == null || !list.isArray)
            {
                Debug.LogWarning($"[LucidCoverSeeder] Database {path} missing list {listProperty}.");
                return;
            }

            list.arraySize = assets.Count;
            for (int i = 0; i < assets.Count; i++)
            {
                list.GetArrayElementAtIndex(i).objectReferenceValue = assets[i];
            }

            so.ApplyModifiedProperties();
            EditorUtility.SetDirty(database);
        }

        private static T CreateOrLoad<T>(string path) where T : ScriptableObject
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset != null)
            {
                return asset;
            }

            asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            EditorUtility.SetDirty(asset);
            return asset;
        }

        private static void EnsureFolder(string folder)
        {
            if (AssetDatabase.IsValidFolder(folder))
            {
                return;
            }

            string parent = System.IO.Path.GetDirectoryName(folder)?.Replace('\\', '/');
            string name = System.IO.Path.GetFileName(folder);
            if (!string.IsNullOrEmpty(parent) && AssetDatabase.IsValidFolder(parent))
            {
                AssetDatabase.CreateFolder(parent, name);
            }
        }

        private static void SetString(SerializedObject so, string property, string value)
        {
            var prop = so.FindProperty(property);
            if (prop != null)
            {
                prop.stringValue = value ?? string.Empty;
            }
        }

        private static void SetInt(SerializedObject so, string property, int value)
        {
            var prop = so.FindProperty(property);
            if (prop != null)
            {
                prop.intValue = value;
            }
        }

        private static void SetFloat(SerializedObject so, string property, float value)
        {
            var prop = so.FindProperty(property);
            if (prop != null)
            {
                prop.floatValue = value;
            }
        }

        private static void SetEnum(SerializedObject so, string property, int index)
        {
            var prop = so.FindProperty(property);
            if (prop != null)
            {
                prop.enumValueIndex = index;
            }
        }

        private static void SetVector3(SerializedObject so, string property, Vector3 value)
        {
            var prop = so.FindProperty(property);
            if (prop != null)
            {
                prop.vector3Value = value;
            }
        }

        private static void SetStringArray(SerializedObject so, string property, string[] values)
        {
            var prop = so.FindProperty(property);
            if (prop == null || !prop.isArray)
            {
                return;
            }

            values ??= Array.Empty<string>();
            prop.arraySize = values.Length;
            for (int i = 0; i < values.Length; i++)
            {
                prop.GetArrayElementAtIndex(i).stringValue = values[i] ?? string.Empty;
            }
        }
    }
}
