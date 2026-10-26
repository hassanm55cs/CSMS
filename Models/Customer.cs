using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class Customer
{
    public int CustomerId { get; set; }

    public string Phone { get; set; } 

    public string Email { get; set; } 

    public string FullName { get; set; } 

    public string Address { get; set; } 

    public virtual ICollection<Car> Cars { get; set; } 

    public virtual ICollection<RentedCarCustomer> RentedCarCustomers { get; set; }
    public virtual ApplicationUser User { get; set; }
    public List<Notification> Notifications { get; set; }

}
