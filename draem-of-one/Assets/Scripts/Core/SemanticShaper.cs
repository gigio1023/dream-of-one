using System.Text;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// EventRecord를 한국어 한 줄 문장으로 변환하는 책임을 가진다.
    /// 추후 톤이나 다국어가 필요하면 이 스크립트만 교체하면 된다.
    /// </summary>
    public sealed class SemanticShaper : MonoBehaviour
    {
        /// <summary>
        /// 이벤트 타입에 맞는 간단한 한국어 문장을 만들어 반환한다.
        /// </summary>
        public string ToText(EventRecord record)
        {
            var builder = new StringBuilder();

            switch (record.eventType)
            {
                case EventType.EnteredZone:
                    builder.Append($"{record.actorId}이(가) {record.zoneId} 구역에 들어왔습니다.");
                    AppendLocation(builder, record);
                    break;
                case EventType.ExitedZone:
                    builder.Append($"{record.actorId}이(가) {record.zoneId} 구역을 떠났습니다.");
                    AppendLocation(builder, record);
                    break;
                case EventType.ViolationDetected:
                    builder.Append($"{record.actorId} 규칙 위반 {record.ruleId} 감지.");
                    AppendLocation(builder, record);
                    break;
                case EventType.SuspicionUpdated:
                    builder.Append($"{record.actorId} 의심도 변화: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.ReportFiled:
                    builder.Append($"{record.actorId}이(가) {record.ruleId} 관련 신고를 제출했습니다.");
                    AppendLocation(builder, record);
                    break;
                case EventType.InterrogationStarted:
                    builder.Append("경찰 심문이 시작되었습니다.");
                    AppendLocation(builder, record);
                    break;
                case EventType.VerdictGiven:
                    builder.Append($"판정: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.StatementGiven:
                    builder.Append($"진술: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.ExplanationGiven:
                    builder.Append($"해명: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.RebuttalGiven:
                    builder.Append($"반박: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.NpcUtterance:
                    builder.Append($"{record.actorId}: {record.note}");
                    break;
                case EventType.RumorShared:
                    builder.Append($"소문: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.RumorConfirmed:
                    builder.Append($"소문 확정: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.RumorDebunked:
                    builder.Append($"소문 반박: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.EvidenceCaptured:
                    builder.Append($"증거 확보: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.TicketIssued:
                    builder.Append($"티켓 발부: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.CctvCaptured:
                    builder.Append($"CCTV 캡처: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.TaskStarted:
                    builder.Append($"업무 시작: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.TaskCompleted:
                    builder.Append($"업무 완료: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.ApprovalGranted:
                    builder.Append($"승인 완료: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.RcInserted:
                    builder.Append($"RC 반영: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.LabelChanged:
                    builder.Append($"라벨 갱신: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.PaymentProcessed:
                    builder.Append($"결제 처리: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.QueueUpdated:
                    builder.Append($"줄 정리: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.SeatClaimed:
                    builder.Append($"좌석 사용: {record.note}");
                    AppendLocation(builder, record);
                    break;
                case EventType.NoiseObserved:
                    builder.Append($"소음 민원: {record.note}");
                    AppendLocation(builder, record);
                    break;
                default:
                    builder.Append($"{record.eventType} 이벤트");
                    break;
            }

            if (!string.IsNullOrEmpty(record.note) &&
                builder.Length > 0 &&
                record.eventType is not (EventType.VerdictGiven or EventType.SuspicionUpdated or EventType.NpcUtterance
                    or EventType.RumorShared or EventType.RumorConfirmed or EventType.RumorDebunked
                    or EventType.StatementGiven or EventType.ExplanationGiven or EventType.RebuttalGiven))
            {
                builder.Append($" ({record.note})");
            }

            return DialogueLineLimiter.ClampLine(builder.ToString(), 80);
        }

        private static void AppendLocation(StringBuilder builder, EventRecord record)
        {
            if (record == null || builder == null)
            {
                return;
            }

            string place = string.IsNullOrEmpty(record.placeId) ? record.zoneId : record.placeId;
            if (!string.IsNullOrEmpty(place))
            {
                builder.Append($" [{place}]");
            }
        }
    }
}
