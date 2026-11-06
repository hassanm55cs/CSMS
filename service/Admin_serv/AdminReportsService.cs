using System.Globalization;
using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Admin_serv;

public class AdminReportsService
{
    private static readonly StatusEmergency[] ActiveEmergencyStatuses =
    [
        StatusEmergency.requested,
        StatusEmergency.confirmed,
        StatusEmergency.assigned,
        StatusEmergency.onTheWay,
        StatusEmergency.arrived,
        StatusEmergency.tobranch,
        StatusEmergency.arrivedToBranch
    ];

    private readonly ApplicationDbContext _context;

    public AdminReportsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<bool> BranchExistsAsync(int branchId)
    {
        return _context.ServiceBranches.AnyAsync(branch => branch.BranchId == branchId);
    }

    public async Task<AdminDashboardViewModel> GetDashboardAsync(ReportQueryDto query)
    {
        var from = query.FromDate?.ToDateTime(TimeOnly.MinValue);
        var to = query.ToDate?.ToDateTime(TimeOnly.MaxValue);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var visits = _context.Visits.AsNoTracking();
        var emergencyRequests = _context.EmergencyRequests.AsNoTracking();
        var rentalCars = _context.CarsForRents.AsNoTracking();
        var emergencyTrucks = _context.EmergencyTrucks.AsNoTracking();

        if (from.HasValue)
        {
            visits = visits.Where(visit => visit.ServiceDate >= query.FromDate!.Value);
            emergencyRequests = emergencyRequests.Where(
                item => item.EmergenctTime >= from.Value);
        }

        if (to.HasValue)
        {
            visits = visits.Where(visit => visit.ServiceDate <= query.ToDate!.Value);
            emergencyRequests = emergencyRequests.Where(
                item => item.EmergenctTime <= to.Value);
        }

        if (query.BranchId.HasValue)
        {
            visits = visits.Where(visit => visit.BranchId == query.BranchId);
            emergencyRequests = emergencyRequests.Where(
                item => item.Driver != null && item.Driver.BranchId == query.BranchId);
            rentalCars = rentalCars.Where(item => item.BranchId == query.BranchId);
            emergencyTrucks = emergencyTrucks.Where(item => item.BranchId == query.BranchId);
        }

        var (rentalRevenue, serviceRevenue) = await GetRevenueTotalsAsync(query);

        return new AdminDashboardViewModel
        {
            Customers = await _context.Customers.CountAsync(),
            Drivers = query.BranchId.HasValue
                ? await _context.Drivers.CountAsync(item => item.BranchId == query.BranchId)
                : await _context.Drivers.CountAsync(),
            Employees = query.BranchId.HasValue
                ? await _context.Employees.CountAsync(item => item.BranchId == query.BranchId)
                : await _context.Employees.CountAsync(),
            Branches = query.BranchId.HasValue
                ? await _context.ServiceBranches.CountAsync(item => item.BranchId == query.BranchId)
                : await _context.ServiceBranches.CountAsync(),
            RentalCars = await rentalCars.CountAsync(),
            AvailableRentalCars = await rentalCars.CountAsync(car =>
                !car.IsUnderMaintenance &&
                car.PricePerDay > 0 &&
                !car.RentedCarCustomers.Any(reservation =>
                    reservation.Status != RentalStatus.Cancelled &&
                    reservation.RentStartDate <= today &&
                    reservation.RentEndDate >= today)),
            EmergencyTrucks = await emergencyTrucks.CountAsync(),
            AvailableEmergencyTrucks = await emergencyTrucks.CountAsync(truck => truck.IsAvailable),
            ActiveEmergencyRequests = await emergencyRequests.CountAsync(
                item => ActiveEmergencyStatuses.Contains(item.StatusEmergency)),
            Visits = await visits.CountAsync(),
            Revenue = rentalRevenue + serviceRevenue
        };
    }

