using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class CreateCarDto
{
    [Required, MaxLength(6)]
    public string LicencePlate { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Color { get; set; } = null!;

    [Required, Range(1, int.MaxValue)]
    public int? NoOfCylinders { get; set; }

    [Required]
    public string FuelType{ get; set; }

    [Required,]
    public string EngineType { get; set; }

    [Required]
    public DateOnly? ManufactureDate { get; set; }

    [Required, MaxLength(35)]
    public string CarCompany { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Model { get; set; } = null!;

    [Required, Range(0, double.MaxValue)]
    public double? PriceInEgp { get; set; }

    [Required, Range(0, int.MaxValue)]
    public int? CurrentKm { get; set; }
}
