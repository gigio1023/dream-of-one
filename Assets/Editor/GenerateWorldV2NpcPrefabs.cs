using System.Collections.Generic;
using System.Linq;
using CharacterCustomizationTool.Editor;
using CharacterCustomizationTool.Editor.Character;
using CharacterCustomizationTool.Editor.FaceEditor;
using CharacterCustomizationTool.Editor.MaterialManagement;
using CharacterCustomizationTool.Editor.Randomizer;
using DreamOfOne.Core;
using DreamOfOne.NPC;
using DreamOfOne.World;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Editor
{
    public static class GenerateWorldV2NpcPrefabs
    {
        private const string CharacterRoot = "Assets/ithappy/Creative_Characters_FREE/";
        private const string PrefabRoot = "Assets/Data/Prefabs/NPCs/WorldV2";
        private const string ScenePath = "Assets/Scenes/Prototype.unity";
        private const string WorldRootName = "World_v2";
        private const string NpcRootName = "NPCs";
        private const string AnchorRootName = "CITY_Anchors";

        [MenuItem("Tools/DreamOfOne/Generate WorldV2 NPC Prefabs")]
        public static void Generate()
        {
            AssetsPath.SetRoot(CharacterRoot);
            var slotLibrary = SlotLibraryLoader.LoadSlotLibrary();
            if (slotLibrary == null)
            {
                Debug.LogError("[WorldV2NpcPrefabs] SlotLibrary not found. Did the Creative Characters asset import succeed?");
                return;
            }

            EnsureFolder(PrefabRoot);
            EnsureMaterialLibrary();

            var roleSpecs = BuildRoleSpecs();
            var generator = new RandomCharacterGenerator();

            foreach (var spec in roleSpecs)
            {
                Random.InitState(spec.Seed);
                var customizable = new CustomizableCharacter(slotLibrary);
                generator.Randomize(customizable);

                var character = customizable.InstantiateCharacter();
                character.name = spec.PrefabName;

                ApplySlots(customizable, character);
                FaceLoader.AddFaces(character);
                ConfigureAnimator(character);
                StripPlayerComponents(character);
                EnsureNpcComponents(character, spec);

                var prefabPath = $"{PrefabRoot}/{spec.PrefabName}.prefab";
                PrefabUtility.SaveAsPrefabAsset(character, prefabPath);
                Object.DestroyImmediate(character);

                if (!string.IsNullOrEmpty(spec.DefinitionPath))
                {
                    AssignNpcDefinitionPrefab(spec.DefinitionPath, prefabPath);
                }
            }

            PlaceNpcInstances(roleSpecs);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[WorldV2NpcPrefabs] NPC prefabs generated and placed.");
        }

        private static void ApplySlots(CustomizableCharacter customizable, GameObject character)
        {
            var materialProvider = new MaterialProvider();
            var enabledSlots = customizable.Slots.Where(s => s.IsEnabled).ToArray();

            foreach (var slot in enabledSlots)
            {
                foreach (var mesh in slot.Meshes)
                {
                    var child = character.transform
                        .Cast<Transform>()
                        .FirstOrDefault(t => t.name.StartsWith(mesh.Item1.ToString()));

                    if (child == null)
                    {
                        continue;
                    }

                    if (child.TryGetComponent<SkinnedMeshRenderer>(out var renderer))
                    {
                        renderer.sharedMesh = mesh.Item2;
                        renderer.sharedMaterial = materialProvider.MainColor;
                        renderer.localBounds = renderer.sharedMesh.bounds;
                    }
                }
            }
        }

        private static void ConfigureAnimator(GameObject character)
        {
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(AssetsPath.AnimationController);
            var animator = character.GetComponent<Animator>();
            if (animator == null)
            {
                animator = character.AddComponent<Animator>();
            }

            animator.runtimeAnimatorController = controller;
            animator.applyRootMotion = false;
        }

        private static void StripPlayerComponents(GameObject character)
        {
            var characterController = character.GetComponent<CharacterController>();
            if (characterController != null)
            {
                Object.DestroyImmediate(characterController);
            }

            var mover = character.GetComponent<Controller.CharacterMover>();
            if (mover != null)
            {
                Object.DestroyImmediate(mover);
            }

            var input = character.GetComponent<Controller.MovePlayerInput>();
            if (input != null)
            {
                Object.DestroyImmediate(input);
            }

            var playerCamera = character.GetComponent<Controller.PlayerCamera>();
            if (playerCamera != null)
            {
                Object.DestroyImmediate(playerCamera);
            }

            var thirdPerson = character.GetComponent<Controller.ThirdPersonCamera>();
            if (thirdPerson != null)
            {
                Object.DestroyImmediate(thirdPerson);
            }
        }

        private static void EnsureNpcComponents(GameObject character, RoleSpec spec)
        {
            var agent = character.GetComponent<NavMeshAgent>();
            if (agent == null)
            {
                agent = character.AddComponent<NavMeshAgent>();
            }

            agent.radius = 0.28f;
            agent.height = 1.6f;
            agent.baseOffset = 0.05f;
            agent.angularSpeed = 420f;
            agent.acceleration = 10f;
            agent.speed = spec.IsPolice ? 1.5f : 1.2f;
            agent.stoppingDistance = spec.IsPolice ? 0.35f : 0.2f;
            agent.avoidancePriority = spec.IsPolice ? 45 : 55;

            if (character.GetComponent<CapsuleCollider>() == null)
            {
                var capsule = character.AddComponent<CapsuleCollider>();
                capsule.height = 1.8f;
                capsule.radius = 0.35f;
                capsule.center = new Vector3(0f, 0.9f, 0f);
            }

            if (character.GetComponent<ActorGrounding>() == null)
            {
                character.AddComponent<ActorGrounding>();
            }

            var persona = character.GetComponent<NpcPersona>();
            if (persona == null)
            {
                persona = character.AddComponent<NpcPersona>();
            }
            persona.Configure(spec.NpcId, spec.RoleName, spec.Persona, spec.Tone);

            if (character.GetComponent<NpcContext>() == null)
            {
                character.AddComponent<NpcContext>();
            }

            if (character.GetComponent<SuspicionComponent>() == null)
            {
                character.AddComponent<SuspicionComponent>();
            }

            if (spec.IsPolice)
            {
                if (character.GetComponent<PoliceController>() == null)
                {
                    character.AddComponent<PoliceController>();
                }
            }
            else
            {
                if (character.GetComponent<SimplePatrol>() == null)
                {
                    character.AddComponent<SimplePatrol>();
                }

                if (character.GetComponent<NpcRoleRoutine>() == null)
                {
                    character.AddComponent<NpcRoleRoutine>();
                }
            }
        }

        private static void AssignNpcDefinitionPrefab(string definitionPath, string prefabPath)
        {
            var definition = AssetDatabase.LoadAssetAtPath<NpcDefinition>(definitionPath);
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
            if (definition == null || prefab == null)
            {
                return;
            }

            var so = new SerializedObject(definition);
            so.FindProperty("prefab").objectReferenceValue = prefab;
            so.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(definition);
        }

        private static void PlaceNpcInstances(List<RoleSpec> specs)
        {
            var scene = EditorSceneManager.GetActiveScene();
            if (scene.path != ScenePath)
            {
                scene = EditorSceneManager.OpenScene(ScenePath);
            }

            var worldRoot = GameObject.Find(WorldRootName) ?? new GameObject(WorldRootName);
            var npcRoot = worldRoot.transform.Find(NpcRootName);
            if (npcRoot == null)
            {
                var npcRootObject = new GameObject(NpcRootName);
                npcRootObject.transform.SetParent(worldRoot.transform, false);
                npcRoot = npcRootObject.transform;
            }

            for (int i = npcRoot.childCount - 1; i >= 0; i--)
            {
                Object.DestroyImmediate(npcRoot.GetChild(i).gameObject);
            }

            foreach (var spec in specs)
            {
                if (!spec.PlaceInScene)
                {
                    continue;
                }

                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{PrefabRoot}/{spec.PrefabName}.prefab");
                if (prefab == null)
                {
                    continue;
                }

                var instance = PrefabUtility.InstantiatePrefab(prefab, npcRoot) as GameObject;
                if (instance == null)
                {
                    continue;
                }

                instance.name = spec.PrefabName;

                var anchor = GameObject.Find($"{AnchorRootName}/{spec.AnchorName}");
                var anchorTransform = anchor != null ? anchor.transform : null;

                var forward = anchorTransform != null ? anchorTransform.forward : Vector3.forward;
                var right = anchorTransform != null ? anchorTransform.right : Vector3.right;
                var position = anchorTransform != null ? anchorTransform.position : Vector3.zero;

                instance.transform.position = position + forward * spec.ForwardOffset + right * spec.RightOffset;
                if (anchorTransform != null)
                {
                    instance.transform.rotation = anchorTransform.rotation;
                }
            }

            EditorSceneManager.SaveScene(scene);
        }

        private static void EnsureFolder(string path)
        {
            var parts = path.Split('/');
            var current = parts[0];
            for (int i = 1; i < parts.Length; i++)
            {
                var next = $"{current}/{parts[i]}";
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, parts[i]);
                }
                current = next;
            }
        }

        private static void EnsureMaterialLibrary()
        {
            var targetFolder = $"{CharacterRoot}Materials";
            EnsureFolder(targetFolder);

            var sourceRoot = "Assets/ithappy/Creative_Characters/Materials";
            CopyMaterialIfMissing(sourceRoot, targetFolder, "Color.mat");
            CopyMaterialIfMissing(sourceRoot, targetFolder, "Material.mat");
            CopyMaterialIfMissing(sourceRoot, targetFolder, "Glass.mat");
            CopyMaterialIfMissing(sourceRoot, targetFolder, "Emission.mat");
        }

        private static void CopyMaterialIfMissing(string sourceRoot, string targetRoot, string materialName)
        {
            var targetPath = $"{targetRoot}/{materialName}";
            if (AssetDatabase.LoadAssetAtPath<Material>(targetPath) != null)
            {
                return;
            }

            var sourcePath = $"{sourceRoot}/{materialName}";
            if (AssetDatabase.LoadAssetAtPath<Material>(sourcePath) == null)
            {
                if (materialName == "Material.mat")
                {
                    sourcePath = $"{sourceRoot}/Color.mat";
                }
            }

            if (AssetDatabase.LoadAssetAtPath<Material>(sourcePath) != null)
            {
                AssetDatabase.CopyAsset(sourcePath, targetPath);
            }
        }

        private static List<RoleSpec> BuildRoleSpecs()
        {
            var specs = new List<RoleSpec>
            {
                new RoleSpec("NPC_Store_Clerk_A", "Store_Clerk_A", "Clerk", "친절하지만 규칙에 엄격함", "짧고 단호한 말투", false, "Assets/Data/World/NPCs/NPC_Store_Clerk_A.asset", "StoreBuilding", 1.4f, -0.6f, 1101),
                new RoleSpec("NPC_Store_Manager", "Store_Manager", "Manager", "매장 질서와 예외 처리를 담당", "차분하지만 단호한 말투", false, "Assets/Data/World/NPCs/NPC_Store_Manager.asset", "StoreBuilding", 1.4f, 0.6f, 1102),
                new RoleSpec("NPC_Studio_PM", "Studio_PM", "PM", "승인 절차와 일정에 집중", "차분하고 명확한 말투", false, "Assets/Data/World/NPCs/NPC_Studio_PM.asset", "StudioBuilding_L1", 1.6f, -0.6f, 1201),
                new RoleSpec("NPC_Studio_QA", "Studio_QA", "QA", "증거와 로그로 검증", "짧고 사실 중심 말투", false, "Assets/Data/World/NPCs/NPC_Studio_QA.asset", "StudioBuilding_L1", 1.6f, 0.6f, 1202),
                new RoleSpec("NPC_Park_Caretaker", "Park_Caretaker", "Caretaker", "질서와 민원 조정 담당", "정돈된 말투", false, "Assets/Data/World/NPCs/NPC_Park_Caretaker.asset", "ParkArea", 1.6f, -0.6f, 1301),
                new RoleSpec("NPC_Park_Elder", "Park_Elder", "Elder", "규범을 정리하고 경고", "엄격하고 고전적인 말투", false, "Assets/Data/World/NPCs/NPC_Park_Elder.asset", "ParkArea", 1.6f, 0.6f, 1302),

                new RoleSpec("NPC_Station_Officer", "Station_Officer", "Officer", "사건 처리와 판정 담당", "단호하고 빠른 말투", true, "Assets/Data/World/NPCs/NPC_Station_Officer.asset", "Station", 1.6f, -0.5f, 1401),
                new RoleSpec("NPC_Station_Investigator", "Station_Investigator", "Investigator", "증거 분석과 현장 확인", "짧고 분석적인 말투", true, "Assets/Data/World/NPCs/NPC_Station_Investigator.asset", "Station", 1.6f, 0.5f, 1402),

                new RoleSpec("NPC_Citizen_A", "Citizen_A", "Citizen", "평범한 주민", "짧고 자연스러운 말투", false, "Assets/Data/World/NPCs/NPC_Citizen_A.asset", "StoreBuilding", 2.1f, -1.0f, 2101),
                new RoleSpec("NPC_Citizen_B", "Citizen_B", "Citizen", "동네 상인", "친절한 말투", false, "Assets/Data/World/NPCs/NPC_Citizen_B.asset", "StoreBuilding", 2.1f, 1.0f, 2102),
                new RoleSpec("NPC_Citizen_C", "Citizen_C", "Citizen", "산책하는 주민", "느긋한 말투", false, "Assets/Data/World/NPCs/NPC_Citizen_C.asset", "ParkArea", 2.2f, -1.0f, 2201),
                new RoleSpec("NPC_Citizen_D", "Citizen_D", "Citizen", "카페 단골", "가벼운 말투", false, "Assets/Data/World/NPCs/NPC_Citizen_D.asset", "Cafe", 1.8f, 0.7f, 2301),
                new RoleSpec("NPC_Citizen_E", "Citizen_E", "Citizen", "스튜디오 방문객", "짧은 말투", false, "Assets/Data/World/NPCs/NPC_Citizen_E.asset", "StudioBuilding_L1", 2.0f, 0.9f, 2401),
                new RoleSpec("NPC_Citizen_F", "Citizen_F", "Citizen", "공원 방문객", "짧고 중립적인 말투", false, "Assets/Data/World/NPCs/NPC_Citizen_F.asset", "ParkArea", 2.2f, 1.0f, 2202)
            };

            return specs;
        }

        private sealed class RoleSpec
        {
            public string PrefabName { get; }
            public string NpcId { get; }
            public string RoleName { get; }
            public string Persona { get; }
            public string Tone { get; }
            public bool IsPolice { get; }
            public string DefinitionPath { get; }
            public string AnchorName { get; }
            public float ForwardOffset { get; }
            public float RightOffset { get; }
            public int Seed { get; }
            public bool PlaceInScene { get; }

            public RoleSpec(
                string prefabName,
                string npcId,
                string roleName,
                string persona,
                string tone,
                bool isPolice,
                string definitionPath,
                string anchorName,
                float forwardOffset,
                float rightOffset,
                int seed,
                bool placeInScene = true)
            {
                PrefabName = prefabName;
                NpcId = npcId;
                RoleName = roleName;
                Persona = persona;
                Tone = tone;
                IsPolice = isPolice;
                DefinitionPath = definitionPath;
                AnchorName = anchorName;
                ForwardOffset = forwardOffset;
                RightOffset = rightOffset;
                Seed = seed;
                PlaceInScene = placeInScene;
            }
        }
    }
}
