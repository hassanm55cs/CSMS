using System.ComponentModel.DataAnnotations;
using CSMS.Enums;

namespace CSMS.Dto;

public class RentalListQueryDto
{
    [EnumDataType(typeof(RentalStatus))]
    public RentalStatus? Status { get; set; }

    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
