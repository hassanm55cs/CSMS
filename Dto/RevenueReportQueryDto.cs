using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public enum ReportGroupBy
{
    Day,
    Month,
    Year
}

public class RevenueReportQueryDto : ReportQueryDto
{
    [EnumDataType(typeof(ReportGroupBy))]
    public ReportGroupBy GroupBy { get; set; } = ReportGroupBy.Day;
}
