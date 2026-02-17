using DreamOfOne.Core;

namespace DreamOfOne.UI
{
    public static class LandmarkChecklistRules
    {
        public static readonly string[] RequiredPlaces = { "Store", "Studio", "Park", "Station" };

        public static bool TryGetCompletionPlace(EventRecord record, out string place)
        {
            place = string.Empty;
            if (record == null)
            {
                return false;
            }

            if (!string.Equals(record.actorId, "Player", System.StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!IsActionCompletionEventType(record.eventType))
            {
                return false;
            }

            place = ResolvePlace(record);
            return !string.IsNullOrEmpty(place);
        }

        public static string ResolvePlace(EventRecord record)
        {
            if (record == null)
            {
                return string.Empty;
            }

            string place = ResolvePlaceFromText(record.placeId);
            if (!string.IsNullOrEmpty(place))
            {
                return place;
            }

            place = ResolvePlaceFromText(record.zoneId);
            if (!string.IsNullOrEmpty(place))
            {
                return place;
            }

            place = ResolvePlaceFromText(record.topic);
            if (!string.IsNullOrEmpty(place))
            {
                return place;
            }

            return ResolvePlaceFromText(record.actorId);
        }

        public static string ResolvePlaceFromAnchor(string anchorName)
        {
            return ResolvePlaceFromText(anchorName);
        }

        public static string ResolvePlaceFromText(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            if (value.IndexOf("Store", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Store";
            }

            if (value.IndexOf("Studio", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Studio";
            }

            if (value.IndexOf("Park", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Park";
            }

            if (value.IndexOf("Police", System.StringComparison.OrdinalIgnoreCase) >= 0 ||
                value.IndexOf("Station", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Station";
            }

            return string.Empty;
        }

        private static bool IsActionCompletionEventType(EventType eventType)
        {
            switch (eventType)
            {
                case EventType.ViolationDetected:
                case EventType.StatementGiven:
                case EventType.ExplanationGiven:
                case EventType.RebuttalGiven:
                case EventType.EvidenceCaptured:
                case EventType.TicketIssued:
                case EventType.TaskStarted:
                case EventType.TaskCompleted:
                case EventType.ApprovalGranted:
                case EventType.RcInserted:
                case EventType.LabelChanged:
                case EventType.PaymentProcessed:
                case EventType.QueueUpdated:
                case EventType.SeatClaimed:
                    return true;
                default:
                    return false;
            }
        }
    }
}
