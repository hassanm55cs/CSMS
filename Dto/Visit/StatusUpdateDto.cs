using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Visit
{
    /// <summary>Payload for PUT /api/v1/visits/{visitId}/status.</summary>
    public class StatusUpdateDto
    {
        /// <summary>
        /// One of: Requested, UnderDiagnosis, PendingCustomerConfirmation,
        /// Approved, Rejected, InProgress, Completed.
        /// </summary>
        [Required]
        public string Status { get; set; } = null!;
    }
}
