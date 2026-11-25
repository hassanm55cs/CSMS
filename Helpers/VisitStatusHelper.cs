using CSMS.Enums;

namespace CSMS.Helpers
{
    /// <summary>
    /// Converts between the <see cref="Status"/> enum and the API-facing status strings.
    /// Mapping:
    ///   Entered                 → "Requested"
    ///   UnderDIagnosis          → "UnderDiagnosis"
    ///   DiagnosesSentToCustomer → "PendingCustomerConfirmation"
    ///   serviceApproved         → "Approved"
    ///   serviceRejected         → "Rejected"
    ///   servicing               → "InProgress"
    ///   ended                   → "Completed"
    /// </summary>
    public static class VisitStatusHelper
    {
        private static readonly Dictionary<Status, string> EnumToString = new()
        {
            { Status.Entered,                 "Requested" },
            { Status.UnderDIagnosis,          "UnderDiagnosis" },
            { Status.DiagnosesSentToCustomer, "PendingCustomerConfirmation" },
            { Status.CustomerConfirmed,       "CustomerConfirmed" },
            { Status.serviceApproved,         "Approved" },
            { Status.serviceRejected,         "Rejected" },
            { Status. InProgress,             "InProgress" },
            { Status.Completed,               "Completed" },
            { Status.Cancelled,               "Cancelled" },
        };

        private static readonly Dictionary<string, Status> StringToEnum =
            EnumToString.ToDictionary(kv => kv.Value, kv => kv.Key,
                StringComparer.OrdinalIgnoreCase);

        /// <summary>Converts a <see cref="Status"/> enum value to its API string representation.</summary>
        public static string ToApiString(Status status) =>
            EnumToString.TryGetValue(status, out var s) ? s : status.ToString();

        /// <summary>
        /// Attempts to parse an API status string back into the <see cref="Status"/> enum.
        /// Returns <c>null</c> if the string is not recognised.
        /// </summary>
        public static Status? FromApiString(string apiStatus) =>
            StringToEnum.TryGetValue(apiStatus, out var e) ? e : null;

        /// <summary>Returns all valid API status strings.</summary>
        public static IEnumerable<string> ValidApiStrings => StringToEnum.Keys;
    }
}
