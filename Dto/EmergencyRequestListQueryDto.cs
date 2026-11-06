using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class EmergencyRequestListQueryDto
{
    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }

    public bool? Assigned { get; set; }

    [EnumDataType(typeof(StatusEmergency))]
    public StatusEmergency? Status { get; set; }

    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
