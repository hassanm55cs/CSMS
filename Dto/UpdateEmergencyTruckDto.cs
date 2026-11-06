using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class UpdateEmergencyTruckDto
{
    [MaxLength(35)]
    public string? TruckCompany { get; set; }

    [MaxLength(35)]
    public string? TruckModel { get; set; }

    public bool? IsAvailable { get; set; }

    public DateTime? StartDate { get; set; }

    public DateOnly? ManufactureDate { get; set; }

    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }

    [Range(1, int.MaxValue)]
    public int? DriverId { get; set; }
}
