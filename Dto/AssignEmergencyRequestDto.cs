using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class AssignEmergencyRequestDto
{
    [Range(1, int.MaxValue)]
    public int DriverId { get; set; }

    [Required, MaxLength(6)]
    public string TruckLicencePlate { get; set; } = null!;
}
