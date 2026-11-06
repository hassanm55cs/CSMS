using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class CarListQueryDto
{
    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;

    [MaxLength(100)]
    public string? Search { get; set; }
}
