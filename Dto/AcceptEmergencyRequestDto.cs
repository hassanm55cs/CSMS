using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class AcceptEmergencyRequestDto
{
    [Required, MaxLength(6)]
    public string TruckLicencePlate { get; set; } = null!;
}
