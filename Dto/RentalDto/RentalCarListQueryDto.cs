using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class RentalCarListQueryDto
{
    public bool? Available { get; set; }

    // Availability is checked against this range (defaults to today).
    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    [MaxLength(35)]
    public string? Make { get; set; }

    [MaxLength(20)]
    public string? Model { get; set; }

    [EnumDataType(typeof(FuelType))]
    public FuelType? FuelType { get; set; }

    [EnumDataType(typeof(EngineType))]
    public EngineType? EngineType { get; set; }

    [Range(0, double.MaxValue)]
    public double? MinPrice { get; set; }

    [Range(0, double.MaxValue)]
    public double? MaxPrice { get; set; }

    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
