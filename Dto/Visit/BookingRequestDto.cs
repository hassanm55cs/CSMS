using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Visit
{
    /// <summary>Payload for POST /api/v1/bookings — create a new visit/booking.</summary>
    public class BookingRequestDto
    {
        [Required]
        [MaxLength(6)]
        public string CarLicencePlate { get; set; } = null!;

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "serviceProductId must be a positive integer.")]
        public int ServiceProductId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "branchId must be a positive integer.")]
        public int BranchId { get; set; }

        [Required]
        public DateOnly ServiceDate { get; set; }

        /// <summary>Optional notes from the customer (stored as the initial Service description).</summary>
        public string? CustomerNotes { get; set; }
    }
}
