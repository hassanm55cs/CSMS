using CSMS.Enums;
using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class EmergencyRequest
{
    public int EmergencyRequestId { get; set; }

    public DateTime EmergenctTime { get; set; }

    public string CarLicencePlate { get; set; } = null!;

    public int? DriverId { get; set; }

    public string Latitude { get; set; } = null!;

    public string Longitude { get; set; } = null!;

    public StatusEmergency StatusEmergency { get; set; } 

    public virtual Car CarLicencePlateNavigation { get; set; } = null!;

    public virtual Driver? Driver { get; set; }

    public string ProblemType { get; set; } = null!;

    public string? Description { get; set; }

    public string? CancellationReason { get; set; }

    public string? EmergencyTruckLicencePlate { get; set; }

    public virtual EmergencyTruck? EmergencyTruck { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
