using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace DreamOfOne.EditModeTests
{
    public sealed class NpcPrefabEditModeTests
    {
        [Test]
        public void NpcPrefabsHaveVisualChildren()
        {
            AssertPrefabHasVisual("Assets/Data/Prefabs/NPC_Citizen.prefab");
            AssertPrefabHasVisual("Assets/Data/Prefabs/NPC_Police.prefab");
        }

        private static void AssertPrefabHasVisual(string path)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            Assert.NotNull(prefab, $"Missing prefab at {path}");

            var rootRenderer = prefab.GetComponent<MeshRenderer>();
            if (rootRenderer != null)
            {
                Assert.IsFalse(rootRenderer.enabled, $"Root renderer should be disabled in {path}");
            }

            var childRenderer = prefab.GetComponentInChildren<Renderer>(true);
            Assert.NotNull(childRenderer, $"Prefab {path} missing visual renderer");

            var animator = prefab.GetComponent<Animator>();
            Assert.NotNull(animator, $"Prefab {path} missing Animator");
        }
    }
}
