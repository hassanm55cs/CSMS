using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class AcceptEmergencyDto
{
    [Required, MaxLength(50)]
    public string TruckLicencePlate { get; set; } = null!;
}
