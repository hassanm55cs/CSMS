using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class AdminDateRangeQueryDto
{
    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }
}

public class AdminDashboardQueryDto : AdminDateRangeQueryDto
{
    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }
}

public class RevenueReportQueryDto : AdminDateRangeQueryDto
{
    [RegularExpression("(?i)^(day|month|year)$", ErrorMessage = "groupBy must be day, month or year.")]
    public string GroupBy { get; set; } = "day";
}
