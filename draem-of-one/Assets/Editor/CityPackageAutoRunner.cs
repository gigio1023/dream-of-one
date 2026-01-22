#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace DreamOfOne.Editor
{
    [InitializeOnLoad]
    public static class CityPackageAutoRunner
    {
        private const string PrefKey = "DreamOfOne.CityBuilt";
        private const string ScenePath = "Assets/Scenes/Prototype.unity";

        static CityPackageAutoRunner()
        {
            EditorApplication.delayCall += TryAutoBuild;
        }

        public static bool EnsureCityBuilt(List<string> warnings = null, List<string> errors = null)
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return false;
            }

            if (!File.Exists(ScenePath))
            {
                errors?.Add($"Missing scene: {ScenePath}");
                return false;
            }

            var activeScene = SceneManager.GetActiveScene();
            if (activeScene.path != ScenePath)
            {
                warnings?.Add("Active scene is not Prototype. Opening Prototype scene for CITY build.");
                EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            }

            if (GameObject.Find("CITY_Package") == null)
            {
                CityPackageSceneBuilder.BuildCity();
            }

            if (GameObject.Find("CITY_Package") == null)
            {
                errors?.Add("CITY_Package root still missing after build.");
                return false;
            }

            return true;
        }

        private static void TryAutoBuild()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                return;
            }

            if (EditorPrefs.GetBool(PrefKey, false))
            {
                return;
            }

            if (!File.Exists(ScenePath))
            {
                return;
            }

            EnsureCityBuilt();
            CityMaterialFixer.FixCityMaterials();
            EditorPrefs.SetBool(PrefKey, GameObject.Find("CITY_Package") != null);
        }
    }
}
#endif
