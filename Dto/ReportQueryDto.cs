using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class ReportQueryDto
{
    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }
}
