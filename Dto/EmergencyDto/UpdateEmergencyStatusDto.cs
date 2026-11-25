using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class UpdateEmergencyStatusDto
{
    // OnTheWay | Arrived | Completed (case-insensitive).
    [Required]
    public string Status { get; set; } = null!;

    // Optional: the driver's current position. Send both or neither.
    [Range(-90, 90)]
    public double? Latitude { get; set; }

    [Range(-180, 180)]
    public double? Longitude { get; set; }
}
