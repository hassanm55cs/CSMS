namespace CSMS.ViewModel;

public class RentalCarViewModel
{
    public string LicencePlate { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int NoOfCylinders { get; set; }

    public string FuelType { get; set; } = null!;

    public string EngineType { get; set; } = null!;

    public DateOnly ManufactureDate { get; set; }

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public double PricePerDay { get; set; }

    // "Available" or "Maintenance" (the car's own state, not date availability).
    public string Status { get; set; } = null!;

    public int? BranchId { get; set; }
}

public class RentalCarListItemViewModel : RentalCarViewModel
{
    // True when the car is not in maintenance and has no reservation in the requested range.
    public bool Available { get; set; }
}

// Public data only: other customers' identities are never exposed here.
public class RentalCarReservationViewModel
{
    public DateOnly RentStartDate { get; set; }

    public DateOnly RentEndDate { get; set; }
}

public class RentalCarDetailsViewModel : RentalCarListItemViewModel
{
    public IReadOnlyList<RentalCarReservationViewModel> Reservations { get; set; } =
        Array.Empty<RentalCarReservationViewModel>();
}
