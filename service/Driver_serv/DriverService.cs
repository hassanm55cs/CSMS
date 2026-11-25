using CSMS.Data;
using CSMS.Dto.DriversDto;
using CSMS.Helper;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Driver_serv;

public class DriverService:IDriverService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public DriverService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<PagedViewModel<DriverViewModel>> GetDriversAsync(DriverListQueryDto query)
    {
        var drivers = _context.Drivers.AsNoTracking();

        if (query.BranchId.HasValue)
        {
            var branchId = query.BranchId.Value;
            drivers = drivers.Where(driver => driver.BranchId == branchId);
        }

        if (query.Available.HasValue)
        {
            drivers = query.Available.Value
                ? drivers.Where(driver => driver.IsAvailable == true)
                : drivers.Where(driver => driver.IsAvailable != true);
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
        var page = await drivers
            .OrderBy(driver => driver.FullName)
            .ThenBy(driver => driver.DriverId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return new PagedViewModel<DriverViewModel>
        {
            Data = page.Select(ToViewModel).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    //public async Task<DriverCreateResult> CreateDriverAsync(CreateDriverDto dto)
    //{
    //    if (dto.Latitude.HasValue != dto.Longitude.HasValue)
    //    {
    //        return new DriverCreateResult(DriverCreateStatus.InvalidCoordinates, null, Array.Empty<string>());
    //    }

    //    var branchId = dto.BranchId!.Value;
    //    if (!await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == branchId))
    //    {
    //        return new DriverCreateResult(DriverCreateStatus.BranchNotFound, null, Array.Empty<string>());
    //    }

    //    var email = dto.Email.Trim();
    //    var phone = dto.PhoneNumber.Trim();

    //    if (await _userManager.FindByEmailAsync(email) is not null ||
    //        await _context.Drivers.AnyAsync(item => item.Email == email || item.PhoneNumber == phone))
    //    {
    //        return new DriverCreateResult(DriverCreateStatus.AlreadyExists, null, Array.Empty<string>());
    //    }

    //    var user = new ApplicationUser
    //    {
    //        UserName = email,
    //        Email = email,
    //        PhoneNumber = phone
    //    };

    //    var createResult = await _userManager.CreateAsync(user, dto.Password);
    //    if (!createResult.Succeeded)
    //    {
    //        return new DriverCreateResult(
    //            DriverCreateStatus.IdentityFailed,
    //            null,
    //            createResult.Errors.Select(error => error.Description).ToArray());
    //    }

    //    var roleResult = await _userManager.AddToRoleAsync(user, "driver");
    //    if (!roleResult.Succeeded)
    //    {
    //        await _userManager.DeleteAsync(user);
    //        return new DriverCreateResult(
    //            DriverCreateStatus.IdentityFailed,
    //            null,
    //            roleResult.Errors.Select(error => error.Description).ToArray());
    //    }

    //    var driver = new Driver
    //    {
    //        FullName = dto.FullName.Trim(),
    //        PhoneNumber = phone,
    //        Email = email,
    //        StartWorkDate = dto.StartWorkDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
    //        Salary = dto.Salary!.Value,
    //        BranchId = branchId,
    //        IsAvailable = true,
    //        Latitude = dto.Latitude.HasValue ? GeoHelper.Format(dto.Latitude.Value) : null,
    //        Longitude = dto.Longitude.HasValue ? GeoHelper.Format(dto.Longitude.Value) : null,
    //        UserId = user.Id
    //    };

    //    try
    //    {
    //        _context.Drivers.Add(driver);
    //        await _context.SaveChangesAsync();
    //    }
    //    catch (DbUpdateException)
    //    {
    //        // Do not leave a login without a driver profile behind.
    //        await _userManager.DeleteAsync(user);
    //        return new DriverCreateResult(DriverCreateStatus.AlreadyExists, null, Array.Empty<string>());
    //    }

    //    return new DriverCreateResult(DriverCreateStatus.Created, ToViewModel(driver), Array.Empty<string>());
    //}

    public async Task<DriverLocationResult> UpdateLocationAsync(string userId, UpdateDriverLocationDto dto)
    {
        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (driver is null)
        {
            return new DriverLocationResult(DriverLocationStatus.NotFound, null);
        }

        // A driver on a job cannot mark themselves free; completing/cancelling the job does that.
        if (dto.IsAvailable == true)
        {
            var activeStatuses = EmergencyStatusHelper.ActiveStatuses;
            var hasActiveRequest = await _context.EmergencyRequests.AnyAsync(request =>
                request.DriverId == driver.DriverId &&
                activeStatuses.Contains(request.StatusEmergency));
            if (hasActiveRequest)
            {
                return new DriverLocationResult(DriverLocationStatus.HasActiveRequest, null);
            }
        }

        driver.Latitude = GeoHelper.Format(dto.Latitude!.Value);
        driver.Longitude = GeoHelper.Format(dto.Longitude!.Value);
        if (dto.IsAvailable.HasValue)
        {
            driver.IsAvailable = dto.IsAvailable.Value;
        }

        await _context.SaveChangesAsync();

        return new DriverLocationResult(
            DriverLocationStatus.Updated,
            new DriverLocationViewModel
            {
                DriverId = driver.DriverId,
                Latitude = dto.Latitude.Value,
                Longitude = dto.Longitude.Value,
                IsAvailable = driver.IsAvailable == true
            });
    }

    // The driver is looked up by email; the phone is updated on the driver profile and on the login.
    public async Task<DriverPhoneResult> UpdatePhoneByEmailAsync(UpdateDriverPhoneDto dto)
    {
        var email = dto.Email.Trim();
        var phone = dto.PhoneNumber.Trim();

        var driver = await _context.Drivers.SingleOrDefaultAsync(item => item.Email == email);
        if (driver is null)
        {
            return new DriverPhoneResult(DriverPhoneStatus.NotFound, null, Array.Empty<string>());
        }

        if (driver.PhoneNumber == phone)
        {
            return new DriverPhoneResult(DriverPhoneStatus.Updated, ToViewModel(driver), Array.Empty<string>());
        }

        var phoneInUse = await _context.Drivers.AnyAsync(item =>
            item.DriverId != driver.DriverId && item.PhoneNumber == phone);
        if (phoneInUse)
        {
            return new DriverPhoneResult(DriverPhoneStatus.PhoneAlreadyUsed, null, Array.Empty<string>());
        }

        var oldPhone = driver.PhoneNumber;
        driver.PhoneNumber = phone;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return new DriverPhoneResult(DriverPhoneStatus.PhoneAlreadyUsed, null, Array.Empty<string>());
        }

        if (driver.UserId is not null)
        {
            var user = await _userManager.FindByIdAsync(driver.UserId);
            if (user is not null)
            {
                var identityResult = await _userManager.SetPhoneNumberAsync(user, phone);
                if (!identityResult.Succeeded)
                {
                    // Keep the profile and the login in sync.
                    driver.PhoneNumber = oldPhone;
                    await _context.SaveChangesAsync();
                    return new DriverPhoneResult(
                        DriverPhoneStatus.IdentityFailed,
                        null,
                        identityResult.Errors.Select(error => error.Description).ToArray());
                }
            }
        }

        return new DriverPhoneResult(DriverPhoneStatus.Updated, ToViewModel(driver), Array.Empty<string>());
    }

    private static DriverViewModel ToViewModel(Driver driver)
    {
        double? latitude = null;
        double? longitude = null;
        if (GeoHelper.TryParse(driver.Latitude, driver.Longitude, out var parsedLatitude, out var parsedLongitude))
        {
            latitude = parsedLatitude;
            longitude = parsedLongitude;
        }

        // The password and the identity user id are never part of the response.
        return new DriverViewModel
        {
            DriverId = driver.DriverId,
            FullName = driver.FullName,
            PhoneNumber = driver.PhoneNumber,
            Email = driver.Email,
            StartWorkDate = driver.StartWorkDate,
            Salary = driver.Salary,
            IsAvailable = driver.IsAvailable == true,
            BranchId = driver.BranchId,
            Latitude = latitude,
            Longitude = longitude
        };
    }
}

public enum DriverCreateStatus
{
    Created,
    BranchNotFound,
    AlreadyExists,
    InvalidCoordinates,
    IdentityFailed
}

public record DriverCreateResult(DriverCreateStatus Status, DriverViewModel? Driver, string[] Errors);

public enum DriverLocationStatus
{
    Updated,
    NotFound,
    HasActiveRequest
}

public record DriverLocationResult(DriverLocationStatus Status, DriverLocationViewModel? Location);

public enum DriverPhoneStatus
{
    Updated,
    NotFound,
    PhoneAlreadyUsed,
    IdentityFailed
}

public record DriverPhoneResult(DriverPhoneStatus Status, DriverViewModel? Driver, string[] Errors);
