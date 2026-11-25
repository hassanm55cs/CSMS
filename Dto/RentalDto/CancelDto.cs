using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

// Shared by rentals and emergency requests. The whole body is optional.
public class CancelDto
{
    [MaxLength(300)]
    public string? Reason { get; set; }
}
