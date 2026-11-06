namespace CSMS.ViewModel;

public class EmergencyTruckViewModel
{
    public string LicencePlate { get; set; } = null!;

    public string TruckCompany { get; set; } = null!;

    public string TruckModel { get; set; } = null!;

    public bool IsAvailable { get; set; }

    public DateTime StartDate { get; set; }

    public DateOnly ManufactureDate { get; set; }

    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public int DriverId { get; set; }

    public string DriverName { get; set; } = null!;
}
