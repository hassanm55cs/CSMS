using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class ServiceBranch
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public string BranchLocation { get; set; } = null!;

    public TimeOnly OpenTime { get; set; }

    public TimeOnly CloseTime { get; set; }

    public DateOnly OpeningDate { get; set; }

    public int? ManagerId { get; set; }

    public virtual ICollection<BranchProduct> BranchProducts { get; set; } = new List<BranchProduct>();

    public virtual ICollection<Driver> Drivers { get; set; } = new List<Driver>();

    public virtual ICollection<EmergencyTruck> EmergencyTrucks { get; set; } = new List<EmergencyTruck>();

    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();

    public virtual Employee? Manager { get; set; }

    public virtual ICollection<Visit> Visits { get; set; } = new List<Visit>();
}
