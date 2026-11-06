using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class EmergencyTruckListQueryDto
{
    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }

    public bool? Available { get; set; }
}
