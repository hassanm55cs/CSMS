using CSMS.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CSMS.Hubs;

[Authorize(Roles = "customer,driver")]
public sealed class NotificationHub : Hub
{
    public const string Route = "/hubs/notifications";
    private readonly ApplicationDbContext _context;

    public NotificationHub(ApplicationDbContext context)
    {
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrWhiteSpace(userId))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(userId));

        if (Context.User?.IsInRole("driver") == true)
        {
            var branchId = await _context.Drivers
                .AsNoTracking()
                .Where(d => d.UserId == userId)
                .Select(d => (int?)d.BranchId)
                .FirstOrDefaultAsync();

            if (branchId.HasValue)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, BranchGroupName(branchId.Value));
            }
        }

        await base.OnConnectedAsync();
    }

    public static string GroupName(string userId) => $"user:{userId}";

    public static string BranchGroupName(int branchId) => $"branch:{branchId}";
}
