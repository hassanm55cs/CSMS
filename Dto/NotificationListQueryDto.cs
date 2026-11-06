using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class NotificationListQueryDto
{
    public bool UnreadOnly { get; set; }

    [Range(1, 1000000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
