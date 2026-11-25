namespace CSMS.ViewModel;

public class ProblemTypeViewModel
{
    public string Id { get; set; } = null!;

    public string Label { get; set; } = null!;

    public string LabelAr { get; set; } = null!;

    public string Description { get; set; } = null!;
}

public class EmergencyCarViewModel
{
    public string LicencePlate { get; set; } = null!;

    public string CarCompany { get; set; } = null!;

    public string Model { get; set; } = null!;

    public string Color { get; set; } = null!;
}

public class EmergencyDriverViewModel
{
    public int DriverId { get; set; }

    public string FullName { get; set; } = null!;
}

public class EmergencyTruckSummaryViewModel
{
    public string LicencePlate { get; set; } = null!;

    public string TruckCompany { get; set; } = null!;

    public string TruckModel { get; set; } = null!;
}

public class LocationViewModel
{
    public double Latitude { get; set; }

    public double Longitude { get; set; }
}

public class EmergencyRequestViewModel
{
    public int EmergencyRequestId { get; set; }

    public DateTime RequestedAt { get; set; }

    public string CarLicencePlate { get; set; } = null!;

    public string ProblemType { get; set; } = null!;

    public string? Description { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    // Requested | Assigned | OnTheWay | Arrived | Completed | Cancelled
    public string Status { get; set; } = null!;

    public DateTime UpdatedAt { get; set; }

    public EmergencyCarViewModel Car { get; set; } = null!;

    public EmergencyDriverViewModel? Driver { get; set; }

    public EmergencyTruckSummaryViewModel? Truck { get; set; }

    // Live location: only returned while the driver is actively heading to / at the customer.
    public LocationViewModel? DriverLocation { get; set; }

    public int? EtaMinutes { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CancellationReason { get; set; }
}

public class AdminEmergencyRequestListItemViewModel
{
    public int EmergencyRequestId { get; set; }

    public DateTime RequestedAt { get; set; }

    public string CarLicencePlate { get; set; } = null!;

    public string? ProblemType { get; set; }

    public string Status { get; set; } = null!;

    public string CustomerName { get; set; } = null!;
}

public class DriverEmergencyCustomerViewModel
{
    public string FullName { get; set; } = null!;

    // Only filled once the request is assigned to the calling driver.
    public string? Phone { get; set; }
}

public class DriverEmergencyBranchViewModel
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;
}

public class DriverEmergencyRequestViewModel
{
    public int EmergencyRequestId { get; set; }

    public DateTime RequestedAt { get; set; }

    public string Status { get; set; } = null!;

    public string ProblemType { get; set; } = null!;

    public string? Description { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public bool AssignedToMe { get; set; }

    public DriverEmergencyCustomerViewModel Customer { get; set; } = null!;

    public EmergencyCarViewModel Car { get; set; } = null!;

    public EmergencyDriverViewModel? Driver { get; set; }

    public EmergencyTruckSummaryViewModel? Truck { get; set; }

    public DriverEmergencyBranchViewModel? Branch { get; set; }

    public DateTime UpdatedAt { get; set; }
}
