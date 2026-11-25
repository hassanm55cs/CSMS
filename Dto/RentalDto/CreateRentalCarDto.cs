using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CreateRentalCarDto
{
    [Required, MaxLength(6)]
    public string LicencePlate { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Color { get; set; } = null!;

    [Required, Range(1, int.MaxValue)]
    public int? NoOfCylinders { get; set; }

    [Required]
    public string FuelType { get; set; } = null!;

    [Required]
    public string EngineType { get; set; } = null!;

    [Required]
    public DateOnly? ManufactureDate { get; set; }

    [Required, MaxLength(35)]
    public string CarCompany { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Model { get; set; } = null!;

    [Required, Range(0.01, double.MaxValue)]
    public double? PricePerDay { get; set; }

}
