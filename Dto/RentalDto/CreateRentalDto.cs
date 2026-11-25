using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CreateRentalDto
{
    [Required, MaxLength(6)]
    public string LicencePlate { get; set; } = null!;

    [Required]
    public DateOnly? RentStartDate { get; set; }

    [Required]
    public DateOnly? RentEndDate { get; set; }
}
