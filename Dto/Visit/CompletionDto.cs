using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Visit
{
    /// <summary>Payload for PUT /api/v1/visits/{visitId}/complete.</summary>
    public class CompletionDto
    {
        public string? CompletionNotes { get; set; }

        /// <summary>Service IDs that were completed during this visit.</summary>
        public List<int> CompletedServiceIds { get; set; } = [];

        [Required]
        [Range(0, int.MaxValue, ErrorMessage = "finalKm must be a non-negative integer.")]
        public int FinalKm { get; set; }
    }
}
