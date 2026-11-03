using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto
{
    public class DriverDto
    {
        public string PhoneNumber { get; set; }
        [Required,EmailAddress]
        public string Email { get; set; }

        public string FullName { get; set; }

        public int BranchId { get; set; }
        public double Salary { get; set; }
        public DateOnly StartWorkDate { get; set; } = DateOnly.FromDateTime(DateTime.Now);
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }
}
