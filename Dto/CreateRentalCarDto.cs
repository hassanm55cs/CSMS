using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class CreateRentalCarDto
{
    [Required, MaxLength(6)]
    public string LicencePlate { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Color { get; set; } = null!;

    [Range(1, int.MaxValue)]
    public int NoOfCylinders { get; set; }

    [Required, EnumDataType(typeof(FuelType))]
    public FuelType? FuelType { get; set; }

    [Required, EnumDataType(typeof(EngineType))]
    public EngineType? EngineType { get; set; }

    public DateOnly ManufactureDate { get; set; }

    [Required, MaxLength(35)]
    public string CarCompany { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Model { get; set; } = null!;

    [Range(typeof(decimal), "0.01", "999999999")]
    public decimal PricePerDay { get; set; }

    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }
}
