using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.DriversDto;

public class UpdateDriverLocationDto
{
    [Required, Range(-90, 90)]
    public double? Latitude { get; set; }

    [Required, Range(-180, 180)]
    public double? Longitude { get; set; }

    // Optional: when omitted the current availability is kept.
    public bool? IsAvailable { get; set; }
}
