namespace DreamOfOne.Core
{
    public struct DialogueResult
    {
        public string utterance;
        public string hintTag;
        public int deltaSuspicion;

        public DialogueResult(string utterance, string hintTag, int deltaSuspicion)
        {
            this.utterance = utterance;
            this.hintTag = hintTag;
            this.deltaSuspicion = deltaSuspicion;
        }
    }
}


