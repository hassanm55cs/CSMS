using CSMS.Data;
using CSMS.Dto;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CSMS.service.Fleet_serv;

public class EmergencyTruckService
{
    private readonly ApplicationDbContext _context;

    public EmergencyTruckService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<EmergencyTruckViewModel>> GetTrucksAsync(
        EmergencyTruckListQueryDto query)
    {
        var trucks = _context.EmergencyTrucks.AsNoTracking();
        if (query.BranchId.HasValue)
        {
            trucks = trucks.Where(truck => truck.BranchId == query.BranchId);
        }

        if (query.Available.HasValue)
        {
            trucks = trucks.Where(truck => truck.IsAvailable == query.Available);
        }

        return await trucks
            .OrderBy(truck => truck.LicencePlate)
            .Select(truck => new EmergencyTruckViewModel
            {
                LicencePlate = truck.LicencePlate,
                TruckCompany = truck.TruckCompany,
                TruckModel = truck.TruckModel,
                IsAvailable = truck.IsAvailable,
                StartDate = truck.StartDate,
                ManufactureDate = truck.ManufactuareDate,
                BranchId = truck.BranchId,
                BranchName = truck.Branch.BranchName,
                DriverId = truck.DriverId,
                DriverName = truck.Driver.FullName
            })
            .ToListAsync();
    }

    public Task<EmergencyTruckViewModel?> GetTruckAsync(string licencePlate)
    {
        return _context.EmergencyTrucks
            .AsNoTracking()
            .Where(truck => truck.LicencePlate == licencePlate)
            .Select(truck => new EmergencyTruckViewModel
            {
                LicencePlate = truck.LicencePlate,
                TruckCompany = truck.TruckCompany,
                TruckModel = truck.TruckModel,
                IsAvailable = truck.IsAvailable,
                StartDate = truck.StartDate,
                ManufactureDate = truck.ManufactuareDate,
                BranchId = truck.BranchId,
                BranchName = truck.Branch.BranchName,
                DriverId = truck.DriverId,
                DriverName = truck.Driver.FullName
            })
            .SingleOrDefaultAsync();
    }

    public async Task<EmergencyTruckOperationStatus> CreateTruckAsync(CreateEmergencyTruckDto dto)
    {
        if (dto.StartDate == default ||
            dto.ManufactureDate == default ||
            dto.ManufactureDate > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return EmergencyTruckOperationStatus.Invalid;
        }

        if (await _context.EmergencyTrucks.AnyAsync(
                truck => truck.LicencePlate == dto.LicencePlate))
        {
            return EmergencyTruckOperationStatus.AlreadyExists;
        }

        var branchExists = await _context.ServiceBranches
            .AnyAsync(branch => branch.BranchId == dto.BranchId);
        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.DriverId == dto.DriverId);
        if (!branchExists || driver is null)
        {
            return EmergencyTruckOperationStatus.RelatedEntityNotFound;
        }

        if (driver.BranchId != dto.BranchId)
        {
            return EmergencyTruckOperationStatus.BranchMismatch;
        }

        if (dto.IsAvailable && driver.IsAvailable != true)
        {
            return EmergencyTruckOperationStatus.DriverUnavailable;
        }

        _context.EmergencyTrucks.Add(new EmergencyTruck
        {
            LicencePlate = dto.LicencePlate,
            TruckCompany = dto.TruckCompany,
            TruckModel = dto.TruckModel,
            IsAvailable = dto.IsAvailable,
            StartDate = dto.StartDate,
            ManufactuareDate = dto.ManufactureDate,
            BranchId = dto.BranchId,
            DriverId = dto.DriverId
        });
        await _context.SaveChangesAsync();
        return EmergencyTruckOperationStatus.Updated;
    }

    public async Task<EmergencyTruckOperationStatus> UpdateTruckAsync(
        string licencePlate,
        UpdateEmergencyTruckDto dto)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (truck is null)
        {
            return EmergencyTruckOperationStatus.NotFound;
        }

        if (dto.TruckCompany is null &&
            dto.TruckModel is null &&
            dto.IsAvailable is null &&
            dto.StartDate is null &&
            dto.ManufactureDate is null &&
            dto.BranchId is null &&
            dto.DriverId is null)
        {
            return EmergencyTruckOperationStatus.EmptyUpdate;
        }

        if (dto.StartDate == default ||
            dto.ManufactureDate == default ||
            dto.ManufactureDate > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return EmergencyTruckOperationStatus.Invalid;
        }

        var branchId = dto.BranchId ?? truck.BranchId;
        var driverId = dto.DriverId ?? truck.DriverId;
        if (dto.BranchId.HasValue &&
            !await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == branchId))
        {
            return EmergencyTruckOperationStatus.RelatedEntityNotFound;
        }

        var driver = await _context.Drivers
            .SingleOrDefaultAsync(item => item.DriverId == driverId);
        if (driver is null)
        {
            return EmergencyTruckOperationStatus.RelatedEntityNotFound;
        }

        if (driver.BranchId != branchId)
        {
            return EmergencyTruckOperationStatus.BranchMismatch;
        }

        var truckWillBeAvailable = dto.IsAvailable ?? truck.IsAvailable;
        if (truckWillBeAvailable && driver.IsAvailable != true)
        {
            return EmergencyTruckOperationStatus.DriverUnavailable;
        }

        var hasActiveAssignment = await _context.EmergencyRequests.AnyAsync(request =>
            request.EmergencyTruckLicencePlate == licencePlate &&
            request.StatusEmergency != CSMS.Enums.StatusEmergency.completed &&
            request.StatusEmergency != CSMS.Enums.StatusEmergency.cancelled);
        if (hasActiveAssignment &&
            (dto.IsAvailable == true ||
             dto.BranchId.HasValue && dto.BranchId.Value != truck.BranchId ||
             dto.DriverId.HasValue && dto.DriverId.Value != truck.DriverId))
        {
            return EmergencyTruckOperationStatus.HasActiveAssignment;
        }

        truck.TruckCompany = dto.TruckCompany ?? truck.TruckCompany;
        truck.TruckModel = dto.TruckModel ?? truck.TruckModel;
        truck.IsAvailable = dto.IsAvailable ?? truck.IsAvailable;
        truck.StartDate = dto.StartDate ?? truck.StartDate;
        truck.ManufactuareDate = dto.ManufactureDate ?? truck.ManufactuareDate;
        truck.BranchId = branchId;
        truck.DriverId = driverId;

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return EmergencyTruckOperationStatus.Updated;
    }

    public async Task<EmergencyTruckOperationStatus> DeleteTruckAsync(string licencePlate)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var truck = await _context.EmergencyTrucks
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (truck is null)
        {
            return EmergencyTruckOperationStatus.NotFound;
        }

        if (await _context.EmergencyRequests.AnyAsync(
                request => request.EmergencyTruckLicencePlate == licencePlate))
        {
            return EmergencyTruckOperationStatus.HasHistory;
        }

        _context.EmergencyTrucks.Remove(truck);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return EmergencyTruckOperationStatus.Updated;
    }
}

public enum EmergencyTruckOperationStatus
{
    Updated,
    NotFound,
    AlreadyExists,
    RelatedEntityNotFound,
    DriverUnavailable,
    BranchMismatch,
    HasActiveAssignment,
    HasHistory,
    Invalid,
    EmptyUpdate
}
