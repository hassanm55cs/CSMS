using CSMS.Enums;

namespace CSMS.ViewModel;

public class CarViewModel
{
    public string LicencePlate { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int NoOfCylinders { get; set; }

    public FuelType FuelType { get; set; }

    public EngineType EngineType { get; set; }

    public DateOnly ManufactureDate { get; set; }

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public int CustomerId { get; set; }

    public double PriceInEgp { get; set; }

    public int CurrentKm { get; set; }
}
