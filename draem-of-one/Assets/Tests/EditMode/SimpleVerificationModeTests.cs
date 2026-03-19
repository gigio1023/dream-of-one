using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using DreamOfOne.LucidCover;
using DreamOfOne.World;
using NUnit.Framework;
using UnityEngine;

namespace DreamOfOne.Tests
{
    public class SimpleVerificationModeTests
    {
        [Test]
        public void SimpleSeederProfile_UsesExpectedConstantsAndSets()
        {
            var seederType = FindType("DreamOfOne.Editor.WorldDefinitionSeeder");
            Assert.NotNull(seederType, "WorldDefinitionSeeder type not found.");

            int npcMax = ReadIntConstant(seederType, "SimpleVerificationNpcMax");
            int nonPoliceSpawnCount = ReadIntConstant(seederType, "SimpleVerificationNonPoliceSpawnCount");
            int buildingCount = ReadIntConstant(seederType, "SimpleVerificationBuildingCount");
            int interactableCount = ReadIntConstant(seederType, "SimpleVerificationInteractableCount");

            Assert.AreEqual(10, npcMax, "Simple verification npcMax should remain 10.");
            Assert.AreEqual(1, nonPoliceSpawnCount, "Simple verification non-police spawn count should be 1.");
            Assert.AreEqual(4, buildingCount, "Simple verification building count should remain 4.");
            Assert.AreEqual(20, interactableCount, "Simple verification interactable count should remain 20.");

            var buildingIds = ReadStringSetProperty(seederType, "SimpleVerificationBuildingIds");
            var interactableIds = ReadStringSetProperty(seederType, "SimpleVerificationInteractableIds");

            CollectionAssert.AreEquivalent(new[] { "Store", "Studio", "Police", "Park" }, buildingIds);
            Assert.AreEqual(buildingCount, buildingIds.Count, "Building count constant should match building id set size.");
            Assert.AreEqual(interactableCount, interactableIds.Count, "Interactable count constant should match interactable id set size.");
        }

        [Test]
        public void RequiredAnchorCollection_IncludesAnchorsFromWorldDefinitionsAndTextSurfaces()
        {
            var world = ScriptableObject.CreateInstance<WorldDefinition>();
            var building = ScriptableObject.CreateInstance<BuildingDefinition>();
            var interactable = ScriptableObject.CreateInstance<InteractableDefinition>();
            var npc = ScriptableObject.CreateInstance<NpcDefinition>();
            var textSurface = ScriptableObject.CreateInstance<TextSurfaceDefinition>();
            var textSurfaceDb = ScriptableObject.CreateInstance<TextSurfaceDatabase>();

            var created = new ScriptableObject[] { world, building, interactable, npc, textSurface, textSurfaceDb };
            try
            {
                TestHelpers.SetPrivateField(building, "anchorName", "StoreBuilding");
                TestHelpers.SetPrivateField(interactable, "anchorName", " StudioBuilding_L1 ");
                TestHelpers.SetPrivateField(npc, "anchorName", "Station");
                TestHelpers.SetPrivateField(textSurface, "anchorName", "ParkArea");

                TestHelpers.SetPrivateField(textSurfaceDb, "textSurfaces", new List<TextSurfaceDefinition>
                {
                    textSurface
                });

                TestHelpers.SetPrivateField(world, "buildings", new List<BuildingDefinition>
                {
                    building
                });
                TestHelpers.SetPrivateField(world, "interactables", new List<InteractableDefinition>
                {
                    interactable
                });
                TestHelpers.SetPrivateField(world, "npcs", new List<NpcDefinition>
                {
                    npc
                });
                TestHelpers.SetPrivateField(world, "textSurfaceDatabase", textSurfaceDb);

                var anchors = InvokeRequiredAnchorCollection(world);

                CollectionAssert.AreEquivalent(
                    new[] { "StoreBuilding", "StudioBuilding_L1", "Station", "ParkArea" },
                    anchors);
            }
            finally
            {
                for (int i = 0; i < created.Length; i++)
                {
                    if (created[i] != null)
                    {
                        UnityEngine.Object.DestroyImmediate(created[i]);
                    }
                }
            }
        }

        private static IReadOnlyCollection<string> InvokeRequiredAnchorCollection(WorldDefinition world)
        {
            var diagnosticsType = FindType("DreamOfOne.Editor.DreamOfOneDiagnostics");
            Assert.NotNull(diagnosticsType, "DreamOfOneDiagnostics type not found.");

            var method = diagnosticsType.GetMethod("CollectRequiredAnchorNames", BindingFlags.Public | BindingFlags.Static);
            Assert.NotNull(method, "CollectRequiredAnchorNames helper not found.");

            var result = method.Invoke(null, new object[] { world }) as IEnumerable<string>;
            Assert.NotNull(result, "CollectRequiredAnchorNames should return an anchor collection.");
            return new HashSet<string>(result, StringComparer.OrdinalIgnoreCase);
        }

        private static Type FindType(string fullName)
        {
            var assemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (int i = 0; i < assemblies.Length; i++)
            {
                var type = assemblies[i].GetType(fullName, throwOnError: false, ignoreCase: false);
                if (type != null)
                {
                    return type;
                }
            }

            return null;
        }

        private static int ReadIntConstant(Type ownerType, string fieldName)
        {
            var field = ownerType.GetField(fieldName, BindingFlags.Public | BindingFlags.Static);
            Assert.NotNull(field, $"Missing constant field: {fieldName}");

            if (field.IsLiteral)
            {
                return (int)field.GetRawConstantValue();
            }

            return (int)field.GetValue(null);
        }

        private static IReadOnlyCollection<string> ReadStringSetProperty(Type ownerType, string propertyName)
        {
            var property = ownerType.GetProperty(propertyName, BindingFlags.Public | BindingFlags.Static);
            Assert.NotNull(property, $"Missing property: {propertyName}");

            var value = property.GetValue(null) as IEnumerable<string>;
            Assert.NotNull(value, $"Property {propertyName} should return a string collection.");

            return new HashSet<string>(value.Where(entry => !string.IsNullOrWhiteSpace(entry)).Select(entry => entry.Trim()), StringComparer.OrdinalIgnoreCase);
        }
    }
}
