using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class ServiceByKm
{
    public int ServiceByKmId { get; set; }

    public int KilometerInterval { get; set; }

    public string Description { get; set; } = null!;

    public double Price { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
