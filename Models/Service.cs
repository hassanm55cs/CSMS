using CSMS.Enums;
using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class Service
{
    public int ServiceId { get; set; }

    public DateTime ServiceDate { get; set; }

    public int ProductId { get; set; }

    public int VisitId { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Visit Visit { get; set; } = null!;
    public StatusService StatusService { get; set; }
    public string Description { get; set; }
    public bool Approved{ get; set; }
}
