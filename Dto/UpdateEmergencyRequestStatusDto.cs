using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class UpdateEmergencyRequestStatusDto
{
    [Required, EnumDataType(typeof(StatusEmergency))]
    public StatusEmergency? Status { get; set; }

    [Range(typeof(decimal), "-90", "90")]
    public decimal? Latitude { get; set; }

    [Range(typeof(decimal), "-180", "180")]
    public decimal? Longitude { get; set; }
}
