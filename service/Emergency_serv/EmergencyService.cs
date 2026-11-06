using System.Globalization;
using System.Data;
using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Emergency_serv;

public class EmergencyService
{
    private static readonly StatusEmergency[] ActiveStatuses =
    [
        StatusEmergency.requested,
        StatusEmergency.confirmed,
        StatusEmergency.assigned,
        StatusEmergency.onTheWay,
        StatusEmergency.arrived,
        StatusEmergency.tobranch,
        StatusEmergency.arrivedToBranch
    ];

    private static readonly IReadOnlyList<EmergencyProblemTypeViewModel> ProblemTypes =
    [
        new()
        {
            Id = EmergencyProblemType.Breakdown,
            Label = "Vehicle breakdown",
            LabelAr = "عطل بالمركبة",
            Description = "The vehicle cannot continue because of a mechanical problem."
        },
        new()
        {
            Id = EmergencyProblemType.FlatTire,
            Label = "Flat tire",
            LabelAr = "إطار مثقوب",
            Description = "A flat or damaged vehicle tire."
        },
        new()
        {
            Id = EmergencyProblemType.BatteryFailure,
            Label = "Battery failure",
            LabelAr = "عطل بالبطارية",
            Description = "The vehicle battery is discharged or has failed."
        },
        new()
        {
            Id = EmergencyProblemType.FuelDelivery,
            Label = "Fuel delivery",
            LabelAr = "توصيل وقود",
            Description = "The vehicle needs a fuel delivery."
        },
        new()
        {
            Id = EmergencyProblemType.Accident,
            Label = "Accident",
            LabelAr = "حادث",
            Description = "The vehicle has been involved in an accident."
        },
        new()
        {
            Id = EmergencyProblemType.Other,
            Label = "Other",
            LabelAr = "أخرى",
            Description = "Another roadside assistance problem."
        }
    ];

    private readonly ApplicationDbContext _context;

    public EmergencyService(ApplicationDbContext context)
    {
        _context = context;
    }

    public IReadOnlyList<EmergencyProblemTypeViewModel> GetProblemTypes()
    {
        return ProblemTypes;
    }

