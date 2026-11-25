using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.DriversDto;

public class UpdateDriverPhoneDto
{
    [Required, EmailAddress, MaxLength(80)]
    public string Email { get; set; } = null!;

    [Required, MaxLength(11)]
    public string PhoneNumber { get; set; } = null!;
}
