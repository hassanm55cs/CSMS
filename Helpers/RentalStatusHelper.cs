using CSMS.Enums;

namespace CSMS.Helper;

public static class RentalStatusHelper
{
    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    // Only cancellation is stored; the rest is derived from the rental dates.
    public static RentalStatus Resolve(bool isCancelled, DateOnly start, DateOnly end, DateOnly today)
    {
        if (isCancelled)
        {
            return RentalStatus.Cancelled;
        }

        if (today < start)
        {
            return RentalStatus.Upcoming;
        }

        return today > end ? RentalStatus.Completed : RentalStatus.Active;
    }
}
