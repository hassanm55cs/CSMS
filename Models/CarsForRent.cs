using CSMS.Enums;
using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class CarsForRent
{
    public string LicencePlate { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int NoOfCylinders { get; set; }

    public FuelType FuelType { get; set; }

    public EngineType EngineType { get; set; } 

    public DateOnly ManufactuareDate { get; set; }

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public virtual ICollection<RentedCarCustomer> RentedCarCustomers { get; set; } = new List<RentedCarCustomer>();
}
