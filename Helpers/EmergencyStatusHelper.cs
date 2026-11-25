using CSMS.Enums;

namespace CSMS.Helper;

public static class EmergencyStatusHelper
{
    // Statuses in which a request still occupies a driver / blocks a duplicate request.
    public static readonly StatusEmergency[] ActiveStatuses =
    {
        StatusEmergency.requested,
        StatusEmergency.confirmed,
        StatusEmergency.assigned,
        StatusEmergency.onTheWay,
        StatusEmergency.arrived,
        StatusEmergency.tobranch
    };

    // The enum members are camelCase (project convention); the API contract uses PascalCase.
    public static string ToApiName(this StatusEmergency status)
    {
        var name = status.ToString();
        return char.ToUpperInvariant(name[0]) + name[1..];
    }

    public static bool IsActive(this StatusEmergency status)
    {
        return Array.IndexOf(ActiveStatuses, status) >= 0;
    }

    // Next allowed step once a driver is assigned. Requested -> Assigned only happens via assignment/accept.
    public static StatusEmergency? NextStatus(this StatusEmergency current)
    {
        return current switch
        {
            StatusEmergency.assigned or StatusEmergency.confirmed => StatusEmergency.onTheWay,
            StatusEmergency.onTheWay => StatusEmergency.arrived,
            StatusEmergency.arrived => StatusEmergency.completed,
            _ => null
        };
    }
}