    public async Task<IReadOnlyList<RevenueReportViewModel>> GetRevenueReportAsync(
        RevenueReportQueryDto query)
    {
        var periods = new Dictionary<string, RevenueReportViewModel>();

        var rentalRows = await GetRentalRevenueQuery(query)
            .GroupBy(item => new
            {
                Year = item.RentStartDate.Year,
                Month = query.GroupBy == ReportGroupBy.Year
                    ? 0
                    : item.RentStartDate.Month,
                Day = query.GroupBy == ReportGroupBy.Day
                    ? item.RentStartDate.Day
                    : 0
            })
            .Select(group => new RentalPeriodRevenueRecord
            {
                Year = group.Key.Year,
                Month = group.Key.Month,
                Day = group.Key.Day,
                Amount = group.Sum(item => item.PriceForRent)
            })
            .ToListAsync();

        foreach (var row in rentalRows)
        {
            var period = GetPeriod(row.Year, row.Month, row.Day, query.GroupBy);
            if (!periods.TryGetValue(period, out var report))
            {
                report = new RevenueReportViewModel { Period = period };
                periods.Add(period, report);
            }

            report.RentalRevenue += Convert.ToDecimal(row.Amount);
        }

        var serviceRows = await GetServiceRevenueQuery(query)
            .GroupBy(item => new
            {
                Year = item.ServiceDate.Year,
                Month = query.GroupBy == ReportGroupBy.Year
                    ? 0
                    : item.ServiceDate.Month,
                Day = query.GroupBy == ReportGroupBy.Day
                    ? item.ServiceDate.Day
                    : 0
            })
            .Select(group => new ServicePeriodRevenueRecord
            {
                Year = group.Key.Year,
                Month = group.Key.Month,
                Day = group.Key.Day,
                Amount = group.Sum(item => item.Product.Price)
            })
            .ToListAsync();

        foreach (var row in serviceRows)
        {
            var period = GetPeriod(row.Year, row.Month, row.Day, query.GroupBy);
            if (!periods.TryGetValue(period, out var report))
            {
                report = new RevenueReportViewModel { Period = period };
                periods.Add(period, report);
            }

            report.ServiceRevenue += row.Amount;
        }

        foreach (var report in periods.Values)
        {
            report.TotalRevenue = report.RentalRevenue + report.ServiceRevenue;
        }

        return periods.Values.OrderBy(item => item.Period).ToList();
    }

    public async Task<FleetUtilizationViewModel> GetFleetUtilizationAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var cars = _context.CarsForRents.AsNoTracking();
        var currentRentals = cars.Where(car =>
            car.RentedCarCustomers.Any(reservation =>
                reservation.Status != RentalStatus.Cancelled &&
                reservation.RentStartDate <= today &&
                reservation.RentEndDate >= today));

        var maintenance = await cars.CountAsync(car => car.IsUnderMaintenance);
        var rented = await currentRentals.CountAsync(car => !car.IsUnderMaintenance);
        var reserved = await cars.CountAsync(car =>
            !car.IsUnderMaintenance &&
            !car.RentedCarCustomers.Any(reservation =>
                reservation.Status != RentalStatus.Cancelled &&
                reservation.RentStartDate <= today &&
                reservation.RentEndDate >= today) &&
            car.RentedCarCustomers.Any(reservation =>
                reservation.Status != RentalStatus.Cancelled &&
                reservation.RentStartDate > today));
        var available = await cars.CountAsync(car =>
            !car.IsUnderMaintenance &&
            !car.RentedCarCustomers.Any(reservation =>
                reservation.Status != RentalStatus.Cancelled &&
                reservation.RentStartDate <= today &&
                reservation.RentEndDate >= today) &&
            !car.RentedCarCustomers.Any(reservation =>
                reservation.Status != RentalStatus.Cancelled &&
                reservation.RentStartDate > today));

