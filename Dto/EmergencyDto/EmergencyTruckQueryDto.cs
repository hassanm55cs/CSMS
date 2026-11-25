using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class EmergencyTruckQueryDto
{
    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }

    public bool? Available { get; set; }
}
