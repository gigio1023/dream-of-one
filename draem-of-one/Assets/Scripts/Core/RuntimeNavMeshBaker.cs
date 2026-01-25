using System;
using System.Reflection;
using UnityEngine;
using UnityEngine.AI;

namespace DreamOfOne.Core
{
    /// <summary>
    /// Builds NavMesh at runtime so the scene is playable without manual bake.
    /// </summary>
    [DefaultExecutionOrder(-1000)]
    public sealed class RuntimeNavMeshBaker : MonoBehaviour
    {
        public static bool SkipRuntimeBakeForTests { get; set; }

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

            if (SkipRuntimeBakeForTests)
            {
                return;
            }

            var resolvedSurface = surface != null ? surface : ResolveSurface();
            if (resolvedSurface == null)
            {
                return;
            }

            if (HasNavMeshData())
            {
                return;
            }

            ConfigureSurfaceForRuntime(resolvedSurface);

            var buildMethod = resolvedSurface.GetType().GetMethod("BuildNavMesh", BindingFlags.Instance | BindingFlags.Public);
            buildMethod?.Invoke(resolvedSurface, null);
        }

        private static bool HasNavMeshData()
        {
            var triangulation = NavMesh.CalculateTriangulation();
            return triangulation.vertices != null && triangulation.vertices.Length > 0;
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

        private static void ConfigureSurfaceForRuntime(MonoBehaviour resolvedSurface)
        {
            if (resolvedSurface == null)
            {
                return;
            }

            var surfaceType = resolvedSurface.GetType();
            var useGeometryProperty = surfaceType.GetProperty("useGeometry", BindingFlags.Instance | BindingFlags.Public);
            if (useGeometryProperty == null || !useGeometryProperty.CanWrite)
            {
                return;
            }

            var enumType = useGeometryProperty.PropertyType;
            if (!enumType.IsEnum)
            {
                return;
            }

            try
            {
                var physicsColliders = Enum.Parse(enumType, "PhysicsColliders");
                useGeometryProperty.SetValue(resolvedSurface, physicsColliders);
            }
            catch
            {
                // Ignore if enum value not found in this package version.
            }
        }
    }
}
