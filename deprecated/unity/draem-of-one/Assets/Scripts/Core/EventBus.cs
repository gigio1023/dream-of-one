using System;

namespace DreamOfOne.Core
{
    /// <summary>
    /// 도메인 이벤트 전달용 경량 버스.
    /// </summary>
    public static class EventBus
    {
        public static event Action<EventRecord> OnEvent;

        public static void Publish(EventRecord record)
        {
            OnEvent?.Invoke(record);
        }
    }
}
