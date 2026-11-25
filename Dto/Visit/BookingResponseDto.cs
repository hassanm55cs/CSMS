namespace CSMS.Dto.Visit
{
    /// <summary>Response body returned after a booking is created (201) or retrieved.</summary>
    public class BookingResponseDto
    {
        public int VisitId { get; set; }

        /// <summary>Human-readable reference of the form "CSMS-{visitId}".</summary>
        public string BookingReference { get; set; } = null!;

        public string CarLicencePlate { get; set; } = null!;

        public int BranchId { get; set; }

        public DateOnly ServiceDate { get; set; }

        /// <summary>API-friendly status string (e.g. "Requested").</summary>
        public string Status { get; set; } = null!;
    }
}
