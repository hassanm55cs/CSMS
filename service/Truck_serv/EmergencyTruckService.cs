using CSMS.Data;
using CSMS.Dto;
using CSMS.Helper;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Truck_serv;

public class EmergencyTruckService: IEmergencyTruckService
{
    private readonly ApplicationDbContext _context;

    public EmergencyTruckService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<EmergencyTruckViewModel>> GetTrucksAsync(EmergencyTruckQueryDto query)
    {
        var trucks = _context.EmergencyTrucks.AsNoTracking();

        if (query.BranchId.HasValue)
        {
            var branchId = query.BranchId.Value;
            trucks = trucks.Where(truck => truck.BranchId == branchId);
        }

        if (query.Available.HasValue)
        {
            var available = query.Available.Value;
            trucks = trucks.Where(truck => truck.IsAvailable == available);
        }

        var data = await trucks.OrderBy(truck => truck.LicencePlate).ToListAsync();
        return data.Select(ToViewModel).ToList();
    }

    public async Task<TruckCreateResult> CreateAsync(CreateEmergencyTruckDto dto)
    {
        if (!IsValidManufactureDate(dto.ManufactureDate))
        {
            return new TruckCreateResult(TruckCreateStatus.InvalidManufactureDate, null);
        }

        var branchId = dto.BranchId!.Value;
        if (!await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == branchId))
        {
            return new TruckCreateResult(TruckCreateStatus.BranchNotFound, null);
        }

        var driverId = dto.DriverId;
        if (driverId != null)
        {
            if (!await _context.Drivers.AnyAsync(driver => driver.DriverId == driverId))
            {
                return new TruckCreateResult(TruckCreateStatus.DriverNotFound, null);
            }
        }

        var licencePlate = dto.LicencePlate.Trim();
        if (await _context.EmergencyTrucks.AnyAsync(truck => truck.LicencePlate == licencePlate))
        {
            return new TruckCreateResult(TruckCreateStatus.LicencePlateAlreadyExists, null);
        }

        var truck = new EmergencyTruck
        {
            LicencePlate = licencePlate,
            TruckCompany = dto.TruckCompany.Trim(),
            TruckModel = dto.TruckModel.Trim(),
            IsAvailable = dto.IsAvailable ?? true,
            StartDate = dto.StartDate ?? DateTime.UtcNow,
            ManufactuareDate = dto.ManufactureDate!.Value,
            BranchId = branchId,
            DriverId = driverId
        };

        _context.EmergencyTrucks.Add(truck);
        await _context.SaveChangesAsync();

        return new TruckCreateResult(TruckCreateStatus.Created, ToViewModel(truck));
    }

    public async Task<TruckUpdateResult> UpdateAsync(string licencePlate, UpdateEmergencyTruckDto dto)
    {
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (truck is null)
        {
            return new TruckUpdateResult(TruckUpdateStatus.NotFound, null);
        }

        if (dto.ManufactureDate.HasValue && !IsValidManufactureDate(dto.ManufactureDate))
        {
            return new TruckUpdateResult(TruckUpdateStatus.InvalidManufactureDate, null);
        }

        if (dto.BranchId.HasValue &&
            !await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == dto.BranchId.Value))
        {
            return new TruckUpdateResult(TruckUpdateStatus.BranchNotFound, null);
        }

        if (dto.DriverId.HasValue &&
            !await _context.Drivers.AnyAsync(driver => driver.DriverId == dto.DriverId.Value))
        {
            return new TruckUpdateResult(TruckUpdateStatus.DriverNotFound, null);
        }

        // Marking a truck free while it is on a job would let it be double-booked.
        if (dto.IsAvailable == true)
        {
            var activeStatuses = EmergencyStatusHelper.ActiveStatuses;
            var inUse = await _context.EmergencyRequests.AnyAsync(request =>
                request.TruckLicencePlate == licencePlate &&
                activeStatuses.Contains(request.StatusEmergency));
            if (inUse)
            {
                return new TruckUpdateResult(TruckUpdateStatus.InUse, null);
            }
        }

        truck.TruckCompany = dto.TruckCompany?.Trim() ?? truck.TruckCompany;
        truck.TruckModel = dto.TruckModel?.Trim() ?? truck.TruckModel;
        truck.IsAvailable = dto.IsAvailable ?? truck.IsAvailable;
        truck.StartDate = dto.StartDate ?? truck.StartDate;
        truck.ManufactuareDate = dto.ManufactureDate ?? truck.ManufactuareDate;
        truck.BranchId = dto.BranchId ?? truck.BranchId;
        truck.DriverId = dto.DriverId ?? truck.DriverId;

        await _context.SaveChangesAsync();
        return new TruckUpdateResult(TruckUpdateStatus.Updated, ToViewModel(truck));
    }

    public async Task<TruckDeleteStatus> DeleteAsync(string licencePlate)
    {
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (truck is null)
        {
            return TruckDeleteStatus.NotFound;
        }

        // Past requests keep pointing at the truck, so a used truck cannot be deleted.
        var hasRequests = await _context.EmergencyRequests
            .AnyAsync(request => request.TruckLicencePlate == licencePlate);
        if (hasRequests)
        {
            return TruckDeleteStatus.HasRequests;
        }

        _context.EmergencyTrucks.Remove(truck);
        await _context.SaveChangesAsync();
        return TruckDeleteStatus.Deleted;
    }

    private static bool IsValidManufactureDate(DateOnly? date)
    {
        return date.HasValue &&
               date.Value != default &&
               date.Value <= DateOnly.FromDateTime(DateTime.UtcNow);
    }

    private static EmergencyTruckViewModel ToViewModel(EmergencyTruck truck)
    {
        return new EmergencyTruckViewModel
        {
            LicencePlate = truck.LicencePlate,
            TruckCompany = truck.TruckCompany,
            TruckModel = truck.TruckModel,
            IsAvailable = truck.IsAvailable,
            StartDate = truck.StartDate,
            ManufactureDate = truck.ManufactuareDate,
            BranchId = truck.BranchId,
            DriverId = truck.DriverId
        };
    }
}

public enum TruckCreateStatus
{
    Created,
    LicencePlateAlreadyExists,
    InvalidManufactureDate,
    BranchNotFound,
    DriverNotFound
}

public record TruckCreateResult(TruckCreateStatus Status, EmergencyTruckViewModel? Truck);

public enum TruckUpdateStatus
{
    Updated,
    NotFound,
    InvalidManufactureDate,
    BranchNotFound,
    DriverNotFound,
    InUse
}

public record TruckUpdateResult(TruckUpdateStatus Status, EmergencyTruckViewModel? Truck);

public enum TruckDeleteStatus
{
    Deleted,
    NotFound,
    HasRequests
}
