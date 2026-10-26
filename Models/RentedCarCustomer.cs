using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class RentedCarCustomer
{
    public int RentedCarCustomerId { get; set; }

    public double PriceForRent { get; set; }

    public int NoOfDaysForRent { get; set; }

    public DateOnly RentStartDate { get; set; }

    public DateOnly RentEndDate { get; set; }

    public int CustomerId { get; set; }

    public string LicencsePlateRented { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;

    public virtual CarsForRent LicencsePlateRentedNavigation { get; set; } = null!;
}
