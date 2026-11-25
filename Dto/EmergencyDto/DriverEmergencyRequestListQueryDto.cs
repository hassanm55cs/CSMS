using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto;

public class DriverEmergencyRequestListQueryDto : EmergencyRequestListQueryDto
{
    [Range(1, int.MaxValue)]
    public int? BranchId { get; set; }

    // true = only my requests, false = only the open (unassigned) pool, null = both.
    public bool? Assigned { get; set; }
}
