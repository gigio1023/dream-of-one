namespace DreamOfOne.Core
{
    public interface IInteractable
    {
        string GetPrompt(InteractContext context);
        bool CanInteract(InteractContext context);
        void Interact(InteractContext context);
        string GetWorldStateSummary();
    }
}
