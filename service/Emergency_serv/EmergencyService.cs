using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Helper;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Emergency_serv;

public class EmergencyService:IEmergencyService
{
    private readonly ApplicationDbContext _context;

    public EmergencyService(ApplicationDbContext context)
    {
        _context = context;
    }

    // ------------------------------------------------------------------
    // Customer
    // ------------------------------------------------------------------

    public async Task<EmergencyResult> CreateRequestAsync(string userId, CreateEmergencyRequestDto dto)
    {
        var latitude = dto.Latitude!.Value;
        var longitude = dto.Longitude!.Value;
        if (!GeoHelper.IsValid(latitude, longitude))
        {
            return new EmergencyResult(EmergencyResultStatus.InvalidCoordinates);
        }

        var problemType = SosProblemTypes.Find(dto.ProblemType);
        if (problemType is null)
        {
            return new EmergencyResult(EmergencyResultStatus.InvalidProblemType);
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return new EmergencyResult(EmergencyResultStatus.CustomerNotFound);
        }

        // The car must belong to the calling customer.
        var licencePlate = dto.CarLicencePlate.Trim();
        var carExists = await _context.Cars
            .AnyAsync(car => car.LicencesPlate == licencePlate && car.CustomerId == customer.CustomerId);
        if (!carExists)
        {
            return new EmergencyResult(EmergencyResultStatus.CarNotFound);
        }

        var activeStatuses = EmergencyStatusHelper.ActiveStatuses;
        var hasActiveRequest = await _context.EmergencyRequests.AnyAsync(request =>
            request.CarLicencePlate == licencePlate &&
            activeStatuses.Contains(request.StatusEmergency));
        if (hasActiveRequest)
        {
            return new EmergencyResult(EmergencyResultStatus.DuplicateActiveRequest);
        }

        var now = DateTime.UtcNow;
        var emergencyRequest = new EmergencyRequest
        {
            CarLicencePlate = licencePlate,
            ProblemType = problemType,
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Latitude = GeoHelper.Format(latitude),
            Longitude = GeoHelper.Format(longitude),
            StatusEmergency = StatusEmergency.requested,
            EmergenctTime = now,
            UpdatedAt = now
        };

        _context.EmergencyRequests.Add(emergencyRequest);
        await _context.SaveChangesAsync();

        return await LoadResultAsync(emergencyRequest.EmergencyRequestId);
    }

