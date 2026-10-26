using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class BranchProduct
{
    public int BranchId { get; set; }

    public int ProductId { get; set; }

    public int Quantity { get; set; }

    public virtual ServiceBranch Branch { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
