namespace CSMS.ViewModel;

public class AdminDashboardViewModel
{
    public int Customers { get; set; }

    public int Drivers { get; set; }

    public int Employees { get; set; }

    public int Branches { get; set; }

    public int RentalCars { get; set; }

    public int AvailableRentalCars { get; set; }

    public int EmergencyTrucks { get; set; }

    public int AvailableEmergencyTrucks { get; set; }

    public int ActiveEmergencyRequests { get; set; }

    public int Visits { get; set; }

    public decimal Revenue { get; set; }
}

public class RevenueReportViewModel
{
    public string Period { get; set; } = null!;

    public decimal RentalRevenue { get; set; }

    public decimal ServiceRevenue { get; set; }

    public decimal TotalRevenue { get; set; }
}

public class FleetUtilizationViewModel
{
    public int Available { get; set; }

    public int Rented { get; set; }

    public int Maintenance { get; set; }

    public int Reserved { get; set; }
}

public class BranchReportViewModel
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public int Services { get; set; }

    public int Rentals { get; set; }

    public int Emergencies { get; set; }

    public decimal Revenue { get; set; }
}