    public async Task<PagedViewModel<EmergencyRequestViewModel>> GetMyRequestsAsync(
        string userId,
        EmergencyRequestListQueryDto query)
    {
        var requests = ApplyFilters(
            RequestsWithDetails()
                .AsNoTracking()
                .Where(request => request.CarLicencePlateNavigation.Customer.UserId == userId),
            query);

        var totalCount = await requests.CountAsync();
        var page = await requests
            .OrderByDescending(request => request.EmergenctTime)
            .ThenByDescending(request => request.EmergencyRequestId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedViewModel<EmergencyRequestViewModel>
        {
            Data = page.Select(ToViewModel).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    // Owner, assigned driver or admin. Anyone else gets "not found" so ids cannot be probed.
    public async Task<EmergencyRequestViewModel?> GetRequestAsync(
        int emergencyRequestId,
        string userId,
        bool isAdmin)
    {
        var request = await RequestsWithDetails()
            .AsNoTracking()
            .Where(item =>
                item.EmergencyRequestId == emergencyRequestId &&
                (isAdmin ||
                 item.CarLicencePlateNavigation.Customer.UserId == userId ||
                 (item.Driver != null && item.Driver.UserId == userId)))
            .SingleOrDefaultAsync();

        return request is null ? null : ToViewModel(request);
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    public async Task<EmergencyResult> AssignAsync(int emergencyRequestId, AssignEmergencyDto dto)
    {
        var request = await _context.EmergencyRequests
            .Include(item => item.Driver)
            .Include(item => item.Truck)
            .SingleOrDefaultAsync(item => item.EmergencyRequestId == emergencyRequestId);
        if (request is null)
        {
            return new EmergencyResult(EmergencyResultStatus.NotFound);
        }

        // Re-assigning is allowed only until the driver is on the way.
        if (request.StatusEmergency is not (StatusEmergency.requested or
            StatusEmergency.confirmed or
            StatusEmergency.assigned))
        {
            return new EmergencyResult(EmergencyResultStatus.NotAssignable);
        }

        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.DriverId == dto.DriverId!.Value);
        if (driver is null)
        {
            return new EmergencyResult(EmergencyResultStatus.DriverNotFound);
        }

        var truckPlate = dto.TruckLicencePlate.Trim();
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == truckPlate);
        if (truck is null)
        {
            return new EmergencyResult(EmergencyResultStatus.TruckNotFound);
        }

        var sameDriver = request.DriverId == driver.DriverId;
        var sameTruck = request.TruckLicencePlate == truck.LicencePlate;

        if (!sameDriver &&
            (driver.IsAvailable != true ||
             await HasActiveRequestAsync(driver.DriverId, emergencyRequestId)))
        {
            return new EmergencyResult(EmergencyResultStatus.DriverUnavailable);
        }

        if (!sameTruck && !truck.IsAvailable)
        {
            return new EmergencyResult(EmergencyResultStatus.TruckUnavailable);
        }

        if (driver.BranchId != truck.BranchId)
        {
            return new EmergencyResult(EmergencyResultStatus.BranchMismatch);
        }

        // Free the previous driver / truck when re-assigning.
        if (!sameDriver && request.Driver is not null)
        {
            request.Driver.IsAvailable = true;
        }

        if (!sameTruck && request.Truck is not null)
        {
            request.Truck.IsAvailable = true;
        }

        request.DriverId = driver.DriverId;
        request.TruckLicencePlate = truck.LicencePlate;
        request.StatusEmergency = StatusEmergency.assigned;
        request.UpdatedAt = DateTime.UtcNow;
        driver.IsAvailable = false;
        truck.IsAvailable = false;

        if (!await TrySaveAsync())
        {
            return new EmergencyResult(EmergencyResultStatus.Conflict);
        }

        return await LoadResultAsync(emergencyRequestId);
    }

    // ------------------------------------------------------------------
    // Status flow (assigned driver or admin)
    // ------------------------------------------------------------------

    public async Task<EmergencyResult> UpdateStatusAsync(
        int emergencyRequestId,
        string userId,
        bool isAdmin,
        UpdateEmergencyStatusDto dto)
    {
        if (!Enum.TryParse<StatusEmergency>(dto.Status, true, out var target) ||
            !Enum.IsDefined(target))
        {
            return new EmergencyResult(EmergencyResultStatus.InvalidStatus);
        }

        // Requested/Assigned come from assignment, Cancelled from the cancel endpoint.
        if (target is not (StatusEmergency.onTheWay or
            StatusEmergency.arrived or
            StatusEmergency.completed))
        {
            return new EmergencyResult(EmergencyResultStatus.InvalidTransition);
        }

        if (dto.Latitude.HasValue != dto.Longitude.HasValue ||
            (dto.Latitude.HasValue && !GeoHelper.IsValid(dto.Latitude.Value, dto.Longitude!.Value)))
        {
            return new EmergencyResult(EmergencyResultStatus.InvalidCoordinates);
        }

        var request = await _context.EmergencyRequests
            .Include(item => item.Driver)
            .Include(item => item.Truck)
            .SingleOrDefaultAsync(item => item.EmergencyRequestId == emergencyRequestId);
        if (request is null)
        {
            return new EmergencyResult(EmergencyResultStatus.NotFound);
        }

        if (!isAdmin && (request.Driver is null || request.Driver.UserId != userId))
        {
            return new EmergencyResult(EmergencyResultStatus.Forbidden);
        }

        if (request.Driver is null || request.StatusEmergency.NextStatus() != target)
        {
            return new EmergencyResult(EmergencyResultStatus.InvalidTransition);
        }

        request.StatusEmergency = target;
        request.UpdatedAt = DateTime.UtcNow;

        if (dto.Latitude.HasValue)
        {
            request.Driver.Latitude = GeoHelper.Format(dto.Latitude.Value);
            request.Driver.Longitude = GeoHelper.Format(dto.Longitude!.Value);
        }

        if (target == StatusEmergency.completed)
        {
            ReleaseDriverAndTruck(request);
        }

        if (!await TrySaveAsync())
        {
            return new EmergencyResult(EmergencyResultStatus.Conflict);
        }

        return await LoadResultAsync(emergencyRequestId);
    }

    public async Task<EmergencyResult> CancelAsync(
        int emergencyRequestId,
        string userId,
        bool isAdmin,
        string? reason)
    {
        var request = await _context.EmergencyRequests
            .Include(item => item.Driver)
            .Include(item => item.Truck)
            .Include(item => item.CarLicencePlateNavigation)
                .ThenInclude(car => car.Customer)
            .SingleOrDefaultAsync(item => item.EmergencyRequestId == emergencyRequestId);
        if (request is null)
        {
            return new EmergencyResult(EmergencyResultStatus.NotFound);
        }

        var isOwner = request.CarLicencePlateNavigation.Customer.UserId == userId;
        var isAssignedDriver = request.Driver is not null && request.Driver.UserId == userId;
        if (!isAdmin && !isOwner && !isAssignedDriver)
        {
            return new EmergencyResult(EmergencyResultStatus.NotFound);
        }

        if (!request.StatusEmergency.IsActive())
        {
            return new EmergencyResult(EmergencyResultStatus.AlreadyClosed);
        }

        var now = DateTime.UtcNow;
        request.StatusEmergency = StatusEmergency.cancelled;
        request.CancelledAt = now;
        request.UpdatedAt = now;
        request.CancellationReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        ReleaseDriverAndTruck(request);

        if (!await TrySaveAsync())
        {
            return new EmergencyResult(EmergencyResultStatus.Conflict);
        }

        return await LoadResultAsync(emergencyRequestId);
    }

    // ------------------------------------------------------------------
    // Driver app (identity always comes from the token)
    // ------------------------------------------------------------------

    public async Task<PagedViewModel<DriverEmergencyRequestViewModel>> GetDriverRequestsAsync(
        string userId,
        EmergencyRequestListQueryDto query,
        bool? assigned,
        int? branchId)
    {
        var requests = RequestsWithDetails().AsNoTracking();

        requests = assigned switch
        {
            true => requests.Where(request =>
                request.Driver != null && request.Driver.UserId == userId),
            false => requests.Where(request =>
                request.DriverId == null && request.StatusEmergency == StatusEmergency.requested),
            _ => requests.Where(request =>
                (request.DriverId == null && request.StatusEmergency == StatusEmergency.requested) ||
                (request.Driver != null && request.Driver.UserId == userId))
        };

        // Open requests have no branch yet, so they stay visible; assigned ones match the driver's branch.
        if (branchId.HasValue)
        {
            var branch = branchId.Value;
            requests = requests.Where(request =>
                request.Driver == null || request.Driver.BranchId == branch);
        }

        requests = ApplyFilters(requests, query);

        var totalCount = await requests.CountAsync();
        var page = await requests
            .OrderByDescending(request => request.EmergenctTime)
            .ThenByDescending(request => request.EmergencyRequestId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedViewModel<DriverEmergencyRequestViewModel>
        {
            Data = page.Select(request => ToDriverViewModel(request, userId)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    // A driver can open the open pool or their own requests, nothing else.
    public async Task<DriverEmergencyRequestViewModel?> GetDriverRequestAsync(
        int emergencyRequestId,
        string userId)
    {
        var request = await RequestsWithDetails()
            .AsNoTracking()
            .Where(item =>
                item.EmergencyRequestId == emergencyRequestId &&
                ((item.DriverId == null && item.StatusEmergency == StatusEmergency.requested) ||
                 (item.Driver != null && item.Driver.UserId == userId)))
            .SingleOrDefaultAsync();

        return request is null ? null : ToDriverViewModel(request, userId);
    }

    public async Task<EmergencyResult> AcceptAsync(
        int emergencyRequestId,
        string userId,
        string truckLicencePlate)
    {
        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (driver is null)
        {
            return new EmergencyResult(EmergencyResultStatus.DriverNotFound);
        }

        var request = await _context.EmergencyRequests
            .SingleOrDefaultAsync(item => item.EmergencyRequestId == emergencyRequestId);
        if (request is null)
        {
            return new EmergencyResult(EmergencyResultStatus.NotFound);
        }

        if (request.StatusEmergency != StatusEmergency.requested || request.DriverId is not null)
        {
            return new EmergencyResult(EmergencyResultStatus.NotAssignable);
        }

        if (driver.IsAvailable != true ||
            await HasActiveRequestAsync(driver.DriverId, emergencyRequestId))
        {
            return new EmergencyResult(EmergencyResultStatus.DriverUnavailable);
        }

        var truckPlate = truckLicencePlate.Trim();
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == truckPlate);
        if (truck is null)
        {
            return new EmergencyResult(EmergencyResultStatus.TruckNotFound);
        }

        if (!truck.IsAvailable)
        {
            return new EmergencyResult(EmergencyResultStatus.TruckUnavailable);
        }

        if (truck.BranchId != driver.BranchId)
        {
            return new EmergencyResult(EmergencyResultStatus.BranchMismatch);
        }

        request.DriverId = driver.DriverId;
        request.TruckLicencePlate = truck.LicencePlate;
        request.StatusEmergency = StatusEmergency.assigned;
        request.UpdatedAt = DateTime.UtcNow;
        driver.IsAvailable = false;
        truck.IsAvailable = false;

        // RowVersion makes sure only one driver wins if two accept at the same time.
        if (!await TrySaveAsync())
        {
            return new EmergencyResult(EmergencyResultStatus.Conflict);
        }

        return await LoadResultAsync(emergencyRequestId);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    public IQueryable<EmergencyRequest> RequestsWithDetails()
    {
        return _context.EmergencyRequests
            .Include(request => request.CarLicencePlateNavigation)
                .ThenInclude(car => car.Customer)
            .Include(request => request.Driver)
                .ThenInclude(driver => driver!.Branch)
            .Include(request => request.Truck);
    }

    public static IQueryable<EmergencyRequest> ApplyFilters(
        IQueryable<EmergencyRequest> requests,
        EmergencyRequestListQueryDto query)
    {
        if (query.Status.HasValue)
        {
            var status = query.Status.Value;
            requests = requests.Where(request => request.StatusEmergency == status);
        }

        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            requests = requests.Where(request => request.EmergenctTime >= from);
        }

        if (query.ToDate.HasValue)
        {
            var toExclusive = query.ToDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            requests = requests.Where(request => request.EmergenctTime < toExclusive);
        }

        return requests;
    }

    private Task<bool> HasActiveRequestAsync(int driverId, int exceptRequestId)
    {
        var activeStatuses = EmergencyStatusHelper.ActiveStatuses;
        return _context.EmergencyRequests.AnyAsync(request =>
            request.DriverId == driverId &&
            request.EmergencyRequestId != exceptRequestId &&
            activeStatuses.Contains(request.StatusEmergency));
    }

    private static void ReleaseDriverAndTruck(EmergencyRequest request)
    {
        if (request.Driver is not null)
        {
            request.Driver.IsAvailable = true;
        }

        if (request.Truck is not null)
        {
            request.Truck.IsAvailable = true;
        }
    }

    private async Task<bool> TrySaveAsync()
    {
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    private async Task<EmergencyResult> LoadResultAsync(int emergencyRequestId)
    {
        var request = await RequestsWithDetails()
            .AsNoTracking()
            .SingleAsync(item => item.EmergencyRequestId == emergencyRequestId);

        return new EmergencyResult(EmergencyResultStatus.Success, ToViewModel(request));
    }

    private static EmergencyCarViewModel ToCarViewModel(Car car)
    {
        return new EmergencyCarViewModel
        {
            LicencePlate = car.LicencesPlate,
            CarCompany = car.CarCompany,
            Model = car.Model,
            Color = car.Color
        };
    }

    private static EmergencyDriverViewModel? ToDriverSummary(Driver? driver)
    {
        return driver is null
            ? null
            : new EmergencyDriverViewModel { DriverId = driver.DriverId, FullName = driver.FullName };
    }

    private static EmergencyTruckSummaryViewModel? ToTruckSummary(EmergencyTruck? truck)
    {
        return truck is null
            ? null
            : new EmergencyTruckSummaryViewModel
            {
                LicencePlate = truck.LicencePlate,
                TruckCompany = truck.TruckCompany,
                TruckModel = truck.TruckModel
            };
    }

    public static EmergencyRequestViewModel ToViewModel(EmergencyRequest request)
    {
        GeoHelper.TryParse(request.Latitude, request.Longitude, out var latitude, out var longitude);

        // Live driver location is protected: only while the driver is heading to / at the customer.
        LocationViewModel? driverLocation = null;
        int? etaMinutes = null;
        var isLive = request.StatusEmergency is StatusEmergency.assigned or
            StatusEmergency.confirmed or
            StatusEmergency.onTheWay or
            StatusEmergency.arrived;

        if (isLive &&
            request.Driver is not null &&
            GeoHelper.TryParse(request.Driver.Latitude, request.Driver.Longitude,
                out var driverLatitude, out var driverLongitude))
        {
            driverLocation = new LocationViewModel
            {
                Latitude = driverLatitude,
                Longitude = driverLongitude
            };

            etaMinutes = request.StatusEmergency == StatusEmergency.arrived
                ? 0
                : GeoHelper.EstimateEtaMinutes(
                    GeoHelper.DistanceKm(driverLatitude, driverLongitude, latitude, longitude));
        }

        return new EmergencyRequestViewModel
        {
            EmergencyRequestId = request.EmergencyRequestId,
            RequestedAt = request.EmergenctTime,
            CarLicencePlate = request.CarLicencePlate,
            ProblemType = request.ProblemType,
            Description = request.Description,
            Latitude = latitude,
            Longitude = longitude,
            Status = request.StatusEmergency.ToApiName(),
            UpdatedAt = request.UpdatedAt,
            Car = ToCarViewModel(request.CarLicencePlateNavigation),
            Driver = ToDriverSummary(request.Driver),
            Truck = ToTruckSummary(request.Truck),
            DriverLocation = driverLocation,
            EtaMinutes = etaMinutes,
            CancelledAt = request.CancelledAt,
            CancellationReason = request.CancellationReason
        };
    }

    private static DriverEmergencyRequestViewModel ToDriverViewModel(EmergencyRequest request, string userId)
    {
        GeoHelper.TryParse(request.Latitude, request.Longitude, out var latitude, out var longitude);

        var assignedToMe = request.Driver is not null && request.Driver.UserId == userId;
        var customer = request.CarLicencePlateNavigation.Customer;

        return new DriverEmergencyRequestViewModel
        {
            EmergencyRequestId = request.EmergencyRequestId,
            RequestedAt = request.EmergenctTime,
            Status = request.StatusEmergency.ToApiName(),
            ProblemType = request.ProblemType,
            Description = request.Description,
            Latitude = latitude,
            Longitude = longitude,
            AssignedToMe = assignedToMe,
            Customer = new DriverEmergencyCustomerViewModel
            {
                FullName = customer.FullName,
                // Contact details are only shared with the driver who owns the job.
                Phone = assignedToMe ? customer.Phone : null
            },
            Car = ToCarViewModel(request.CarLicencePlateNavigation),
            Driver = ToDriverSummary(request.Driver),
            Truck = ToTruckSummary(request.Truck),
            Branch = request.Driver?.Branch is null
                ? null
                : new DriverEmergencyBranchViewModel
                {
                    BranchId = request.Driver.Branch.BranchId,
                    BranchName = request.Driver.Branch.BranchName
                },
            UpdatedAt = request.UpdatedAt
        };
    }
}

public enum EmergencyResultStatus
{
    Success,
    NotFound,
    Forbidden,
    CustomerNotFound,
    CarNotFound,
    InvalidProblemType,
    InvalidCoordinates,
    DuplicateActiveRequest,
    InvalidStatus,
    InvalidTransition,
    DriverNotFound,
    TruckNotFound,
    DriverUnavailable,
    TruckUnavailable,
    BranchMismatch,
    NotAssignable,
    AlreadyClosed,
    Conflict
}

public record EmergencyResult(
    EmergencyResultStatus Status,
    EmergencyRequestViewModel? Request = null);
