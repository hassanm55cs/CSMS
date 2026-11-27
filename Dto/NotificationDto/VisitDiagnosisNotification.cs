namespace CSMS.Dto.NotificationDto;

public sealed record VisitDiagnosisNotification(
    int NotificationId,
    int VisitId,
    string Message,
    DateTime CreatedAt,
    bool ConfirmationPending = true);
