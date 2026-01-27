using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class HouseColliderUtility
{
    [MenuItem("Tools/DreamOfOne/Add House Colliders")]
    private static void AddHouseColliders()
    {
        var roots = new[]
        {
            "World_v2/World_v2_Environment/World_v2_House_Store",
            "World_v2/World_v2_Environment/World_v2_House_Studio",
            "World_v2/World_v2_Environment/World_v2_House_Station",
            "World_v2/World_v2_Environment/World_v2_House_Cafe",
            "World_Built/Interiors/Interior_Store",
            "World_Built/Interiors/Interior_Studio",
            "World_Built/Interiors/Interior_Police",
            "World_Built/Interiors/Interior_Cafe",
            "World_Built/Interiors/Interior_Park"
        };

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
}
