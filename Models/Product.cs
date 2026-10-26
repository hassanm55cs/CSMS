using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public string Name { get; set; } = null!;

    public decimal Price { get; set; }

    public int WarrantyMonths { get; set; }

    public string? Description { get; set; }

    public virtual ICollection<BranchProduct> BranchProducts { get; set; } = new List<BranchProduct>();

    public virtual ICollection<Service> Services { get; set; } = new List<Service>();

    public virtual ICollection<ServiceByKm> ServiceByKms { get; set; } = new List<ServiceByKm>();
}
