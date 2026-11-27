using CSMS.Data;
using CSMS.Dto;
using CSMS.Dto.Branch;
using CSMS.Dto.Common;
using CSMS.Dto.DriversDto;
using CSMS.Enums;
using CSMS.Helper;
using CSMS.service.Emergency_serv;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace CSMS.service.Adminserv
{
    public class AdminService : IAdminService
    {
        private readonly ApplicationDbContext _context;
        private const string RentalsCategory = "rentals";
        private const string ServicesCategory = "services";
        public AdminService(ApplicationDbContext context)
        {
            _context = context ;
        }
        public async Task<(bool Success, string[] errors)> ConfirmDriver(string adminId, int DriverId)
        {
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.DriverId == DriverId);
            var admin = await _context.Admin.FirstOrDefaultAsync(a => a.UserId == adminId);
            if (driver is null)
            {
                return (false, new string[] { "Driver not found" });
            }
            if (admin is null)
            {
                return (false, new string[] { "Admin not found" });
            }
            driver.IsVerified = true;
            driver.AcceptedBy = admin.AdminId;
            await _context.SaveChangesAsync();
            return (true, Array.Empty<string>());

        }

        public async Task<PagedResult<DriverResponse>> GetUnverifiedDriversAsync(int page, int pageSize)
        {
            var Drivers = await _context.Drivers.Where(d => d.IsVerified == false)
                .Select(d => new DriverResponse
            {
                Fullname = d.FullName,
                Email = d.Email,
                PhoneNumber = d.PhoneNumber,
                Salary = d.Salary,
                BranchId = d.BranchId,
                DriverId = d.DriverId
            }).ToListAsync();
            var totalCount = Drivers.Count();
            var pagedDrivers = Drivers.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return new PagedResult<DriverResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                Data = pagedDrivers
            };
        }

        public async Task<(bool Success, string[] errors)> RejectDriver(string adminId, string? reason, int DriverId)
        {
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.DriverId == DriverId);
            if (driver is null)
            {
                return (false, new string[] { "Driver not found" });
            }
            var admin = await _context.Admin.FirstOrDefaultAsync(a => a.UserId == adminId);
            if (admin is null)
            {
                return (false, new string[] { "Admin not found" });
            }
            driver.IsVerified = false;
            driver.RejectedBy = admin.AdminId;
            await _context.SaveChangesAsync();
            return (true, Array.Empty<string>());
        }
        public async Task<AdminDashboardViewModel> GetDashboardAsync(AdminDashboardQueryDto query)
        {
            var (from, to) = ResolveRange(query, 30);

            var employees = _context.Employees.AsNoTracking();
            var drivers = _context.Drivers.AsNoTracking();
            var rentalCars = _context.CarsForRents.AsNoTracking();
            var trucks = _context.EmergencyTrucks.AsNoTracking();
            var visits = _context.Visits.AsNoTracking()
                .Where(visit => visit.ServiceDate >= from && visit.ServiceDate <= to);

            var activeStatuses = EmergencyStatusHelper.ActiveStatuses;
            var activeSos = _context.EmergencyRequests.AsNoTracking()
                .Where(request => activeStatuses.Contains(request.StatusEmergency));

            var branches = _context.ServiceBranches.AsNoTracking();

            if (query.BranchId.HasValue)
            {
                var branchId = query.BranchId.Value;
                employees = employees.Where(item => item.BranchId == branchId);
                drivers = drivers.Where(item => item.BranchId == branchId);
                trucks = trucks.Where(item => item.BranchId == branchId);
                visits = visits.Where(item => item.BranchId == branchId);
                activeSos = activeSos.Where(item => item.Driver != null && item.Driver.BranchId == branchId);
                branches = branches.Where(item => item.BranchId == branchId);
            }

            var revenueRows = await LoadRevenueRowsAsync(from, to, query.BranchId);

            return new AdminDashboardViewModel
            {
                FromDate = from,
                ToDate = to,
                BranchId = query.BranchId,
                Customers = await _context.Customers.CountAsync(),
                Staff = new DashboardStaffViewModel
                {
                    Employees = await employees.CountAsync(),
                    Drivers = await drivers.CountAsync()
                },
                Branches = await branches.CountAsync(),
                Fleet = new DashboardFleetViewModel
                {
                    RentalCars = await rentalCars.CountAsync(),
                    EmergencyTrucks = await trucks.CountAsync()
                },
                ActiveSos = await activeSos.CountAsync(),
                Visits = await visits.CountAsync(),
                Revenue = new RevenueSummaryViewModel
                {
                    Rentals = Sum(revenueRows, RentalsCategory),
                    Services = Sum(revenueRows, ServicesCategory),
                    Total = Math.Round(revenueRows.Sum(row => row.Amount), 2)
                }
            };
        }

  
        public async Task<IReadOnlyList<RevenueReportRowViewModel>> GetRevenueReportAsync(RevenueReportQueryDto query)
        {
            var (from, to) = ResolveRange(query, 365);
            // Revenue is company-wide: the branch is the same for everything, so no branch filter here.
            var rows = await LoadRevenueRowsAsync(from, to, null);
            var groupBy = query.GroupBy.ToLowerInvariant();

            return rows
                .GroupBy(row => PeriodKey(row.Date, groupBy))
                .OrderBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => new RevenueReportRowViewModel
                {
                    Period = group.Key,
                    Rentals = Sum(group, RentalsCategory),
                    Services = Sum(group, ServicesCategory),
                    Total = Math.Round(group.Sum(row => row.Amount), 2)
                })
                .ToList();
        }
        public async Task<List<RevenueRow>> LoadRevenueRowsAsync(DateOnly from, DateOnly to, int? branchId)
        {
            var fromDateTime = from.ToDateTime(TimeOnly.MinValue);
            var toExclusive = to.AddDays(1).ToDateTime(TimeOnly.MinValue);

            var rentals = _context.RentedCarCustomers
                .AsNoTracking()
                .Where(rental => rental.RentStartDate >= from && rental.RentStartDate <= to);

            var services = _context.Services
                .AsNoTracking()
                .Where(service =>
                    service.Approved &&
                    service.Visit.Status == Status.Completed &&
                    service.ServiceDate >= fromDateTime &&
                    service.ServiceDate < toExclusive);

            if (branchId.HasValue)
            {
                var branch = branchId.Value;
                services = services.Where(service => service.Visit.BranchId == branch);
            }

            var rentalRows = await rentals
                .Select(rental => new
                {
                    rental.RentStartDate,
                    rental.IsCancelled,
                    rental.PriceForRent,
                    rental.CancellationFee,
                })
                .ToListAsync();

            var serviceRows = await services
                .Select(service => new
                {
                    service.ServiceDate,
                    Price = service.Product.Price,
                    BranchId = service.Visit.BranchId
                })
                .ToListAsync();

            var rows = new List<RevenueRow>();

            foreach (var rental in rentalRows)
            {
                var amount = rental.IsCancelled ? rental.CancellationFee : rental.PriceForRent;
                if (amount > 0)
                {
                    rows.Add(new RevenueRow(rental.RentStartDate, RentalsCategory, amount));
                }
            }

            foreach (var service in serviceRows)
            {
                rows.Add(new RevenueRow(
                    DateOnly.FromDateTime(service.ServiceDate),
                    ServicesCategory,
                    (double)service.Price));
            }

            return rows;
        }
        public async Task<FleetUtilizationViewModel> GetFleetUtilizationAsync()
        {
            var today = RentalStatusHelper.Today();

            var cars = await _context.CarsForRents
                .AsNoTracking()
                .Select(car => new { car.LicencePlate, car.Status })
                .ToListAsync();

            var reservations = await _context.RentedCarCustomers
                .AsNoTracking()
                .Where(rental => !rental.IsCancelled && rental.RentEndDate >= today)
                .Select(rental => new
                {
                    rental.LicencsePlateRented,
                    rental.RentStartDate,
                    rental.RentEndDate
                })
                .ToListAsync();

            var rentedPlates = reservations
                .Where(item => item.RentStartDate <= today)
                .Select(item => item.LicencsePlateRented)
                .ToHashSet();
            var reservedPlates = reservations
                .Where(item => item.RentStartDate > today)
                .Select(item => item.LicencsePlateRented)
                .ToHashSet();

            var result = new FleetUtilizationViewModel { Total = cars.Count };
            foreach (var car in cars)
            {
                if (car.Status == RentalCarStatus.Maintenance)
                {
                    result.Maintenance++;
                }
                else if (rentedPlates.Contains(car.LicencePlate))
                {
                    result.Rented++;
                }
                else if (reservedPlates.Contains(car.LicencePlate))
                {
                    result.Reserved++;
                }
                else
                {
                    result.Available++;
                }
            }

            return result;
        }
        public async Task<IReadOnlyList<BranchReportRowViewModel>> GetBranchReportAsync(
      AdminDateRangeQueryDto query)
        {
            var (from, to) = ResolveRange(query, 30);
            var fromDateTime = from.ToDateTime(TimeOnly.MinValue);
            var toExclusive = to.AddDays(1).ToDateTime(TimeOnly.MinValue);

            var branches = await _context.ServiceBranches
                .AsNoTracking()
                .OrderBy(branch => branch.BranchId)
                .Select(branch => new { branch.BranchId, branch.BranchName })
                .ToListAsync();

            var revenueRows = await LoadRevenueRowsAsync(from, to, null);

            // Rentals belong to the branch of the rented car (CarsForRent.BranchId).
            var rentalBranchIds = await _context.RentedCarCustomers
                .AsNoTracking()
                .Where(rental =>
                    !rental.IsCancelled &&
                    rental.RentStartDate >= from &&
                    rental.RentStartDate <= to)
                .ToListAsync();

            // Emergencies belong to the branch of the assigned driver.
            var emergencyBranchIds = await _context.EmergencyRequests
                .AsNoTracking()
                .Where(request =>
                    request.EmergenctTime >= fromDateTime &&
                    request.EmergenctTime < toExclusive &&
                    request.Driver != null)
                .Select(request => request.Driver!.BranchId)
                .ToListAsync();

            return branches
                .Select(branch => new BranchReportRowViewModel
                {
                    BranchId = branch.BranchId,
                    BranchName = branch.BranchName,
                    Services = revenueRows.Count(row =>
                        row.Category == ServicesCategory),
                    Emergencies = emergencyBranchIds.Count(id => id == branch.BranchId),
                    Revenue = Math.Round(
                        revenueRows.Sum(row => row.Amount),
                        2)
                })
                .ToList();
        }
        public async Task<EmergencyRequestViewModel?> GetRequestsDetailsAsync(int emergencyId)
        {
            var requests = await _context.EmergencyRequests
            .AsNoTracking()
            .Include(request => request.CarLicencePlateNavigation)
            .ThenInclude(car => car.Customer)
            .Include(request => request.Driver)
            .ThenInclude(driver => driver!.Branch)
            .Include(request => request.Truck)
            .FirstOrDefaultAsync(i=>i.EmergencyRequestId== emergencyId);

            return requests is null ? null : EmergencyService.ToViewModel(requests);
        }

        public async Task<PagedViewModel<AdminEmergencyRequestListItemViewModel>> GetEmergencyRequestsAsync(
            EmergencyRequestListQueryDto query)
        {
            var requests = _context.EmergencyRequests
                .AsNoTracking()
                .AsQueryable();

            requests = EmergencyService.ApplyFilters(requests, query);

            var totalCount = await requests.CountAsync();
            var rows = await requests
                .OrderByDescending(request => request.EmergenctTime)
                .ThenByDescending(request => request.EmergencyRequestId)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(request => new
                {
                    request.EmergencyRequestId,
                    RequestedAt = request.EmergenctTime,
                    request.CarLicencePlate,
                    request.ProblemType,
                    request.StatusEmergency,
                    CustomerName = request.CarLicencePlateNavigation.Customer.FullName
                })
                .ToListAsync();

            return new PagedViewModel<AdminEmergencyRequestListItemViewModel>
            {
                Page = query.Page,
                PageSize = query.PageSize,
                TotalCount = totalCount,
                Data = rows.Select(request => new AdminEmergencyRequestListItemViewModel
                {
                    EmergencyRequestId = request.EmergencyRequestId,
                    RequestedAt = request.RequestedAt,
                    CarLicencePlate = request.CarLicencePlate,
                    ProblemType = request.ProblemType,
                    Status = request.StatusEmergency.ToApiName(),
                    CustomerName = request.CustomerName
                }).ToList()
            };
        }


        private static string PeriodKey(DateOnly date, string groupBy)
        {
            return groupBy switch
            {
                "month" => date.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                "year" => date.ToString("yyyy", CultureInfo.InvariantCulture),
                _ => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            };
        }

        private static double Sum(IEnumerable<RevenueRow> rows, string category)
        {
            return Math.Round(rows.Where(row => row.Category == category).Sum(row => row.Amount), 2);
        }
        private static (DateOnly From, DateOnly To) ResolveRange(AdminDateRangeQueryDto query, int defaultDays)
        {
            var today = RentalStatusHelper.Today();
            var to = query.ToDate ?? today;
            var from = query.FromDate ?? to.AddDays(-(defaultDays - 1));
            if (to < from)
            {
                to = from;
            }

            return (from, to);
        }


        public record RevenueRow(DateOnly Date, string Category, double Amount);
    }
}
