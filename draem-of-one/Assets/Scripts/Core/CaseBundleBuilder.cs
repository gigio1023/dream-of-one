using System.Collections.Generic;
using UnityEngine;

namespace DreamOfOne.Core
{
    /// <summary>
    /// WEL과 신고를 바탕으로 사건 묶음을 구성한다.
    /// </summary>
    public sealed class CaseBundleBuilder
    {
        private readonly WorldEventLog eventLog;
        private readonly int recentWindow;

        public CaseBundleBuilder(WorldEventLog log, int window = 40)
        {
            eventLog = log;
            recentWindow = Mathf.Max(10, window);
        }

        public CaseBundle Build(ReportEnvelope report)
        {
            var bundle = new CaseBundle
            {
                caseId = report != null ? report.reportId : string.Empty,
                topic = report != null ? report.topic : string.Empty,
                placeId = report != null ? report.placeId : string.Empty,
                zoneId = report != null ? report.zoneId : string.Empty
            };

            if (eventLog == null)
            {
                bundle.RecalculateScore();
                return bundle;
            }

            var recent = eventLog.GetRecent(recentWindow);
            var attached = report != null ? report.attachedEventIds : null;

            foreach (var record in recent)
            {
                if (record == null)
                {
                    continue;
                }

                if (attached != null && attached.Count > 0 && !attached.Contains(record.id))
                {
                    if (!string.IsNullOrEmpty(bundle.topic) && record.topic != bundle.topic)
                    {
                        continue;
                    }
                }

                if (!string.IsNullOrEmpty(bundle.placeId) && record.placeId != bundle.placeId)
                {
                    continue;
                }

                switch (record.eventType)
                {
                    case EventType.ReportFiled:
                        bundle.reports.Add(record);
                        break;
                    case EventType.ViolationDetected:
                        bundle.violations.Add(record);
                        break;
                    case EventType.CctvCaptured:
                    case EventType.EvidenceCaptured:
                    case EventType.TicketIssued:
                        bundle.evidence.Add(record);
                        break;
                    case EventType.TaskStarted:
                    case EventType.TaskCompleted:
                    case EventType.ApprovalGranted:
                    case EventType.RcInserted:
                        bundle.procedures.Add(record);
                        break;
                    case EventType.StatementGiven:
                        bundle.statements.Add(record);
                        break;
                    case EventType.ExplanationGiven:
                        bundle.explanations.Add(record);
                        break;
                    case EventType.RebuttalGiven:
                        bundle.rebuttals.Add(record);
                        break;
                    case EventType.RumorShared:
                    case EventType.RumorConfirmed:
                    case EventType.RumorDebunked:
                        bundle.gossip.Add(record);
                        break;
                }
            }

            bundle.RecalculateScore();
            return bundle;
        }
    }
}
