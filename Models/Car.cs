using CSMS.Enums;
using System;
using System.Collections.Generic;

namespace CSMS.Models;

public partial class Car
{
    public string LicencesPlate { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int NoOfCylinders { get; set; }

    public FuelType FuelType { get; set; } 

    public EngineType EngineType { get; set; } 

    public DateOnly ManufactuareDate { get; set; }

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public int CustomerId { get; set; }

    public double PriceInEgp { get; set; }

    public int CurrentKm { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<EmergencyRequest> EmergencyRequests { get; set; } = new List<EmergencyRequest>();

    public virtual ICollection<Visit> Visits { get; set; } = new List<Visit>();
}
