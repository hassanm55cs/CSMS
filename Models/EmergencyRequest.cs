using CSMS.Enums;
using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class EmergencyRequest
{
    public int EmergencyRequestId { get; set; }

    public DateTime EmergenctTime { get; set; }

    public string CarLicencePlate { get; set; } = null!;

    public int ?DriverId { get; set; }

    public int? BranchId { get; set; }

    public string Latitude { get; set; } = null!;

    public string Longitude { get; set; } = null!;

    public StatusEmergency StatusEmergency { get; set; } 

    public virtual Car CarLicencePlateNavigation { get; set; } = null!;

    public virtual Driver Driver { get; set; } = null!;
    public virtual ServiceBranch? Branch { get; set; }
    public string ?ProblemType{ get; set; }
    public virtual EmergencyTruck? Truck { get; set; }
    public string? TruckLicencePlate { get; set; }

    public string? Description { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CancellationReason { get; set; }
    public byte[] RowVersion { get; set; } = null!;

}
