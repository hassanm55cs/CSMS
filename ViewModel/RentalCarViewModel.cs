using CSMS.Enums;

namespace CSMS.ViewModel;

public class RentalCarViewModel
{
    public string LicencePlate { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int NoOfCylinders { get; set; }

    public FuelType FuelType { get; set; }

    public EngineType EngineType { get; set; }

    public DateOnly ManufactureDate { get; set; }

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public decimal? PricePerDay { get; set; }

    public bool Available { get; set; }
}

public class RentalCarDetailsViewModel : RentalCarViewModel
{
    public IReadOnlyList<RentalReservationViewModel> Reservations { get; set; } =
        Array.Empty<RentalReservationViewModel>();
}
