using System;
using System.Reflection;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Builds NavMesh at runtime so the scene is playable without manual bake.
    /// </summary>
    [DefaultExecutionOrder(-1000)]
    public sealed class RuntimeNavMeshBaker : MonoBehaviour
    {
        [SerializeField]
        private MonoBehaviour surface = null;

        [SerializeField]
        private bool bakeOnAwake = true;

        private void Awake()
        {
            if (!bakeOnAwake)
            {
                return;
            }

            var resolvedSurface = surface != null ? surface : ResolveSurface();
            if (resolvedSurface == null)
            {
                return;
            }

            var buildMethod = resolvedSurface.GetType().GetMethod("BuildNavMesh", BindingFlags.Instance | BindingFlags.Public);
            buildMethod?.Invoke(resolvedSurface, null);
        }

        private static MonoBehaviour ResolveSurface()
        {
            var surfaceType = ResolveSurfaceType();
            if (surfaceType == null)
            {
                return null;
            }

            var surfaceObject = UnityEngine.Object.FindFirstObjectByType(surfaceType);
            return surfaceObject as MonoBehaviour;
        }

        private static Type ResolveSurfaceType()
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                var surfaceType = assembly.GetType("Unity.AI.Navigation.NavMeshSurface");
                if (surfaceType != null)
                {
                    return surfaceType;
                }
            }

            return null;
        }
    }
}
