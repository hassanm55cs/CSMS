using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CSMS.Hubs;

[Authorize(Roles = "customer")]
public sealed class NotificationHub : Hub
{
    public const string Route = "/hubs/notifications";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (string.IsNullOrWhiteSpace(userId))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(userId));
        await base.OnConnectedAsync();
    }

    public static string GroupName(string userId) => $"user:{userId}";
}
