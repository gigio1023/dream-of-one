using DreamOfOne.LucidCover;
using DreamOfOne.World;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.Editor
{
    public static class LucidCoverContentSeeder
    {
        private const string RootFolder = "Assets/Data/LucidCover";
        private const string DreamLawDbPath = RootFolder + "/DreamLawDatabase.asset";
        private const string TextSurfaceDbPath = RootFolder + "/TextSurfaceDatabase.asset";
        private const string CoverTestDbPath = RootFolder + "/CoverTestDatabase.asset";

        private const string DreamLawsFolder = RootFolder + "/DreamLaws";
        private const string TextSurfacesFolder = RootFolder + "/TextSurfaces";

        private const string DlG1Path = DreamLawsFolder + "/DL_G1_NO_DREAM_TALK.asset";
        private const string TsStoreQueueSignPath = TextSurfacesFolder + "/TS_STORE_QUEUE_SIGN.asset";

        [MenuItem("Tools/DreamOfOne/LucidCover/Seed v1 Content (Minimal)")]
        public static void SeedV1Minimal()
        {
            EnsureFolder(RootFolder);
            EnsureFolder(DreamLawsFolder);
            EnsureFolder(TextSurfacesFolder);

            var dreamLawDb = LoadOrCreateAsset<DreamLawDatabase>(DreamLawDbPath);
            var textSurfaceDb = LoadOrCreateAsset<TextSurfaceDatabase>(TextSurfaceDbPath);
            var coverTestDb = LoadOrCreateAsset<CoverTestDatabase>(CoverTestDbPath);

            var dlG1 = LoadOrCreateAsset<DreamLawDefinition>(DlG1Path);
            ConfigureDlG1(dlG1);
            AddToListIfMissing(dreamLawDb, "dreamLaws", dlG1);

            var tsQueue = LoadOrCreateAsset<TextSurfaceDefinition>(TsStoreQueueSignPath);
            ConfigureTsStoreQueueSign(tsQueue);
            AddToListIfMissing(textSurfaceDb, "textSurfaces", tsQueue);

            var world = AssetDatabase.LoadAssetAtPath<WorldDefinition>("Assets/Data/WorldDefinition.asset");
            if (world != null)
            {
                var serialized = new SerializedObject(world);
                serialized.FindProperty("dreamLawDatabase").objectReferenceValue = dreamLawDb;
                serialized.FindProperty("textSurfaceDatabase").objectReferenceValue = textSurfaceDb;
                serialized.FindProperty("coverTestDatabase").objectReferenceValue = coverTestDb;
                serialized.ApplyModifiedPropertiesWithoutUndo();
                EditorUtility.SetDirty(world);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[LucidCover] Seeded minimal v1 content (DL_G1 + TS_STORE_QUEUE_SIGN).");
        }

        private static T LoadOrCreateAsset<T>(string assetPath) where T : ScriptableObject
        {
            var existing = AssetDatabase.LoadAssetAtPath<T>(assetPath);
            if (existing != null)
            {
                return existing;
            }

            var created = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(created, assetPath);
            EditorUtility.SetDirty(created);
            return created;
        }

        private static void EnsureFolder(string folderPath)
        {
            if (AssetDatabase.IsValidFolder(folderPath))
            {
                return;
            }

            var parts = folderPath.Split('/');
            if (parts.Length < 2)
            {
                return;
            }

            string current = parts[0];
            for (int i = 1; i < parts.Length; i++)
            {
                string next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, parts[i]);
                }
                current = next;
            }
        }

        private static void ConfigureDlG1(DreamLawDefinition law)
        {
            if (law == null)
            {
                return;
            }

            var serialized = new SerializedObject(law);
            serialized.FindProperty("dreamLawId").stringValue = "DL_G1_NO_DREAM_TALK";
            serialized.FindProperty("category").enumValueIndex = (int)DreamLawCategory.Speech;
            serialized.FindProperty("scopeKind").enumValueIndex = (int)DreamLawScopeKind.Global;
            serialized.FindProperty("scopeId").stringValue = string.Empty;
            serialized.FindProperty("severity").floatValue = 0.9f;
            serialized.FindProperty("suspicionDelta").intValue = 10;
            serialized.FindProperty("exposureDelta").intValue = 25;
            serialized.FindProperty("detectorIds").arraySize = 1;
            serialized.FindProperty("detectorIds").GetArrayElementAtIndex(0).stringValue = "DET_SPEECH_DREAM_TALK";
            serialized.FindProperty("canonicalLineTemplate").stringValue = "[DL_G1][Speech] Dream-related phrasing detected.";
            serialized.FindProperty("defuseHints").stringValue = "절차 용어로 재진술(SA_COMPLY).";
            serialized.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(law);
        }

        private static void ConfigureTsStoreQueueSign(TextSurfaceDefinition surface)
        {
            if (surface == null)
            {
                return;
            }

            var serialized = new SerializedObject(surface);
            serialized.FindProperty("textSurfaceId").stringValue = "TS_STORE_QUEUE_SIGN";
            serialized.FindProperty("kind").enumValueIndex = (int)TextSurfaceKind.Signage;
            serialized.FindProperty("anchorName").stringValue = "StoreBuilding";
            serialized.FindProperty("prompt").stringValue = "E: Read";
            serialized.FindProperty("surfaceText").stringValue = "순서 확인은 말로 하지 마세요.";
            serialized.FindProperty("dreamLawIds").arraySize = 1;
            serialized.FindProperty("dreamLawIds").GetArrayElementAtIndex(0).stringValue = "DL_G1_NO_DREAM_TALK";
            serialized.FindProperty("placeId").stringValue = "Store";
            serialized.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(surface);
        }

        private static void AddToListIfMissing(ScriptableObject target, string listFieldName, Object item)
        {
            if (target == null || item == null)
            {
                return;
            }

            var serialized = new SerializedObject(target);
            var list = serialized.FindProperty(listFieldName);
            if (list == null || !list.isArray)
            {
                return;
            }

            for (int i = 0; i < list.arraySize; i++)
            {
                if (list.GetArrayElementAtIndex(i).objectReferenceValue == item)
                {
                    return;
                }
            }

            int index = list.arraySize;
            list.InsertArrayElementAtIndex(index);
            list.GetArrayElementAtIndex(index).objectReferenceValue = item;
            serialized.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(target);
        }
    }
}

