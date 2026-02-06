using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class HouseColliderUtility
{
    private static readonly string[] HouseRootPaths =
    {
        "World_v2/World_v2_Environment/World_v2_House_Store",
        "World_v2/World_v2_Environment/World_v2_House_Studio",
        "World_v2/World_v2_Environment/World_v2_House_Station",
        "World_v2/World_v2_Environment/World_v2_House_Cafe",
    };

    private static readonly string[] InteriorRootPaths =
    {
        "World_Built/Interiors/Interior_Store",
        "World_Built/Interiors/Interior_Studio",
        "World_Built/Interiors/Interior_Police",
        "World_Built/Interiors/Interior_Cafe",
        "World_Built/Interiors/Interior_Park"
    };

    [MenuItem("Tools/DreamOfOne/Add House Colliders")]
    private static void AddHouseColliders()
    {
        var roots = new string[HouseRootPaths.Length + InteriorRootPaths.Length];
        HouseRootPaths.CopyTo(roots, 0);
        InteriorRootPaths.CopyTo(roots, HouseRootPaths.Length);

        var added = 0;
        foreach (var path in roots)
        {
            var root = GameObject.Find(path);
            if (root == null)
            {
                continue;
            }

            var renderers = root.GetComponentsInChildren<MeshRenderer>(true);
            foreach (var renderer in renderers)
            {
                var go = renderer.gameObject;
                if (go.GetComponent<Collider>() != null)
                {
                    continue;
                }

                var meshFilter = go.GetComponent<MeshFilter>();
                if (meshFilter != null && meshFilter.sharedMesh != null)
                {
                    go.AddComponent<MeshCollider>();
                }
                else
                {
                    go.AddComponent<BoxCollider>();
                }
                added++;
            }
        }

        if (added > 0)
        {
            EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        }

        Debug.Log($"House colliders added: {added}");
    }

    [MenuItem("Tools/DreamOfOne/Normalize House Colliders")]
    private static void NormalizeHouseColliders()
    {
        var converted = 0;
        var removed = 0;
        var unaffected = 0;

        foreach (var path in HouseRootPaths)
        {
            var root = GameObject.Find(path);
            if (root == null)
            {
                continue;
            }

            var colliders = root.GetComponentsInChildren<BoxCollider>(true);
            foreach (var box in colliders)
            {
                if (box == null || !HasNegativeLossyScale(box.transform))
                {
                    unaffected++;
                    continue;
                }

                var meshFilter = box.GetComponent<MeshFilter>();
                if (meshFilter != null && meshFilter.sharedMesh != null)
                {
                    var meshCollider = box.GetComponent<MeshCollider>();
                    if (meshCollider == null)
                    {
                        meshCollider = Undo.AddComponent<MeshCollider>(box.gameObject);
                    }

                    meshCollider.sharedMesh = meshFilter.sharedMesh;
                    meshCollider.sharedMaterial = box.sharedMaterial;
                    meshCollider.isTrigger = box.isTrigger;
                    meshCollider.convex = false;
                    Undo.DestroyObjectImmediate(box);
                    converted++;
                    continue;
                }

                Undo.DestroyObjectImmediate(box);
                removed++;
            }
        }

        if (converted + removed > 0)
        {
            EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        }

        Debug.Log($"House collider normalization complete. Converted={converted}, Removed={removed}, Unaffected={unaffected}");
    }

    private static bool HasNegativeLossyScale(Transform transform)
    {
        var scale = transform.lossyScale;
        return scale.x < 0f || scale.y < 0f || scale.z < 0f;
    }
}
