using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Branch
{
    public class BranchRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string BranchName { get; set; } = null!;

        [Required]
        [MaxLength(200)]
        public string BranchLocation { get; set; } = null!;

        [Range(-90, 90)]
        public double? Latitude { get; set; }

        [Range(-180, 180)]
        public double? Longitude { get; set; }

        /// <summary>HH:mm — hours 00-23, minutes 00-59. e.g. "08:00"</summary>
        [Required]
        [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$",
            ErrorMessage = "OpenTime must be a valid time in HH:mm format (e.g. 08:00). Hours 00-23, minutes 00-59.")]
        public string OpenTime { get; set; } = null!;

        /// <summary>HH:mm — hours 00-23, minutes 00-59. e.g. "22:00"</summary>
        [Required]
        [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$",
            ErrorMessage = "CloseTime must be a valid time in HH:mm format (e.g. 22:00). Hours 00-23, minutes 00-59.")]
        public string CloseTime { get; set; } = null!;

        [Required]
        public DateOnly OpeningDate { get; set; }

        /// <summary>Optional EmployeeId of the branch manager. Send null if no manager yet.</summary>
        public int? ManagerId { get; set; }
    }
}
