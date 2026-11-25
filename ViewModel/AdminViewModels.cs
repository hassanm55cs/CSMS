namespace CSMS.ViewModel;

public class RevenueSummaryViewModel
{
    public double Rentals { get; set; }

    public double Services { get; set; }

    public double Total { get; set; }
}

public class DashboardStaffViewModel
{
    public int Employees { get; set; }

    public int Drivers { get; set; }
}

public class DashboardFleetViewModel
{
    public int RentalCars { get; set; }

    public int EmergencyTrucks { get; set; }
}

public class AdminDashboardViewModel
{
    public DateOnly FromDate { get; set; }

    public DateOnly ToDate { get; set; }

    public int? BranchId { get; set; }

    public int Customers { get; set; }

    public DashboardStaffViewModel Staff { get; set; } = new();

    public int Branches { get; set; }

    public DashboardFleetViewModel Fleet { get; set; } = new();

    public int ActiveSos { get; set; }

    public int Visits { get; set; }

    public RevenueSummaryViewModel Revenue { get; set; } = new();
}

public class RevenueReportRowViewModel
{
    // yyyy-MM-dd | yyyy-MM | yyyy depending on groupBy.
    public string Period { get; set; } = null!;

    public double Rentals { get; set; }

    public double Services { get; set; }

    public double Total { get; set; }
}

public class FleetUtilizationViewModel
{
    public int Total { get; set; }

    public int Available { get; set; }

    public int Rented { get; set; }

    public int Reserved { get; set; }

    public int Maintenance { get; set; }
}

public class BranchReportRowViewModel
{
    public int BranchId { get; set; }

    public string BranchName { get; set; } = null!;

    public int Services { get; set; }

    public int Rentals { get; set; }

    public int Emergencies { get; set; }

    public double Revenue { get; set; }
}
