namespace CSMS.ViewModel;

public class RentalViewModel
{
    public int RentedCarCustomerId { get; set; }

    public string LicencePlate { get; set; } = null!;

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public DateOnly RentStartDate { get; set; }

    public DateOnly RentEndDate { get; set; }

    public int NoOfDays { get; set; }

    public double PriceForRent { get; set; }

    // Upcoming | Active | Completed | Cancelled
    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CancellationReason { get; set; }

    public double? CancellationFee { get; set; }
}

public class RentalDetailsViewModel : RentalViewModel
{
    public RentalCarViewModel Vehicle { get; set; } = null!;

    // Only filled for employees and admins.
    public CustomerSummaryViewModel? Customer { get; set; }
}
