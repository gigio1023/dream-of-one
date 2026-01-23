using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    [DisallowMultipleComponent]
    public sealed class ActorGrounding : MonoBehaviour
    {
        [SerializeField]
        private bool alignVisualMesh = true;

        [SerializeField]
        private bool alignCapsuleCollider = true;

        [SerializeField]
        private bool alignCharacterController = true;

        [SerializeField]
        private float minVisualOffset = 0.01f;

        private void Awake()
        {
            Apply();
        }

        public void Apply()
        {
            if (alignCapsuleCollider)
            {
                AlignCapsuleCollider();
            }

            if (alignCharacterController)
            {
                AlignCharacterController();
            }

            if (alignVisualMesh)
            {
                EnsureVisualOffset();
            }
        }

        private void AlignCapsuleCollider()
        {
            var capsule = GetComponent<CapsuleCollider>();
            if (capsule == null)
            {
                return;
            }

            if (capsule.center.y > 0.001f)
            {
                return;
            }

            capsule.center = new Vector3(capsule.center.x, capsule.height * 0.5f, capsule.center.z);
        }

        private void AlignCharacterController()
        {
            var controller = GetComponent<CharacterController>();
            if (controller == null)
            {
                return;
            }

            if (controller.center.y > 0.001f)
            {
                return;
            }

            controller.center = new Vector3(controller.center.x, controller.height * 0.5f, controller.center.z);
        }

        private void EnsureVisualOffset()
        {
            if (HasChildRenderer())
            {
                DisableRootRenderer();
                return;
            }

            var meshFilter = GetComponent<MeshFilter>();
            var meshRenderer = GetComponent<MeshRenderer>();
            if (meshFilter == null || meshRenderer == null)
            {
                return;
            }

            var existingVisual = transform.Find("Visual");
            if (existingVisual != null)
            {
                DisableRootRenderer();
                return;
            }

            var mesh = meshFilter.sharedMesh;
            if (mesh == null)
            {
                return;
            }

            var bounds = mesh.bounds;
            float offset = -bounds.min.y;
            if (offset < minVisualOffset)
            {
                return;
            }

            var visual = new GameObject("Visual");
            visual.transform.SetParent(transform, false);
            visual.transform.localPosition = new Vector3(0f, offset, 0f);
            visual.transform.localRotation = Quaternion.identity;
            visual.transform.localScale = Vector3.one;

            var childFilter = visual.AddComponent<MeshFilter>();
            childFilter.sharedMesh = mesh;

            var childRenderer = visual.AddComponent<MeshRenderer>();
            childRenderer.sharedMaterials = meshRenderer.sharedMaterials;
            childRenderer.shadowCastingMode = meshRenderer.shadowCastingMode;
            childRenderer.receiveShadows = meshRenderer.receiveShadows;
            childRenderer.lightProbeUsage = meshRenderer.lightProbeUsage;
            childRenderer.reflectionProbeUsage = meshRenderer.reflectionProbeUsage;
            childRenderer.motionVectorGenerationMode = meshRenderer.motionVectorGenerationMode;

            DisableRootRenderer();
        }

        private bool HasChildRenderer()
        {
            var renderers = GetComponentsInChildren<Renderer>(true);
            for (int i = 0; i < renderers.Length; i++)
            {
                if (renderers[i] != null && renderers[i].gameObject != gameObject)
                {
                    return true;
                }
            }

            return false;
        }

        private void DisableRootRenderer()
        {
            var meshRenderer = GetComponent<MeshRenderer>();
            if (meshRenderer != null)
            {
                meshRenderer.enabled = false;
            }
        }
    }
}
