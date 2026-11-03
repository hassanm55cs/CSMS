using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto
{
    public class EmployeeDto
    {
        [Required,MaxLength(50)]
        public string FullName { get; set; } = null!;
        [Required, EmailAddress]
        public string Email { get; set; } = null!;
        [Required, MaxLength(11)]
        public string PhoneNumber { get; set; } = null!;
        [Required, MaxLength(100)]
        public string Facultly { get; set; } = null!;
        [Required]
        public int YearsOfExperince { get; set; }
        public DateOnly StartingWorkDate { get; set; } = DateOnly.FromDateTime(DateTime.Now);
        [Required]
        public decimal Salary { get; set; }
        [Required]
        public int BranchId { get; set; }
        [Required]
        public string Password { get; set; }
        [Required]
        [Compare(nameof(Password))]
        public string ConfirmPassword { get; set; }

    }
}
