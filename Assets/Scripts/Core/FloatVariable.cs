using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    [CreateAssetMenu(menuName = "DreamOfOne/Core/Float Variable")]
    public class FloatVariable : ScriptableObject
    {
        [SerializeField] float value;
        public float Value => value;
        public event Action<float> OnChanged;

        public void SetValue(float newValue)
        {
            newValue = Mathf.Clamp01(newValue);
            if (Mathf.Approximately(value, newValue)) return;
            value = newValue;
            OnChanged?.Invoke(value);
        }
    }
}
