using System.Collections.Generic;
using DreamOfOne.NPC;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 실내 공간과 포탈을 런타임에 구성한다.
    /// </summary>
    public sealed class InteriorBootstrap : MonoBehaviour
    {
        private static readonly List<InteriorPortal> exteriorPortals = new();

        private static readonly InteriorSpec[] specs =
        {
            new("StoreBuilding", new Vector3(10f, 3f, 10f)),
            new("StudioBuilding_L1", new Vector3(10f, 3f, 10f)),
            new("Cafe", new Vector3(8f, 3f, 8f)),
            new("Station", new Vector3(9f, 3f, 9f)),
            new("Facility", new Vector3(9f, 3f, 9f))
        };

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureBootstrap()
        {
            if (FindFirstObjectByType<InteriorBootstrap>() != null)
            {
                return;
            }

            var host = new GameObject("InteriorBootstrap");
            host.AddComponent<InteriorBootstrap>();
        }

        private void Awake()
        {
            BuildInteriors();
            AttachNpcRoutines();
        }

        private void BuildInteriors()
        {
            var anchors = GameObject.Find("CITY_Anchors");
            if (anchors == null)
            {
                return;
            }

            var existing = GameObject.Find("Interiors");
            if (existing != null)
            {
                var existingPortalRoot = GameObject.Find("InteriorPortals");
                CollectPortals(existingPortalRoot != null ? existingPortalRoot.transform : existing.transform);
                return;
            }

            var interiorRoot = new GameObject("Interiors");
            interiorRoot.transform.position = new Vector3(0f, 0f, 80f);

            var portalRoot = new GameObject("InteriorPortals");
            portalRoot.transform.position = Vector3.zero;

            exteriorPortals.Clear();

            for (int i = 0; i < specs.Length; i++)
            {
                var spec = specs[i];
                var anchor = GameObject.Find($"CITY_Anchors/{spec.AnchorName}");
                if (anchor == null)
                {
                    continue;
                }

                Vector3 roomBase = interiorRoot.transform.position + new Vector3(i * 18f, 0f, 0f);
                var room = BuildRoom(interiorRoot.transform, spec.AnchorName, roomBase, spec.RoomSize);

                var insideSpawn = new GameObject($"{spec.AnchorName}_InsideSpawn");
                insideSpawn.transform.SetParent(room.transform);
                insideSpawn.transform.localPosition = new Vector3(0f, 0.5f, -spec.RoomSize.z * 0.35f);

                var outsideSpawn = new GameObject($"{spec.AnchorName}_OutsideSpawn");
                outsideSpawn.transform.SetParent(portalRoot.transform);
                outsideSpawn.transform.position = anchor.transform.position + anchor.transform.forward * 2.2f + Vector3.up * 0.5f;
                outsideSpawn.transform.rotation = anchor.transform.rotation;

                var exteriorPortal = CreatePortal(portalRoot.transform, $"{spec.AnchorName}_Portal_Exterior", outsideSpawn.transform.position, anchor.transform.rotation, false);
                var interiorPortal = CreatePortal(room.transform, $"{spec.AnchorName}_Portal_Interior", new Vector3(0f, 0.1f, -spec.RoomSize.z * 0.5f + 0.6f) + room.transform.position, room.transform.rotation, true);

                exteriorPortal.Configure(interiorPortal, insideSpawn.transform, inside: false, autoReturnSeconds: 6f);
                interiorPortal.Configure(exteriorPortal, outsideSpawn.transform, inside: true, autoReturnSeconds: 6f);

                CreatePortalMarker(portalRoot.transform, $"{spec.AnchorName}_PortalMarker", outsideSpawn.transform.position, anchor.transform.rotation);

                exteriorPortals.Add(exteriorPortal);
            }
        }

        private static GameObject BuildRoom(Transform parent, string name, Vector3 basePosition, Vector3 size)
        {
            var room = new GameObject($"Interior_{name}");
            room.transform.SetParent(parent);
            room.transform.position = basePosition;

            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Floor";
            floor.transform.SetParent(room.transform);
            floor.transform.localScale = new Vector3(size.x, 0.2f, size.z);
            floor.transform.localPosition = new Vector3(0f, 0f, 0f);

            var ceiling = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ceiling.name = "Ceiling";
            ceiling.transform.SetParent(room.transform);
            ceiling.transform.localScale = new Vector3(size.x, 0.2f, size.z);
            ceiling.transform.localPosition = new Vector3(0f, size.y, 0f);

            BuildWall(room.transform, "Wall_N", new Vector3(0f, size.y * 0.5f, size.z * 0.5f), new Vector3(size.x, size.y, 0.2f));
            BuildDoorwayWall(room.transform, size);
            BuildWall(room.transform, "Wall_E", new Vector3(size.x * 0.5f, size.y * 0.5f, 0f), new Vector3(0.2f, size.y, size.z));
            BuildWall(room.transform, "Wall_W", new Vector3(-size.x * 0.5f, size.y * 0.5f, 0f), new Vector3(0.2f, size.y, size.z));

            return room;
        }

        private static void BuildWall(Transform parent, string name, Vector3 localPosition, Vector3 localScale)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = name;
            wall.transform.SetParent(parent);
            wall.transform.localPosition = localPosition;
            wall.transform.localScale = localScale;
        }

        private static void BuildDoorwayWall(Transform parent, Vector3 size)
        {
            float doorWidth = 2.2f;
            float doorHeight = 2.2f;
            float wallDepth = 0.2f;

            float sideWidth = Mathf.Max(0.5f, (size.x - doorWidth) * 0.5f);
            float zPos = -size.z * 0.5f;

            BuildWall(parent, "Wall_S_Left", new Vector3(-(doorWidth * 0.5f + sideWidth * 0.5f), size.y * 0.5f, zPos), new Vector3(sideWidth, size.y, wallDepth));
            BuildWall(parent, "Wall_S_Right", new Vector3(doorWidth * 0.5f + sideWidth * 0.5f, size.y * 0.5f, zPos), new Vector3(sideWidth, size.y, wallDepth));

            float topHeight = Mathf.Max(0.2f, size.y - doorHeight);
            BuildWall(parent, "Wall_S_Top", new Vector3(0f, doorHeight + topHeight * 0.5f, zPos), new Vector3(doorWidth, topHeight, wallDepth));
        }

        private static InteriorPortal CreatePortal(Transform parent, string name, Vector3 position, Quaternion rotation, bool inside)
        {
            var portalObject = new GameObject(name);
            portalObject.transform.SetParent(parent);
            portalObject.transform.position = position;
            portalObject.transform.rotation = rotation;

            var collider = portalObject.AddComponent<BoxCollider>();
            collider.isTrigger = true;
            collider.size = new Vector3(2.2f, 2.6f, 1.6f);

            var portal = portalObject.AddComponent<InteriorPortal>();
            portal.Configure(null, null, inside, autoReturnSeconds: 6f);
            return portal;
        }

        private static void CreatePortalMarker(Transform parent, string name, Vector3 position, Quaternion rotation)
        {
            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = name;
            marker.transform.SetParent(parent);
            marker.transform.position = position;
            marker.transform.rotation = rotation;
            marker.transform.localScale = new Vector3(1.4f, 2.2f, 0.1f);

            var collider = marker.GetComponent<Collider>();
            if (collider != null)
            {
                Object.Destroy(collider);
            }

            var renderer = marker.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                renderer.material.color = new Color(0.05f, 0.05f, 0.05f, 1f);
            }
        }

        private static void CollectPortals(Transform root)
        {
            exteriorPortals.Clear();
            foreach (var portal in root.GetComponentsInChildren<InteriorPortal>(true))
            {
                if (portal != null && !portal.MarksInside)
                {
                    exteriorPortals.Add(portal);
                }
            }
        }

        private void AttachNpcRoutines()
        {
            var patrols = FindObjectsByType<SimplePatrol>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            foreach (var patrol in patrols)
            {
                if (patrol == null)
                {
                    continue;
                }

                if (patrol.GetComponent<NpcInteriorRoutine>() == null)
                {
                    patrol.gameObject.AddComponent<NpcInteriorRoutine>().Configure(exteriorPortals);
                }
            }

            var police = FindObjectsByType<PoliceController>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            foreach (var officer in police)
            {
                if (officer == null)
                {
                    continue;
                }

                if (officer.GetComponent<NpcInteriorRoutine>() == null)
                {
                    officer.gameObject.AddComponent<NpcInteriorRoutine>().Configure(exteriorPortals);
                }
            }
        }

        private readonly struct InteriorSpec
        {
            public readonly string AnchorName;
            public readonly Vector3 RoomSize;

            public InteriorSpec(string anchorName, Vector3 roomSize)
            {
                AnchorName = anchorName;
                RoomSize = roomSize;
            }
        }
    }
}
