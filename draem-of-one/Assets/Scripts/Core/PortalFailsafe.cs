namespace DreamOfOne.Core
{
    public static class PortalFailsafe
    {
        public static bool ShouldReturn(bool isInside, float secondsInside, float maxInsideSeconds, bool hasFallback)
        {
            if (!isInside || !hasFallback)
            {
                return false;
            }

            return secondsInside >= maxInsideSeconds;
        }
    }
}
