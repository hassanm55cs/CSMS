namespace CSMS.Dto.NotificationDto;

public sealed record VisitStatusChangedNotification(
    int VisitId,
    string Status);
