using System;
using UnityEngine;

namespace DreamOfOne.Core
{
    [CreateAssetMenu(menuName = "DreamOfOne/Core/Game Event Channel")]
    public class GameEventChannel : ScriptableObject
    {
        public event Action OnRaised;
        public event Action<string> OnRaisedWithPayload;
        public void Raise() => OnRaised?.Invoke();
        public void Raise(string payload) => OnRaisedWithPayload?.Invoke(payload);
    }
}
