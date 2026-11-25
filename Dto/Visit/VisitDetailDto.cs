namespace CSMS.Dto.Visit
{
    /// <summary>Full visit detail returned by GET /api/v1/bookings/{visitId}.</summary>
    public class VisitDetailDto
    {
        public int VisitId { get; set; }
        public string BookingReference { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateOnly ServiceDate { get; set; }

        public CarSummaryDto Car { get; set; } = null!;
        public BranchSummaryDto Branch { get; set; } = null!;
        public EmployeeSummaryInVisitDto Employee { get; set; } = null!;

        /// <summary>Taken from the first Service record's description (customer notes at booking time).</summary>
        public string? CustomerNotes { get; set; }

        public List<ServiceItemDto> Services { get; set; } = [];
    }

    public class CarSummaryDto
    {
        public string LicencePlate { get; set; } = null!;
        public string Company { get; set; } = null!;
        public string Model { get; set; } = null!;
    }

    public class BranchSummaryDto
    {
        public int BranchId { get; set; }
        public string Name { get; set; } = null!;
    }

    public class EmployeeSummaryInVisitDto
    {
        public int? EmployeeId { get; set; }
        public string FullName { get; set; } = null!;
    }
}
