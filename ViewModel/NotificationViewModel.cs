namespace CSMS.ViewModel;

public class NotificationViewModel
{
    public int NotificationId { get; set; }

    public string Message { get; set; } = null!;

    public int VisitId { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }
}
