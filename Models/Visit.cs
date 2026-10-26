using CSMS.Enums;
using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class Visit
{
    public int VisitId { get; set; }

    public string CarId { get; set; } = null!;

    public int EmployeeId { get; set; }

    public int BranchId { get; set; }

    public DateOnly ServiceDate { get; set; }

    public Status Status { get; set; }

    public virtual ServiceBranch Branch { get; set; } = null!;

    public virtual Car Car { get; set; } = null!;

    public virtual Employee Employee { get; set; } = null!;

    public virtual ICollection<Service> Services { get; set; } = new List<Service>();
    public List<Notification> Notifications { get; set; }
}
