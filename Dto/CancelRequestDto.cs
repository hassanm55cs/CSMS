using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CancelRequestDto
{
    [MaxLength(500)]
    public string? Reason { get; set; }
}
