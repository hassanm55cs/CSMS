using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Visit
{
    /// <summary>Payload for PUT /api/v1/visits/{visitId}/assignment.</summary>
    public class AssignmentDto
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "employeeId must be a positive integer.")]
        public int EmployeeId { get; set; }
    }
}
