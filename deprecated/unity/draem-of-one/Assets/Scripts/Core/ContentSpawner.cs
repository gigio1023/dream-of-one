using System.Collections.Generic;
using UnityEngine;
#if UNITY_ADDRESSABLES
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;
#endif

namespace DreamOfOne.Core
{
    /// <summary>
    /// 콘텐츠 생성과 핸들 추적을 일원화한다.
    /// </summary>
    public sealed class ContentSpawner : MonoBehaviour
    {
        private readonly List<GameObject> spawned = new();
#if UNITY_ADDRESSABLES
        private readonly List<AsyncOperationHandle> handles = new();
#endif

        public IReadOnlyList<GameObject> Spawned => spawned;

        public void Register(GameObject instance)
        {
            if (instance != null)
            {
                spawned.Add(instance);
            }
        }

        public GameObject SpawnPrefab(GameObject prefab, Transform parent, Vector3 position, Quaternion rotation)
        {
            GameObject instance = prefab != null ? Instantiate(prefab, position, rotation, parent) : new GameObject("Spawned");
            spawned.Add(instance);
            return instance;
        }

#if UNITY_ADDRESSABLES
        public void TrackHandle(AsyncOperationHandle handle)
        {
            handles.Add(handle);
        }
#endif

        public void DespawnAll()
        {
            for (int i = spawned.Count - 1; i >= 0; i--)
            {
                if (spawned[i] != null)
                {
                    DestroyImmediate(spawned[i]);
                }
            }
            spawned.Clear();

#if UNITY_ADDRESSABLES
            for (int i = 0; i < handles.Count; i++)
            {
                Addressables.Release(handles[i]);
            }
            handles.Clear();
#endif
        }
    }
}
