using CSMS.Data;
using CSMS.Dto.DriversDto;
using CSMS.Helper;
using CSMS.Hubs;
using CSMS.Models;
using CSMS.service.Emergency_serv;
using CSMS.ViewModel;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Driver_serv;

public class DriverService:IDriverService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHubContext<NotificationHub> _notificationHub;

    public DriverService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IHubContext<NotificationHub> notificationHub)
    {
        _context = context;
        _userManager = userManager;
        _notificationHub = notificationHub;
    }

    public async Task<DriverViewModel?> GetMeAsync(string userId)
    {
        var driver = await _context.Drivers
            .Include(d => d.Branch)
            .AsNoTracking()
            .SingleOrDefaultAsync(d => d.UserId == userId);

        if (driver is null) return null;

        var vm = ToViewModel(driver);
        vm.BranchName = driver.Branch?.BranchName;
        vm.BranchLatitude = driver.Branch?.Latitude;
        vm.BranchLongitude = driver.Branch?.Longitude;
        return vm;
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

        // Push live driver GPS to the customer if the driver is currently on an active SOS job.
        var liveStatuses = EmergencyStatusHelper.ActiveStatuses;
        var activeRequest = await _context.EmergencyRequests
            .AsNoTracking()
            .Include(r => r.CarLicencePlateNavigation)
                .ThenInclude(c => c.Customer)
            .Include(r => r.Branch)
            .Include(r => r.Driver)
                .ThenInclude(d => d!.Branch)
            .Include(r => r.Truck)
            .FirstOrDefaultAsync(r =>
                r.DriverId == driver.DriverId &&
                liveStatuses.Contains(r.StatusEmergency));

        if (activeRequest is not null &&
            !string.IsNullOrWhiteSpace(activeRequest.CarLicencePlateNavigation.Customer.UserId))
        {
            await _notificationHub.Clients
                .Group(NotificationHub.GroupName(activeRequest.CarLicencePlateNavigation.Customer.UserId))
                .SendAsync("EmergencyRequestUpdated", EmergencyService.ToViewModel(activeRequest));
        }

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

    public async Task<DriverAdminUpdateResult> UpdateAdminFieldsAsync(int driverId, UpdateDriverAdminDto dto)
    {
        var driver = await _context.Drivers.SingleOrDefaultAsync(item => item.DriverId == driverId);
        if (driver is null)
        {
            return new DriverAdminUpdateResult(DriverAdminUpdateStatus.NotFound, null, Array.Empty<string>());
        }

        var email = dto.Email.Trim();
        var phone = dto.PhoneNumber.Trim();
        if (await _context.Drivers.AnyAsync(item => item.DriverId != driverId && item.Email == email))
        {
            return new DriverAdminUpdateResult(DriverAdminUpdateStatus.EmailAlreadyUsed, null, Array.Empty<string>());
        }
        if (await _context.Drivers.AnyAsync(item => item.DriverId != driverId && item.PhoneNumber == phone))
        {
            return new DriverAdminUpdateResult(DriverAdminUpdateStatus.PhoneAlreadyUsed, null, Array.Empty<string>());
        }

        ApplicationUser? user = null;
        var oldEmail = driver.Email;
        var oldPhone = driver.PhoneNumber;
        var oldUserName = string.Empty;
        if (driver.UserId is not null)
        {
            user = await _userManager.FindByIdAsync(driver.UserId);
            if (user is not null)
            {
                var emailOwner = await _userManager.FindByEmailAsync(email);
                if (emailOwner is not null && emailOwner.Id != user.Id)
                {
                    return new DriverAdminUpdateResult(DriverAdminUpdateStatus.EmailAlreadyUsed, null, Array.Empty<string>());
                }

                oldUserName = user.UserName ?? oldEmail;
                var emailResult = await _userManager.SetEmailAsync(user, email);
                if (!emailResult.Succeeded)
                {
                    return new DriverAdminUpdateResult(DriverAdminUpdateStatus.IdentityFailed, null,
                        emailResult.Errors.Select(error => error.Description).ToArray());
                }
                var userNameResult = await _userManager.SetUserNameAsync(user, email);
                if (!userNameResult.Succeeded)
                {
                    await _userManager.SetEmailAsync(user, oldEmail);
                    return new DriverAdminUpdateResult(DriverAdminUpdateStatus.IdentityFailed, null,
                        userNameResult.Errors.Select(error => error.Description).ToArray());
                }
                var phoneResult = await _userManager.SetPhoneNumberAsync(user, phone);
                if (!phoneResult.Succeeded)
                {
                    await _userManager.SetUserNameAsync(user, oldUserName);
                    await _userManager.SetEmailAsync(user, oldEmail);
                    return new DriverAdminUpdateResult(DriverAdminUpdateStatus.IdentityFailed, null,
                        phoneResult.Errors.Select(error => error.Description).ToArray());
                }
            }
        }

        driver.Email = email;
        driver.PhoneNumber = phone;
        driver.Salary = dto.Salary;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            if (user is not null)
            {
                await _userManager.SetPhoneNumberAsync(user, oldPhone);
                await _userManager.SetUserNameAsync(user, oldUserName);
                await _userManager.SetEmailAsync(user, oldEmail);
            }
            return new DriverAdminUpdateResult(DriverAdminUpdateStatus.PhoneAlreadyUsed, null, Array.Empty<string>());
        }

        return new DriverAdminUpdateResult(DriverAdminUpdateStatus.Updated, ToViewModel(driver), Array.Empty<string>());
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

public enum DriverAdminUpdateStatus
{
    Updated,
    NotFound,
    EmailAlreadyUsed,
    PhoneAlreadyUsed,
    IdentityFailed
}

public record DriverAdminUpdateResult(DriverAdminUpdateStatus Status, DriverViewModel? Driver, string[] Errors);