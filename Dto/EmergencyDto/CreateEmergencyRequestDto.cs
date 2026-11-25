using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CreateEmergencyRequestDto
{
    [Required, MaxLength(6)]
    public string CarLicencePlate { get; set; } = null!;

    [Required, MaxLength(50)]
    public string ProblemType { get; set; } = null!;

    [Required, Range(-90, 90)]
    public double? Latitude { get; set; }

    [Required, Range(-180, 180)]
    public double? Longitude { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }
}
