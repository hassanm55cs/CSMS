using CSMS.Enums;

namespace CSMS.ViewModel;

public class RentalReservationViewModel
{
    public int RentedCarCustomerId { get; set; }

    public string LicencePlate { get; set; } = null!;

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public DateOnly RentStartDate { get; set; }

    public DateOnly RentEndDate { get; set; }

    public int NoOfDaysForRent { get; set; }

    public double PriceForRent { get; set; }

    public RentalStatus Status { get; set; }

    public string? CancellationReason { get; set; }

    public string? CustomerName { get; set; }
}
