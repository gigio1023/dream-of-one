namespace DreamOfOne.Core
{
    /// <summary>
    /// WEL(WorldEventLog)에서 사용되는 모든 이벤트 유형을 정의한다.
    /// 규범 위반 루프의 전 과정을 단일 열거형으로 관리하기 위한 것이다.
    /// </summary>
    public enum EventType
    {
        EnteredZone,
        ExitedZone,
        ViolationDetected,
        SuspicionUpdated,
        ReportFiled,
        InterrogationStarted,
        VerdictGiven,
        StatementGiven,
        ExplanationGiven,
        RebuttalGiven,
        NpcUtterance,
        RumorShared,
        RumorConfirmed,
        RumorDebunked,
        EvidenceCaptured,
        TicketIssued,
        TaskStarted,
        TaskCompleted,
        ApprovalGranted,
        RcInserted,
        LabelChanged,
        PaymentProcessed,
        QueueUpdated,
        SeatClaimed,
        NoiseObserved,
        CctvCaptured,
        ExposureUpdated
    }
}
