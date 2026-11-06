using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CreateDriverAccountDto
{
    [Required, MaxLength(30)]
    public string FullName { get; set; } = null!;

    [Required, Phone, MaxLength(11)]
    public string PhoneNumber { get; set; } = null!;

    [Required, EmailAddress, MaxLength(80)]
    public string Email { get; set; } = null!;

    public DateOnly StartWorkDate { get; set; }

    [Range(typeof(double), "0.01", "999999999")]
    public double Salary { get; set; }

    [Range(1, int.MaxValue)]
    public int BranchId { get; set; }

    [Range(typeof(decimal), "-90", "90")]
    public decimal? Latitude { get; set; }

    [Range(typeof(decimal), "-180", "180")]
    public decimal? Longitude { get; set; }

    [Required, MinLength(8)]
    public string Password { get; set; } = null!;
}
