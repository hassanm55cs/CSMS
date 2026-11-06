namespace CSMS.ViewModel;

public class DriverViewModel
{
    public int DriverId { get; set; }

    public string FullName { get; set; } = null!;

    public string PhoneNumber { get; set; } = null!;

    public string Email { get; set; } = null!;

    public DateOnly StartWorkDate { get; set; }

    public double Salary { get; set; }

    public bool? IsAvailable { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;
}

public class DriverLocationViewModel
{
    public int DriverId { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public bool? IsAvailable { get; set; }
}
