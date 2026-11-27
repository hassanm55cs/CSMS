using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.DriversDto;

public class UpdateDriverAdminDto
{
    [Required, EmailAddress, MaxLength(80)]
    public string Email { get; set; } = null!;

    [Required, Phone, MaxLength(20)]
    public string PhoneNumber { get; set; } = null!;

    [Range(0.01, double.MaxValue)]
    public double Salary { get; set; }
}
