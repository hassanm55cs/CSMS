namespace CSMS.Dto.Visit
{
    /// <summary>Payload for PUT /api/v1/visits/{visitId}/customer-confirmation.</summary>
    public class CustomerConfirmationDto
    {
        /// <summary>Service IDs that the customer approves.</summary>
        public List<int> ApprovedServiceIds { get; set; } = [];

        /// <summary>Service IDs that the customer rejects.</summary>
        public List<int> RejectedServiceIds { get; set; } = [];

        public string? CustomerNotes { get; set; }
    }
}
