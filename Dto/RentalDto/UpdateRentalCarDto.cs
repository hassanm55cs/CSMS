using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class UpdateRentalCarDto
{
    [MaxLength(20)]
    public string? Color { get; set; }

    [Range(1, int.MaxValue)]
    public int? NoOfCylinders { get; set; }

    public string? FuelType { get; set; }

    public string? EngineType { get; set; }

    public DateOnly? ManufactureDate { get; set; }

    [MaxLength(35)]
    public string? CarCompany { get; set; }

    [MaxLength(20)]
    public string? Model { get; set; }

    [Range(0.01, double.MaxValue)]
    public double? PricePerDay { get; set; }

    // "Available" or "Maintenance".
    public string? Status { get; set; }

    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }
}
