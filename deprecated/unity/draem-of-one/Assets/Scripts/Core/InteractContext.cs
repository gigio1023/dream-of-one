using UnityEngine;

namespace DreamOfOne.Core
{
    public readonly struct InteractContext
    {
        public string ActorId { get; }
        public string ActorRole { get; }
        public Vector3 ActorPosition { get; }

        public InteractContext(string actorId, string actorRole, Vector3 actorPosition)
        {
            ActorId = actorId;
            ActorRole = actorRole;
            ActorPosition = actorPosition;
        }
    }
}
