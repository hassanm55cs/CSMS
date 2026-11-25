namespace CSMS.Dto.Visit
{
    /// <summary>Compact visit row used in paginated list responses.</summary>
    public class VisitListItemDto
    {
        public int VisitId { get; set; }
        public string BookingReference { get; set; } = null!;
        public string CarLicencePlate { get; set; } = null!;
        public string CarCompany { get; set; } = null!;
        public string CarModel { get; set; } = null!;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = null!;
        public DateOnly ServiceDate { get; set; }

        /// <summary>API-friendly status string.</summary>
        public string Status { get; set; } = null!;

        public int? EmployeeId { get; set; }
        public string EmployeeName { get; set; } = null!;
        public int ServiceCount { get; set; }
    }
}
