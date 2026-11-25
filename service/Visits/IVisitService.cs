using CSMS.Dto.Common;
using CSMS.Dto.Visit;

namespace CSMS.service.Visits
{
    /// <summary>
    /// Application service interface for Visit / Booking operations.
    /// All methods return domain-agnostic results; controllers translate them into HTTP responses.
    /// </summary>
    public interface IVisitService
    {
        // ── Bookings ──────────────────────────────────────────────────────────

        /// <summary>
        /// Creates a new booking (Visit with Status=Entered and one Service record).
        /// Returns the booking response on success; throws <see cref="InvalidOperationException"/>
        /// for business-rule violations.
        /// </summary>
        Task<BookingResponseDto> CreateBookingAsync(string customerId, BookingRequestDto dto);

        /// <summary>
        /// Returns a paged list of visits whose car belongs to the given customer.
        /// </summary>
        Task<PagedResult<VisitListItemDto>> GetBookingsAsync(
            string customerId,
            string? status,
            DateOnly? fromDate,
            DateOnly? toDate,
            string? carLicencePlate,
            int page,
            int pageSize);

        /// <summary>Returns full visit detail, or <c>null</c> if not found.</summary>
        Task<VisitDetailDto?> GetBookingDetailAsync(string customerId, int visitId);

        /// <summary>
        /// Cancels a visit by setting its status to <c>ended</c>.
        /// Note: no dedicated "Cancelled" enum value exists; <c>ended</c> is used instead.
        /// Returns the updated booking, or <c>null</c> if the visit was not found.
        /// </summary>
        Task<BookingResponseDto?> CancelBookingAsync(string customerId, int visitId, string? reason);

        // ── Visits (staff-side) ───────────────────────────────────────────────

        /// <summary>Returns a paged list of visits, optionally filtered.</summary>
        Task<PagedResult<VisitListItemDto>> GetVisitsAsync(
            string employeeUserId,
            string? status,
            DateOnly? fromDate,
            DateOnly? toDate,
            int page,
            int pageSize);

        /// <summary>
        /// Assigns an employee to a visit.
        /// Returns the updated visit summary, or <c>null</c> if the visit is not found.
        /// Throws <see cref="InvalidOperationException"/> if the employee does not belong to the
        /// same branch as the visit.
        /// </summary>
        Task<VisitListItemDto?> AssignEmployeeAsync(string employeeUserId, int visitId);

        /// <summary>
        /// Updates the status of a visit.
        /// Returns the updated visit summary, or <c>null</c> if not found.
        /// Throws <see cref="InvalidOperationException"/> if the status string is not valid.
        /// </summary>
        Task<VisitListItemDto?> UpdateStatusAsync(int visitId, StatusUpdateDto dto);

        /// <summary>
        /// Submits a diagnosis for a visit.
        /// Creates Service records for each item that has a ProductId; items without a ProductId
        /// are skipped (limitation: Service.ProductId is non-nullable in the DB schema).
        /// Returns the updated visit id and created service items on success.
        /// </summary>
        Task<DiagnosisResponseDto?> SubmitDiagnosisAsync(string employeeUserId, int visitId, DiagnosisDto dto);

        /// <summary>
        /// Processes customer confirmation of diagnosis items.
        /// Sets Service.Approved accordingly and advances Visit.Status.
        /// Returns a confirmation summary, or <c>null</c> if the visit is not found.
        /// </summary>
        Task<ConfirmationResponseDto?> ProcessCustomerConfirmationAsync(string customerId,
            int visitId, CustomerConfirmationDto dto);

        /// <summary>
        /// Marks a visit as completed, updates the car's current km, and sets Service items.
        /// Returns a completion summary, or <c>null</c> if the visit is not found.
        /// </summary>
        Task<CompletionResponseDto?> CompleteVisitAsync(int visitId, CompletionDto dto);

        /// <summary>Returns all service items for a visit, or <c>null</c> if the visit is not found.</summary>
        Task<List<ServiceItemDto>?> GetServicesAsync(int visitId);
    }

    // ── Inline response types used only by IVisitService consumers ────────────

    public class DiagnosisResponseDto
    {
        public int VisitId { get; set; }
        public string Status { get; set; } = null!;
        public List<ServiceItemDto> CreatedItems { get; set; } = [];
        public int SkippedItemCount { get; set; }
    }

    public class ConfirmationResponseDto
    {
        public int VisitId { get; set; }
        public string Status { get; set; } = null!;
        public int ApprovedCount { get; set; }
        public int RejectedCount { get; set; }
    }

    public class CompletionResponseDto
    {
        public int VisitId { get; set; }
        public string Status { get; set; } = null!;
        public int FinalKm { get; set; }
    }
}
