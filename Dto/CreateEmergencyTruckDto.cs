using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CreateEmergencyTruckDto
{
    [Required, MaxLength(6)]
    public string LicencePlate { get; set; } = null!;

    [Required, MaxLength(35)]
    public string TruckCompany { get; set; } = null!;

    [Required, MaxLength(35)]
    public string TruckModel { get; set; } = null!;

    public bool IsAvailable { get; set; } = true;

    public DateTime StartDate { get; set; }

    public DateOnly ManufactureDate { get; set; }

    [Range(1, int.MaxValue)]
    public int BranchId { get; set; }

    [Range(1, int.MaxValue)]
    public int DriverId { get; set; }
}
