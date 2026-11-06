using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class UpdateRentalCarDto
{
    [MaxLength(20)]
    public string? Color { get; set; }

    [Range(1, int.MaxValue)]
    public int? NoOfCylinders { get; set; }

    [EnumDataType(typeof(FuelType))]
    public FuelType? FuelType { get; set; }

    [EnumDataType(typeof(EngineType))]
    public EngineType? EngineType { get; set; }

    public DateOnly? ManufactureDate { get; set; }

    [MaxLength(35)]
    public string? CarCompany { get; set; }

    [MaxLength(20)]
    public string? Model { get; set; }

    [Range(typeof(decimal), "0.01", "999999999")]
    public decimal? PricePerDay { get; set; }

    public bool? IsUnderMaintenance { get; set; }

    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }
}
