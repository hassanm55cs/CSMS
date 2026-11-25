using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class AssignEmergencyDto
{
    [Required, Range(1, int.MaxValue)]
    public int? DriverId { get; set; }

    [Required, MaxLength(50)]
    public string TruckLicencePlate { get; set; } = null!;
}
