using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class UpdateCustomerProfileDto
{
    [Required, MaxLength(30)]
    public string FullName { get; set; } = null!;

    [Required, MaxLength(11)]
    public string Phone { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Address { get; set; } = null!;
}
