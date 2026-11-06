using CSMS.Data;
using CSMS.Dto;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Notification_serv;

public class NotificationService
{
    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedViewModel<NotificationViewModel>> GetNotificationsAsync(
        string userId,
        NotificationListQueryDto query)
    {
        var notifications = _context.Notifications
            .AsNoTracking()
            .Where(notification =>
                notification.Customer.UserId == userId ||
                notification.Employee.UserId == userId);

        if (query.UnreadOnly)
        {
            notifications = notifications.Where(notification => !notification.IsRead);
        }

        var totalCount = await notifications.CountAsync();
        var data = await notifications
            .OrderByDescending(notification => notification.CreatedAt)
            .ThenByDescending(notification => notification.NotificationId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(notification => new NotificationViewModel
            {
                NotificationId = notification.NotificationId,
                Message = notification.Message,
                VisitId = notification.VisitId,
                IsRead = notification.IsRead,
                CreatedAt = notification.CreatedAt
            })
            .ToListAsync();

        return new PagedViewModel<NotificationViewModel>
        {
            Data = data,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<bool> MarkAsReadAsync(string userId, int notificationId)
    {
        var notification = await _context.Notifications
            .SingleOrDefaultAsync(item =>
                item.NotificationId == notificationId &&
                (item.Customer.UserId == userId || item.Employee.UserId == userId));
        if (notification is null)
        {
            return false;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    public Task<int> MarkAllAsReadAsync(string userId)
    {
        return _context.Notifications
            .Where(notification =>
                !notification.IsRead &&
                (notification.Customer.UserId == userId ||
                 notification.Employee.UserId == userId))
            .ExecuteUpdateAsync(update => update.SetProperty(
                notification => notification.IsRead,
                true));
    }
}
