using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class Driver
{
    public int DriverId { get; set; }

    public string FullName { get; set; } = null!;

    public int PhoneNumber { get; set; }

    public string Email { get; set; } = null!;

    public DateOnly StartWorkDate { get; set; }

    public double Salary { get; set; }

    public bool IsAvailable { get; set; }

    public string Latitude { get; set; } = null!;

    public string Longitude { get; set; } = null!;

    public int BranchId { get; set; }

    public virtual ServiceBranch Branch { get; set; } = null!;

    public virtual ICollection<EmergencyRequest> EmergencyRequests { get; set; } = new List<EmergencyRequest>();

    public virtual ICollection<EmergencyTruck> EmergencyTrucks { get; set; } = new List<EmergencyTruck>();
    public virtual ApplicationUser User { get; set; }
}
