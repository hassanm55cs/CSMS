using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class EmergencyTruck
{
    public string LicencePlate { get; set; } = null!;

    public string TruckCompany { get; set; } = null!;

    public string TruckModel { get; set; } = null!;

    public bool IsAvailable { get; set; }

    public DateTime StartDate { get; set; }

    public DateOnly ManufactuareDate { get; set; }

    public int BranchId { get; set; }

    public int DriverId { get; set; }

    public virtual ServiceBranch Branch { get; set; } = null!;

    public virtual Driver Driver { get; set; } = null!;
}