        return new FleetUtilizationViewModel
        {
            Available = available,
            Rented = rented,
            Maintenance = maintenance,
            Reserved = reserved
        };
    }

    public async Task<IReadOnlyList<BranchReportViewModel>> GetBranchReportAsync(
        ReportQueryDto query)
    {
        var branches = await _context.ServiceBranches
            .AsNoTracking()
            .OrderBy(branch => branch.BranchId)
            .Select(branch => new { branch.BranchId, branch.BranchName })
            .ToListAsync();

        var services = _context.Services.AsNoTracking();
        var rentals = _context.RentedCarCustomers
            .AsNoTracking()
            .Where(item => item.Status != RentalStatus.Cancelled);
        var emergencies = _context.EmergencyRequests.AsNoTracking();

        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            services = services.Where(item => item.ServiceDate >= from);
            rentals = rentals.Where(item => item.RentStartDate >= query.FromDate.Value);
            emergencies = emergencies.Where(item => item.EmergenctTime >= from);
        }

        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.ToDateTime(TimeOnly.MaxValue);
            services = services.Where(item => item.ServiceDate <= to);
            rentals = rentals.Where(item => item.RentStartDate <= query.ToDate.Value);
            emergencies = emergencies.Where(item => item.EmergenctTime <= to);
        }

        var serviceCounts = await services
            .GroupBy(item => item.Visit.BranchId)
            .Select(group => new
            {
                BranchId = group.Key,
                Count = group.Count(),
                Revenue = group.Sum(item => item.Approved ? item.Product.Price : 0m)
            })
            .ToDictionaryAsync(item => item.BranchId);

        var rentalCounts = await rentals
            .Where(item => item.LicencsePlateRentedNavigation.BranchId.HasValue)
            .GroupBy(item => item.LicencsePlateRentedNavigation.BranchId!.Value)
            .Select(group => new
            {
                BranchId = group.Key,
                Count = group.Count(),
                Revenue = group.Sum(item => item.PriceForRent)
            })
            .ToDictionaryAsync(item => item.BranchId);

        var emergencyCounts = await emergencies
            .Where(item => item.Driver != null)
            .GroupBy(item => item.Driver!.BranchId)
            .Select(group => new
            {
                BranchId = group.Key,
                Count = group.Count()
            })
            .ToDictionaryAsync(item => item.BranchId);

        return branches.Select(branch =>
        {
            serviceCounts.TryGetValue(branch.BranchId, out var service);
            rentalCounts.TryGetValue(branch.BranchId, out var rental);
            emergencyCounts.TryGetValue(branch.BranchId, out var emergency);

            return new BranchReportViewModel
            {
                BranchId = branch.BranchId,
                BranchName = branch.BranchName,
                Services = service?.Count ?? 0,
                Rentals = rental?.Count ?? 0,
                Emergencies = emergency?.Count ?? 0,
                Revenue = (service?.Revenue ?? 0m) +
                    Convert.ToDecimal(rental?.Revenue ?? 0d)
            };
        }).ToList();
    }

    private async Task<(decimal RentalRevenue, decimal ServiceRevenue)> GetRevenueTotalsAsync(
        ReportQueryDto query)
    {
        var rentalTotal = await GetRentalRevenueQuery(query)
            .SumAsync(item => item.PriceForRent);
        var serviceTotal = await GetServiceRevenueQuery(query)
            .SumAsync(item => item.Product.Price);
        return (
            Convert.ToDecimal(rentalTotal),
            serviceTotal);
    }

    private IQueryable<RentedCarCustomer> GetRentalRevenueQuery(ReportQueryDto query)
    {
        var rentals = _context.RentedCarCustomers
            .AsNoTracking()
            .Where(item => item.Status != RentalStatus.Cancelled);

        if (query.FromDate.HasValue)
        {
            rentals = rentals.Where(item => item.RentStartDate >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            rentals = rentals.Where(item => item.RentStartDate <= query.ToDate.Value);
        }

        if (query.BranchId.HasValue)
        {
            rentals = rentals.Where(
                item => item.LicencsePlateRentedNavigation.BranchId == query.BranchId);
        }

        return rentals;
    }

    private IQueryable<Service> GetServiceRevenueQuery(ReportQueryDto query)
    {
        var services = _context.Services
            .AsNoTracking()
            .Where(item => item.Approved);

        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            services = services.Where(item => item.ServiceDate >= from);
        }

        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.ToDateTime(TimeOnly.MaxValue);
            services = services.Where(item => item.ServiceDate <= to);
        }

        if (query.BranchId.HasValue)
        {
            services = services.Where(item => item.Visit.BranchId == query.BranchId);
        }

        return services;
    }

    private static string GetPeriod(int year, int month, int day, ReportGroupBy groupBy)
    {
        return groupBy switch
        {
            ReportGroupBy.Month => string.Create(
                CultureInfo.InvariantCulture,
                $"{year:D4}-{month:D2}"),
            ReportGroupBy.Year => year.ToString("D4", CultureInfo.InvariantCulture),
            _ => string.Create(
                CultureInfo.InvariantCulture,
                $"{year:D4}-{month:D2}-{day:D2}")
        };
    }

    private sealed class RentalPeriodRevenueRecord
    {
        public int Year { get; set; }

        public int Month { get; set; }

        public int Day { get; set; }

        public double Amount { get; set; }
    }

    private sealed class ServicePeriodRevenueRecord
    {
        public int Year { get; set; }

        public int Month { get; set; }

        public int Day { get; set; }

        public decimal Amount { get; set; }
    }
}
