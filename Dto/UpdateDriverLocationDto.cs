using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class UpdateDriverLocationDto
{
    [Required, Range(typeof(decimal), "-90", "90")]
    public decimal? Latitude { get; set; }

    [Required, Range(typeof(decimal), "-180", "180")]
    public decimal? Longitude { get; set; }

    [Required]
    public bool? IsAvailable { get; set; }
}
