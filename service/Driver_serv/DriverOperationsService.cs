using System.Globalization;
using CSMS.Data;
using CSMS.Dto;
using CSMS.Models;
using CSMS.service.Emergency_serv;
using CSMS.service.Register;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Driver_serv;

public class DriverOperationsService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthService _authService;
    private readonly EmergencyService _emergencyService;

    public DriverOperationsService(
        ApplicationDbContext context,
        IAuthService authService,
        EmergencyService emergencyService)
    {
        _context = context;
        _authService = authService;
        _emergencyService = emergencyService;
    }

    public async Task<PagedViewModel<DriverViewModel>> GetDriversAsync(DriverListQueryDto query)
    {
        var drivers = _context.Drivers.AsNoTracking();
        if (query.BranchId.HasValue)
        {
            drivers = drivers.Where(driver => driver.BranchId == query.BranchId);
        }

        if (query.Available.HasValue)
        {
            drivers = drivers.Where(driver => driver.IsAvailable == query.Available);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            drivers = drivers.Where(driver =>
                driver.FullName.Contains(search) ||
                driver.Email.Contains(search) ||
                driver.PhoneNumber.Contains(search));
        }

        var totalCount = await drivers.CountAsync();
        var records = await drivers
            .OrderBy(driver => driver.FullName)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(driver => new DriverRecord
            {
                DriverId = driver.DriverId,
                FullName = driver.FullName,
                PhoneNumber = driver.PhoneNumber,
                Email = driver.Email,
                StartWorkDate = driver.StartWorkDate,
                Salary = driver.Salary,
                IsAvailable = driver.IsAvailable,
                Latitude = driver.Latitude,
                Longitude = driver.Longitude,
                BranchId = driver.BranchId,
                BranchName = driver.Branch.BranchName
            })
            .ToListAsync();

        return new PagedViewModel<DriverViewModel>
        {
            Data = records.Select(ToViewModel).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<DriverOperationResult> CreateDriverAsync(CreateDriverAccountDto dto)
    {
        if (dto.Latitude.HasValue != dto.Longitude.HasValue ||
            dto.StartWorkDate == default ||
            dto.StartWorkDate > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return new DriverOperationResult(
                DriverOperationStatus.InvalidInput,
                null,
                ["StartWorkDate and coordinates must be valid; provide both coordinates or neither."]);
        }

        if (!await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == dto.BranchId))
        {
            return new DriverOperationResult(
                DriverOperationStatus.BranchNotFound,
                null,
                Array.Empty<string>());
        }

        var registration = await _authService.AddDriver(new DriverDto
        {
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            Email = dto.Email,
            StartWorkDate = dto.StartWorkDate,
            Salary = dto.Salary,
            BranchId = dto.BranchId,
            Password = dto.Password,
            ConfirmPassword = dto.Password,
            Latitude = dto.Latitude?.ToString(CultureInfo.InvariantCulture),
            Longitude = dto.Longitude?.ToString(CultureInfo.InvariantCulture)
        });

        if (!registration.Success || !registration.DriverId.HasValue)
        {
            return new DriverOperationResult(
                DriverOperationStatus.RegistrationFailed,
                null,
                registration.Errors);
        }

        var driver = await _context.Drivers
            .AsNoTracking()
            .Where(item => item.DriverId == registration.DriverId.Value)
            .Select(item => new DriverRecord
            {
                DriverId = item.DriverId,
                FullName = item.FullName,
                PhoneNumber = item.PhoneNumber,
                Email = item.Email,
                StartWorkDate = item.StartWorkDate,
                Salary = item.Salary,
                IsAvailable = item.IsAvailable,
                Latitude = item.Latitude,
                Longitude = item.Longitude,
                BranchId = item.BranchId,
                BranchName = item.Branch.BranchName
            })
            .SingleAsync();

        return new DriverOperationResult(
            DriverOperationStatus.Created,
            ToViewModel(driver),
            Array.Empty<string>());
    }

    public async Task<DriverOperationResult> UpdateLocationAsync(
        string userId,
        UpdateDriverLocationDto dto)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable);
        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (driver is null)
        {
            return new DriverOperationResult(
                DriverOperationStatus.NotFound,
                null,
                Array.Empty<string>());
        }

        if (!await _emergencyService.IsValidDriverLocationUpdateAsync(
                driver.DriverId,
                dto.IsAvailable!.Value))
        {
            return new DriverOperationResult(
                DriverOperationStatus.DriverHasActiveRequest,
                null,
                Array.Empty<string>());
        }

        driver.Latitude = dto.Latitude!.Value.ToString(CultureInfo.InvariantCulture);
        driver.Longitude = dto.Longitude!.Value.ToString(CultureInfo.InvariantCulture);
        driver.IsAvailable = dto.IsAvailable;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new DriverOperationResult(
            DriverOperationStatus.Updated,
            new DriverViewModel
            {
                DriverId = driver.DriverId,
                FullName = driver.FullName,
                PhoneNumber = driver.PhoneNumber,
                Email = driver.Email,
                StartWorkDate = driver.StartWorkDate,
                Salary = driver.Salary,
                IsAvailable = driver.IsAvailable,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                BranchId = driver.BranchId,
                BranchName = await _context.ServiceBranches
                    .Where(branch => branch.BranchId == driver.BranchId)
                    .Select(branch => branch.BranchName)
                    .SingleAsync()
            },
            Array.Empty<string>());
    }

    private static DriverViewModel ToViewModel(DriverRecord driver)
    {
        return new DriverViewModel
        {
            DriverId = driver.DriverId,
            FullName = driver.FullName,
            PhoneNumber = driver.PhoneNumber,
            Email = driver.Email,
            StartWorkDate = driver.StartWorkDate,
            Salary = driver.Salary,
            IsAvailable = driver.IsAvailable,
            Latitude = ParseCoordinate(driver.Latitude),
            Longitude = ParseCoordinate(driver.Longitude),
            BranchId = driver.BranchId,
            BranchName = driver.BranchName
        };
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

    private sealed class DriverRecord
    {
        public int DriverId { get; set; }

        public string FullName { get; set; } = null!;

        public string PhoneNumber { get; set; } = null!;

        public string Email { get; set; } = null!;

        public DateOnly StartWorkDate { get; set; }

        public double Salary { get; set; }

        public bool? IsAvailable { get; set; }

        public string? Latitude { get; set; }

        public string? Longitude { get; set; }

        public int BranchId { get; set; }

        public string BranchName { get; set; } = null!;
    }
}

public enum DriverOperationStatus
{
    Created,
    Updated,
    NotFound,
    BranchNotFound,
    InvalidInput,
    RegistrationFailed,
    DriverHasActiveRequest
}

public record DriverOperationResult(
    DriverOperationStatus Status,
    DriverViewModel? Driver,
    string[] Errors);
