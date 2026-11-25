using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Visit
{
    /// <summary>Payload for PUT /api/v1/visits/{visitId}/diagnosis.</summary>
    public class DiagnosisDto
    {
        [Required]
        public string Description { get; set; } = null!;

        [Required]
        [MinLength(1, ErrorMessage = "At least one diagnosis item is required.")]
        public List<DiagnosisItemDto> Items { get; set; } = [];
    }

    public class DiagnosisItemDto
    {
        [Required]
        public string Description { get; set; } = null!;

        /// <summary>One of: "critical", "warning", "normal".</summary>
        [Required]
        public string Severity { get; set; } = null!;

        public decimal EstimatedCost { get; set; }

        /// <summary>
        /// Optional product id to associate this service item with.
        /// If omitted, no Service record is created for this item (limitation: Service.ProductId is non-nullable).
        /// </summary>
        public int? ProductId { get; set; }
    }
}
