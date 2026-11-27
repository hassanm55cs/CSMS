using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Visit
{
    /// <summary>Payload for POST /api/v1/bookings — create a new visit with one or more service products.</summary>
    public class BookingRequestDto
    {
        [Required]
        [MaxLength(6)]
        public string CarLicencePlate { get; set; } = null!;

        /// <summary>Product IDs chosen from the selected branch's in-stock products.</summary>
        public List<int> ServiceProductIds { get; set; } = [];

        /// <summary>Legacy single-product field retained for older clients.</summary>
        [Range(1, int.MaxValue, ErrorMessage = "serviceProductId must be a positive integer.")]
        public int? ServiceProductId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "branchId must be a positive integer.")]
        public int BranchId { get; set; }

        [Required]
        public DateOnly ServiceDate { get; set; }

        /// <summary>Optional notes from the customer (stored as the initial Service description).</summary>
        public string? CustomerNotes { get; set; }
    }
}