    public async Task<EmergencyOperationResult> CreateRequestAsync(
        string userId,
        CreateEmergencyRequestDto dto)
    {
        var customer = await _context.Customers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.CustomerNotFound, null);
        }

        var car = await _context.Cars
            .SingleOrDefaultAsync(item =>
                item.LicencesPlate == dto.CarLicencePlate &&
                item.CustomerId == customer.CustomerId);
        if (car is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.CarNotFound, null);
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var alreadyActive = await _context.EmergencyRequests.AnyAsync(request =>
            request.CarLicencePlate == dto.CarLicencePlate &&
            ActiveStatuses.Contains(request.StatusEmergency));
        if (alreadyActive)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.ActiveRequestExists, null);
        }

        var now = DateTime.UtcNow;
        var request = new EmergencyRequest
        {
            EmergenctTime = now,
            UpdatedAt = now,
            CarLicencePlate = car.LicencesPlate,
            Latitude = FormatCoordinate(dto.Latitude!.Value),
            Longitude = FormatCoordinate(dto.Longitude!.Value),
            ProblemType = dto.ProblemType!.Value.ToString(),
            Description = dto.Description?.Trim(),
            StatusEmergency = StatusEmergency.requested
        };

        _context.EmergencyRequests.Add(request);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new EmergencyOperationResult(
            EmergencyOperationStatus.Created,
            await GetEmergencyRequestAsync(request.EmergencyRequestId, userId, false, false));
    }

    public async Task<PagedViewModel<EmergencyRequestViewModel>> GetCustomerRequestsAsync(
        string userId,
        EmergencyRequestListQueryDto query)
    {
        var requests = _context.EmergencyRequests
            .AsNoTracking()
            .Where(item => item.CarLicencePlateNavigation.Customer.UserId == userId);

        if (query.Status.HasValue)
        {
            requests = requests.Where(item => item.StatusEmergency == query.Status);
        }

        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            requests = requests.Where(item => item.EmergenctTime >= from);
        }

        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.ToDateTime(TimeOnly.MaxValue);
            requests = requests.Where(item => item.EmergenctTime <= to);
        }

        var totalCount = await requests.CountAsync();
        var records = await requests
            .OrderByDescending(item => item.EmergenctTime)
            .ThenByDescending(item => item.EmergencyRequestId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(item => new EmergencyRequestRecord
            {
                EmergencyRequestId = item.EmergencyRequestId,
                RequestedAt = item.EmergenctTime,
                UpdatedAt = item.UpdatedAt,
                CarLicencePlate = item.CarLicencePlate,
                CarCompany = item.CarLicencePlateNavigation.CarCompany,
                CarModel = item.CarLicencePlateNavigation.Model,
                ProblemType = item.ProblemType,
                Description = item.Description,
                Latitude = item.Latitude,
                Longitude = item.Longitude,
                Status = item.StatusEmergency,
                DriverId = item.DriverId,
                DriverName = item.Driver == null ? null : item.Driver.FullName,
                DriverLatitude = item.Driver == null ? null : item.Driver.Latitude,
                DriverLongitude = item.Driver == null ? null : item.Driver.Longitude,
                TruckLicencePlate = item.EmergencyTruckLicencePlate,
                TruckCompany = item.EmergencyTruck == null ? null : item.EmergencyTruck.TruckCompany,
                TruckModel = item.EmergencyTruck == null ? null : item.EmergencyTruck.TruckModel,
                BranchName = item.EmergencyTruck == null ? null : item.EmergencyTruck.Branch.BranchName,
                CustomerName = item.CarLicencePlateNavigation.Customer.FullName,
                CustomerPhone = item.CarLicencePlateNavigation.Customer.Phone,
                CancellationReason = item.CancellationReason
            })
            .ToListAsync();

        return new PagedViewModel<EmergencyRequestViewModel>
        {
            Data = records.Select(ToViewModel).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<EmergencyRequestViewModel?> GetEmergencyRequestAsync(
        int emergencyRequestId,
        string userId,
        bool isAdmin,
        bool assignedDriverOnly)
    {
        var request = await _context.EmergencyRequests
            .AsNoTracking()
            .Include(item => item.CarLicencePlateNavigation)
                .ThenInclude(car => car.Customer)
            .Include(item => item.Driver)
            .Include(item => item.EmergencyTruck)
                .ThenInclude(truck => truck!.Branch)
            .Where(item =>
                item.EmergencyRequestId == emergencyRequestId &&
                (isAdmin ||
                 (assignedDriverOnly
                     ? item.Driver != null && item.Driver.UserId == userId
                     : item.CarLicencePlateNavigation.Customer.UserId == userId ||
                       item.Driver != null && item.Driver.UserId == userId)))
            .SingleOrDefaultAsync();

        return request is null ? null : ToViewModel(request);
    }

    public async Task<PagedViewModel<EmergencyRequestViewModel>> GetDriverRequestsAsync(
        string userId,
        EmergencyRequestListQueryDto query,
        bool assignedOnly)
    {
        var driver = await _context.Drivers
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .Select(item => new { item.DriverId, item.BranchId })
            .SingleOrDefaultAsync();
        if (driver is null ||
            query.BranchId.HasValue && query.BranchId.Value != driver.BranchId)
        {
            return new PagedViewModel<EmergencyRequestViewModel>
            {
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        var requests = _context.EmergencyRequests.AsNoTracking();
        if (assignedOnly || query.Assigned == true)
        {
            requests = requests.Where(item => item.DriverId == driver.DriverId);
        }
        else if (query.Assigned == false)
        {
            requests = requests.Where(item => item.DriverId == null);
        }
        else
        {
            requests = requests.Where(
                item => item.DriverId == null || item.DriverId == driver.DriverId);
        }

        if (query.Status.HasValue)
        {
            requests = requests.Where(item => item.StatusEmergency == query.Status);
        }

        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            requests = requests.Where(item => item.EmergenctTime >= from);
        }

        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.ToDateTime(TimeOnly.MaxValue);
            requests = requests.Where(item => item.EmergenctTime <= to);
        }

        var totalCount = await requests.CountAsync();
        var records = await requests
            .OrderByDescending(item => item.EmergenctTime)
            .ThenByDescending(item => item.EmergencyRequestId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(item => new EmergencyRequestRecord
            {
                EmergencyRequestId = item.EmergencyRequestId,
                RequestedAt = item.EmergenctTime,
                UpdatedAt = item.UpdatedAt,
                CarLicencePlate = item.CarLicencePlate,
                CarCompany = item.CarLicencePlateNavigation.CarCompany,
                CarModel = item.CarLicencePlateNavigation.Model,
                ProblemType = item.ProblemType,
                Description = item.Description,
                Latitude = item.Latitude,
                Longitude = item.Longitude,
                Status = item.StatusEmergency,
                DriverId = item.DriverId,
                DriverName = item.Driver == null ? null : item.Driver.FullName,
                DriverLatitude = item.Driver == null ? null : item.Driver.Latitude,
                DriverLongitude = item.Driver == null ? null : item.Driver.Longitude,
                TruckLicencePlate = item.EmergencyTruckLicencePlate,
                TruckCompany = item.EmergencyTruck == null ? null : item.EmergencyTruck.TruckCompany,
                TruckModel = item.EmergencyTruck == null ? null : item.EmergencyTruck.TruckModel,
                BranchName = item.EmergencyTruck == null ? null : item.EmergencyTruck.Branch.BranchName,
                CustomerName = item.CarLicencePlateNavigation.Customer.FullName,
                CustomerPhone = item.CarLicencePlateNavigation.Customer.Phone,
                CancellationReason = item.CancellationReason
            })
            .ToListAsync();

        var data = records.Select(ToViewModel).ToList();
        foreach (var item in data.Where(item => item.DriverId != driver.DriverId))
        {
            item.CustomerName = null;
            item.CustomerPhone = null;
            item.Latitude = null;
            item.Longitude = null;
        }

        return new PagedViewModel<EmergencyRequestViewModel>
        {
            Data = data,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<EmergencyOperationResult> AssignRequestAsync(
        int requestId,
        AssignEmergencyRequestDto dto)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await _context.EmergencyRequests
            .SingleOrDefaultAsync(item => item.EmergencyRequestId == requestId);
        if (request is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.NotFound, null);
        }

        if (request.StatusEmergency != StatusEmergency.requested)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.InvalidStatus, null);
        }

        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.DriverId == dto.DriverId);
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == dto.TruckLicencePlate);
        if (driver is null || truck is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.AssigneeNotFound, null);
        }

        if (driver.IsAvailable != true || !truck.IsAvailable)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.AssigneeUnavailable, null);
        }

        if (driver.BranchId != truck.BranchId)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.BranchMismatch, null);
        }

        if (await HasActiveAssignmentAsync(driver.DriverId) ||
            await HasActiveTruckAssignmentAsync(truck.LicencePlate))
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.AssigneeUnavailable, null);
        }

        request.DriverId = driver.DriverId;
        request.EmergencyTruckLicencePlate = truck.LicencePlate;
        request.StatusEmergency = StatusEmergency.assigned;
        request.UpdatedAt = DateTime.UtcNow;
        driver.IsAvailable = false;
        truck.DriverId = driver.DriverId;
        truck.IsAvailable = false;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new EmergencyOperationResult(
            EmergencyOperationStatus.Updated,
            await GetEmergencyRequestAsync(requestId, string.Empty, true, false));
    }

    public async Task<EmergencyOperationResult> AcceptRequestAsync(
        int requestId,
        string userId,
        string truckLicencePlate)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (driver is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.DriverNotFound, null);
        }

        var request = await _context.EmergencyRequests
            .SingleOrDefaultAsync(item => item.EmergencyRequestId == requestId);
        if (request is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.NotFound, null);
        }

        if (request.StatusEmergency != StatusEmergency.requested)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.InvalidStatus, null);
        }

        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item =>
                item.LicencePlate == truckLicencePlate &&
                item.DriverId == driver.DriverId);
        if (truck is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.AssigneeNotFound, null);
        }

        if (driver.IsAvailable != true || !truck.IsAvailable)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.AssigneeUnavailable, null);
        }

        if (driver.BranchId != truck.BranchId)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.BranchMismatch, null);
        }

        if (await HasActiveAssignmentAsync(driver.DriverId) ||
            await HasActiveTruckAssignmentAsync(truck.LicencePlate))
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.AssigneeUnavailable, null);
        }

        request.DriverId = driver.DriverId;
        request.EmergencyTruckLicencePlate = truck.LicencePlate;
        request.StatusEmergency = StatusEmergency.assigned;
        request.UpdatedAt = DateTime.UtcNow;
        driver.IsAvailable = false;
        truck.IsAvailable = false;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new EmergencyOperationResult(
            EmergencyOperationStatus.Updated,
            await GetEmergencyRequestAsync(requestId, userId, false, true));
    }

    public async Task<EmergencyOperationResult> UpdateStatusAsync(
        int requestId,
        string userId,
        bool isAdmin,
        UpdateEmergencyRequestStatusDto dto)
    {
        if (dto.Latitude.HasValue != dto.Longitude.HasValue)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.InvalidCoordinates, null);
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await _context.EmergencyRequests
            .Include(item => item.Driver)
            .Include(item => item.EmergencyTruck)
                .ThenInclude(truck => truck!.Branch)
            .SingleOrDefaultAsync(item =>
                item.EmergencyRequestId == requestId &&
                (isAdmin || item.Driver != null && item.Driver.UserId == userId));
        if (request is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.NotFound, null);
        }

        if (!IsValidTransition(request.StatusEmergency, dto.Status!.Value))
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.InvalidStatus, null);
        }

        if (dto.Latitude.HasValue)
        {
            request.Latitude = FormatCoordinate(dto.Latitude.Value);
            request.Longitude = FormatCoordinate(dto.Longitude!.Value);
            if (request.Driver is not null)
            {
                request.Driver.Latitude = request.Latitude;
                request.Driver.Longitude = request.Longitude;
            }
        }

        request.StatusEmergency = dto.Status!.Value;
        request.UpdatedAt = DateTime.UtcNow;
        if (dto.Status == StatusEmergency.completed)
        {
            ReleaseAssignment(request);
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return new EmergencyOperationResult(
            EmergencyOperationStatus.Updated,
            await GetEmergencyRequestAsync(requestId, userId, isAdmin, false));
    }

    public async Task<EmergencyOperationResult> CancelRequestAsync(
        int requestId,
        string userId,
        bool isAdmin,
        string? reason)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var request = await _context.EmergencyRequests
            .Include(item => item.CarLicencePlateNavigation)
                .ThenInclude(car => car.Customer)
            .Include(item => item.Driver)
            .Include(item => item.EmergencyTruck)
                .ThenInclude(truck => truck!.Branch)
            .SingleOrDefaultAsync(item =>
                item.EmergencyRequestId == requestId &&
                (isAdmin ||
                 item.CarLicencePlateNavigation.Customer.UserId == userId ||
                 item.Driver != null && item.Driver.UserId == userId));
        if (request is null)
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.NotFound, null);
        }

        if (!ActiveStatuses.Contains(request.StatusEmergency))
        {
            return new EmergencyOperationResult(EmergencyOperationStatus.InvalidStatus, null);
        }

        request.StatusEmergency = StatusEmergency.cancelled;
        request.CancellationReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        request.UpdatedAt = DateTime.UtcNow;
        ReleaseAssignment(request);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new EmergencyOperationResult(
            EmergencyOperationStatus.Updated,
            ToViewModel(request));
    }

    public async Task<bool> IsValidDriverLocationUpdateAsync(int driverId, bool isAvailable)
    {
        if (isAvailable)
        {
            return !await HasActiveAssignmentAsync(driverId);
        }

        return true;
    }

    public static bool IsValidDateRange(DateOnly? fromDate, DateOnly? toDate)
    {
        return !fromDate.HasValue || !toDate.HasValue || toDate.Value >= fromDate.Value;
    }

    private async Task<bool> HasActiveAssignmentAsync(int driverId)
    {
        return await _context.EmergencyRequests.AnyAsync(item =>
            item.DriverId == driverId && ActiveStatuses.Contains(item.StatusEmergency));
    }

    private async Task<bool> HasActiveTruckAssignmentAsync(string licencePlate)
    {
        return await _context.EmergencyRequests.AnyAsync(item =>
            item.EmergencyTruckLicencePlate == licencePlate &&
            ActiveStatuses.Contains(item.StatusEmergency));
    }

    private static bool IsValidTransition(StatusEmergency current, StatusEmergency next)
    {
        return (current == StatusEmergency.assigned && next == StatusEmergency.onTheWay) ||
            (current == StatusEmergency.onTheWay && next == StatusEmergency.arrived) ||
            (current == StatusEmergency.arrived && next == StatusEmergency.completed);
    }

    private static void ReleaseAssignment(EmergencyRequest request)
    {
        if (request.Driver is not null)
        {
            request.Driver.IsAvailable = true;
        }

        if (request.EmergencyTruck is not null)
        {
            request.EmergencyTruck.IsAvailable = true;
        }
    }

    private static string FormatCoordinate(decimal value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }

    private static decimal? ParseCoordinate(string? value)
    {
        return decimal.TryParse(
            value,
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out var coordinate)
            ? coordinate
            : null;
    }

    private static EmergencyRequestViewModel ToViewModel(EmergencyRequest request)
    {
        return new EmergencyRequestViewModel
        {
            EmergencyRequestId = request.EmergencyRequestId,
            RequestedAt = request.EmergenctTime,
            UpdatedAt = request.UpdatedAt,
            CarLicencePlate = request.CarLicencePlate,
            CarCompany = request.CarLicencePlateNavigation?.CarCompany,
            CarModel = request.CarLicencePlateNavigation?.Model,
            ProblemType = request.ProblemType,
            Description = request.Description,
            Latitude = ParseCoordinate(request.Latitude),
            Longitude = ParseCoordinate(request.Longitude),
            Status = request.StatusEmergency,
            DriverId = request.DriverId,
            DriverName = request.Driver?.FullName,
            DriverLatitude = ParseCoordinate(request.Driver?.Latitude),
            DriverLongitude = ParseCoordinate(request.Driver?.Longitude),
            TruckLicencePlate = request.EmergencyTruckLicencePlate,
            TruckCompany = request.EmergencyTruck?.TruckCompany,
            TruckModel = request.EmergencyTruck?.TruckModel,
            BranchName = request.EmergencyTruck?.Branch?.BranchName,
            CustomerName = request.CarLicencePlateNavigation?.Customer?.FullName,
            CustomerPhone = request.CarLicencePlateNavigation?.Customer?.Phone,
            CancellationReason = request.CancellationReason
        };
    }

    private static EmergencyRequestViewModel ToViewModel(EmergencyRequestRecord request)
    {
        return new EmergencyRequestViewModel
        {
            EmergencyRequestId = request.EmergencyRequestId,
            RequestedAt = request.RequestedAt,
            UpdatedAt = request.UpdatedAt,
            CarLicencePlate = request.CarLicencePlate,
            CarCompany = request.CarCompany,
            CarModel = request.CarModel,
            ProblemType = request.ProblemType,
            Description = request.Description,
            Latitude = ParseCoordinate(request.Latitude),
            Longitude = ParseCoordinate(request.Longitude),
            Status = request.Status,
            DriverId = request.DriverId,
            DriverName = request.DriverName,
            DriverLatitude = ParseCoordinate(request.DriverLatitude),
            DriverLongitude = ParseCoordinate(request.DriverLongitude),
            TruckLicencePlate = request.TruckLicencePlate,
            TruckCompany = request.TruckCompany,
            TruckModel = request.TruckModel,
            BranchName = request.BranchName,
            CustomerName = request.CustomerName,
            CustomerPhone = request.CustomerPhone,
            CancellationReason = request.CancellationReason
        };
    }

    private sealed class EmergencyRequestRecord
    {
        public int EmergencyRequestId { get; set; }

        public DateTime RequestedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public string CarLicencePlate { get; set; } = null!;

        public string? CarCompany { get; set; }

        public string? CarModel { get; set; }

        public string ProblemType { get; set; } = null!;

        public string? Description { get; set; }

        public string Latitude { get; set; } = null!;

        public string Longitude { get; set; } = null!;

        public StatusEmergency Status { get; set; }

        public int? DriverId { get; set; }

        public string? DriverName { get; set; }

        public string? DriverLatitude { get; set; }

        public string? DriverLongitude { get; set; }

        public string? TruckLicencePlate { get; set; }

        public string? TruckCompany { get; set; }

        public string? TruckModel { get; set; }

        public string? BranchName { get; set; }

        public string? CustomerName { get; set; }

        public string? CustomerPhone { get; set; }

        public string? CancellationReason { get; set; }
    }
}

public enum EmergencyOperationStatus
{
    Created,
    Updated,
    NotFound,
    CustomerNotFound,
    CarNotFound,
    DriverNotFound,
    ActiveRequestExists,
    AssigneeNotFound,
    AssigneeUnavailable,
    BranchMismatch,
    InvalidCoordinates,
    InvalidStatus
}

public record EmergencyOperationResult(
    EmergencyOperationStatus Status,
    EmergencyRequestViewModel? Request);
