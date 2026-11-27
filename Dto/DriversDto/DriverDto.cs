using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.DriversDto
{
    public class DriverDto
    {
        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string FullName { get; set; } = string.Empty;

        [Range(1, int.MaxValue)]
        public int BranchId { get; set; }

        [Range(0.01, double.MaxValue)]
        public double Salary { get; set; }

        public DateOnly StartWorkDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    }
}
