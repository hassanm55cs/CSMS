using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class CreateEmergencyRequestDto
{
    [Required, MaxLength(6)]
    public string CarLicencePlate { get; set; } = null!;

    [Required, EnumDataType(typeof(EmergencyProblemType))]
    public EmergencyProblemType? ProblemType { get; set; }

    [Required, Range(typeof(decimal), "-90", "90")]
    public decimal? Latitude { get; set; }

    [Required, Range(typeof(decimal), "-180", "180")]
    public decimal? Longitude { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }
}
