using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class DriverListQueryDto
{
    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }

    public bool? Available { get; set; }

    [MaxLength(100)]
    public string? Search { get; set; }

    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
