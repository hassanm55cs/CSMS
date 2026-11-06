using System.Data;
using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Rental_serv;

public class RentalService
{
    private readonly ApplicationDbContext _context;

    public RentalService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedViewModel<RentalCarViewModel>> GetRentalCarsAsync(
        RentalCarListQueryDto query)
    {
        var (startDate, endDate) = GetAvailabilityDates(query.StartDate, query.EndDate);
        var cars = _context.CarsForRents.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Make))
        {
            var make = query.Make.Trim();
            cars = cars.Where(car => car.CarCompany.Contains(make));
        }

        if (!string.IsNullOrWhiteSpace(query.Model))
        {
            var model = query.Model.Trim();
            cars = cars.Where(car => car.Model.Contains(model));
        }

        if (query.FuelType.HasValue)
        {
            cars = cars.Where(car => car.FuelType == query.FuelType);
        }

        if (query.EngineType.HasValue)
        {
            cars = cars.Where(car => car.EngineType == query.EngineType);
        }

        if (query.MinPrice.HasValue)
        {
            cars = cars.Where(car => car.PricePerDay >= query.MinPrice);
        }

        if (query.MaxPrice.HasValue)
        {
            cars = cars.Where(car => car.PricePerDay <= query.MaxPrice);
        }

        if (query.Available.HasValue)
        {
            var available = query.Available.Value;
            cars = cars.Where(car =>
                (!car.IsUnderMaintenance &&
                 car.PricePerDay.HasValue &&
                 car.PricePerDay > 0 &&
                 !car.RentedCarCustomers.Any(reservation =>
                     reservation.Status != RentalStatus.Cancelled &&
                     reservation.RentStartDate <= endDate &&
                     reservation.RentEndDate >= startDate)) == available);
        }

        var totalCount = await cars.CountAsync();
        var data = await cars
            .OrderBy(car => car.LicencePlate)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(car => new RentalCarViewModel
            {
                LicencePlate = car.LicencePlate,
                Color = car.Color,
                NoOfCylinders = car.NoOfCylinders,
                FuelType = car.FuelType,
                EngineType = car.EngineType,
                ManufactureDate = car.ManufactuareDate,
                CarCompany = car.CarCompany,
                Model = car.Model,
                PricePerDay = car.PricePerDay,
                Available = !car.IsUnderMaintenance &&
                    car.PricePerDay.HasValue &&
                    car.PricePerDay > 0 &&
                    !car.RentedCarCustomers.Any(reservation =>
                        reservation.Status != RentalStatus.Cancelled &&
                        reservation.RentStartDate <= endDate &&
                        reservation.RentEndDate >= startDate)
            })
            .ToListAsync();

        return new PagedViewModel<RentalCarViewModel>
        {
            Data = data,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<RentalCarDetailsViewModel?> GetRentalCarAsync(string licencePlate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var car = await _context.CarsForRents
            .AsNoTracking()
            .Where(item => item.LicencePlate == licencePlate)
            .Select(item => new RentalCarDetailsViewModel
            {
                LicencePlate = item.LicencePlate,
                Color = item.Color,
                NoOfCylinders = item.NoOfCylinders,
                FuelType = item.FuelType,
                EngineType = item.EngineType,
                ManufactureDate = item.ManufactuareDate,
                CarCompany = item.CarCompany,
                Model = item.Model,
                PricePerDay = item.PricePerDay,
                Available = !item.IsUnderMaintenance &&
                    item.PricePerDay.HasValue &&
                    item.PricePerDay > 0 &&
                    !item.RentedCarCustomers.Any(reservation =>
                        reservation.Status != RentalStatus.Cancelled &&
                        reservation.RentStartDate <= today &&
                        reservation.RentEndDate >= today)
            })
            .SingleOrDefaultAsync();

        if (car is null)
        {
            return null;
        }

        car.Reservations = await _context.RentedCarCustomers
            .AsNoTracking()
            .Where(reservation =>
                reservation.LicencsePlateRented == licencePlate &&
                reservation.Status != RentalStatus.Cancelled)
            .OrderBy(reservation => reservation.RentStartDate)
            .Select(reservation => new RentalReservationViewModel
            {
                RentedCarCustomerId = reservation.RentedCarCustomerId,
                LicencePlate = reservation.LicencsePlateRented,
                CarCompany = reservation.LicencsePlateRentedNavigation.CarCompany,
                Model = reservation.LicencsePlateRentedNavigation.Model,
                RentStartDate = reservation.RentStartDate,
                RentEndDate = reservation.RentEndDate,
                NoOfDaysForRent = reservation.NoOfDaysForRent,
                PriceForRent = reservation.PriceForRent,
                Status = reservation.Status == RentalStatus.Cancelled
                    ? RentalStatus.Cancelled
                    : reservation.RentStartDate > today
                        ? RentalStatus.Upcoming
                        : reservation.RentEndDate < today
                            ? RentalStatus.Completed
                            : RentalStatus.Active
            })
            .ToListAsync();

        return car;
    }

    public async Task<RentalCarChangeStatus> AddRentalCarAsync(CreateRentalCarDto dto)
    {
        if (!IsValidManufactureDate(dto.ManufactureDate))
        {
            return RentalCarChangeStatus.Invalid;
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        if (await _context.CarsForRents.AnyAsync(car => car.LicencePlate == dto.LicencePlate))
        {
            return RentalCarChangeStatus.AlreadyExists;
        }

        if (dto.BranchId.HasValue &&
            !await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == dto.BranchId))
        {
            return RentalCarChangeStatus.BranchNotFound;
        }

        var car = new CarsForRent
        {
            LicencePlate = dto.LicencePlate,
            Color = dto.Color,
            NoOfCylinders = dto.NoOfCylinders,
            FuelType = dto.FuelType!.Value,
            EngineType = dto.EngineType!.Value,
            ManufactuareDate = dto.ManufactureDate,
            CarCompany = dto.CarCompany,
            Model = dto.Model,
            PricePerDay = dto.PricePerDay,
            BranchId = dto.BranchId
        };

        _context.CarsForRents.Add(car);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return RentalCarChangeStatus.Updated;
    }

    public async Task<RentalCarChangeStatus> UpdateRentalCarAsync(
        string licencePlate,
        UpdateRentalCarDto dto)
    {
        var car = await _context.CarsForRents
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (car is null)
        {
            return RentalCarChangeStatus.NotFound;
        }

        if (dto.Color is null &&
            dto.NoOfCylinders is null &&
            dto.FuelType is null &&
            dto.EngineType is null &&
            dto.ManufactureDate is null &&
            dto.CarCompany is null &&
            dto.Model is null &&
            dto.PricePerDay is null &&
            dto.IsUnderMaintenance is null &&
            dto.BranchId is null)
        {
            return RentalCarChangeStatus.EmptyUpdate;
        }

        if (dto.ManufactureDate.HasValue &&
            !IsValidManufactureDate(dto.ManufactureDate.Value))
        {
            return RentalCarChangeStatus.Invalid;
        }

        if (dto.BranchId.HasValue &&
            !await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == dto.BranchId))
        {
            return RentalCarChangeStatus.BranchNotFound;
        }

        car.Color = dto.Color ?? car.Color;
        car.NoOfCylinders = dto.NoOfCylinders ?? car.NoOfCylinders;
        car.FuelType = dto.FuelType ?? car.FuelType;
        car.EngineType = dto.EngineType ?? car.EngineType;
        car.ManufactuareDate = dto.ManufactureDate ?? car.ManufactuareDate;
        car.CarCompany = dto.CarCompany ?? car.CarCompany;
        car.Model = dto.Model ?? car.Model;
        car.PricePerDay = dto.PricePerDay ?? car.PricePerDay;
        car.IsUnderMaintenance = dto.IsUnderMaintenance ?? car.IsUnderMaintenance;
        car.BranchId = dto.BranchId ?? car.BranchId;

        await _context.SaveChangesAsync();
        return RentalCarChangeStatus.Updated;
    }

    public async Task<RentalCarChangeStatus> DeleteRentalCarAsync(string licencePlate)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var car = await _context.CarsForRents
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (car is null)
        {
            return RentalCarChangeStatus.NotFound;
        }

        if (await _context.RentedCarCustomers.AnyAsync(
                reservation => reservation.LicencsePlateRented == licencePlate))
        {
            return RentalCarChangeStatus.HasReservations;
        }

        _context.CarsForRents.Remove(car);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return RentalCarChangeStatus.Updated;
    }

    public async Task<RentalOperationResult> CreateRentalAsync(
        string userId,
        CreateRentalDto dto)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (dto.RentStartDate < today || dto.RentEndDate < dto.RentStartDate)
        {
            return new RentalOperationResult(RentalOperationStatus.InvalidDates, null);
        }

        var customer = await _context.Customers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return new RentalOperationResult(RentalOperationStatus.CustomerNotFound, null);
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var car = await _context.CarsForRents
            .SingleOrDefaultAsync(item => item.LicencePlate == dto.LicencePlate);
        if (car is null)
        {
            return new RentalOperationResult(RentalOperationStatus.CarNotFound, null);
        }

        if (car.IsUnderMaintenance || !car.PricePerDay.HasValue || car.PricePerDay <= 0)
        {
            return new RentalOperationResult(RentalOperationStatus.CarUnavailable, null);
        }

        var overlap = await _context.RentedCarCustomers.AnyAsync(reservation =>
            reservation.LicencsePlateRented == dto.LicencePlate &&
            reservation.Status != RentalStatus.Cancelled &&
            reservation.RentStartDate <= dto.RentEndDate &&
            reservation.RentEndDate >= dto.RentStartDate);
        if (overlap)
        {
            return new RentalOperationResult(RentalOperationStatus.CarUnavailable, null);
        }

        var days = dto.RentEndDate.DayNumber - dto.RentStartDate.DayNumber + 1;
        var reservation = new RentedCarCustomer
        {
            CustomerId = customer.CustomerId,
            LicencsePlateRented = car.LicencePlate,
            RentStartDate = dto.RentStartDate,
            RentEndDate = dto.RentEndDate,
            NoOfDaysForRent = days,
            PriceForRent = decimal.ToDouble(car.PricePerDay.Value * days),
            Status = RentalStatus.Upcoming
        };

        _context.RentedCarCustomers.Add(reservation);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new RentalOperationResult(
            RentalOperationStatus.Created,
            ToReservationViewModel(reservation, car));
    }

    public async Task<PagedViewModel<RentalReservationViewModel>> GetRentalsAsync(
        string userId,
        RentalListQueryDto query)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rentals = _context.RentedCarCustomers
            .AsNoTracking()
            .Where(item => item.Customer.UserId == userId);

        if (query.Status == RentalStatus.Cancelled)
        {
            rentals = rentals.Where(item => item.Status == RentalStatus.Cancelled);
        }
        else if (query.Status == RentalStatus.Upcoming)
        {
            rentals = rentals.Where(item =>
                item.Status != RentalStatus.Cancelled &&
                item.RentStartDate > today);
        }
        else if (query.Status == RentalStatus.Active)
        {
            rentals = rentals.Where(item =>
                item.Status != RentalStatus.Cancelled &&
                item.RentStartDate <= today &&
                item.RentEndDate >= today);
        }
        else if (query.Status == RentalStatus.Completed)
        {
            rentals = rentals.Where(item =>
                item.Status != RentalStatus.Cancelled &&
                item.RentEndDate < today);
        }

        if (query.FromDate.HasValue)
        {
            rentals = rentals.Where(item => item.RentEndDate >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            rentals = rentals.Where(item => item.RentStartDate <= query.ToDate.Value);
        }

        var totalCount = await rentals.CountAsync();
        var data = await rentals
            .OrderByDescending(item => item.RentStartDate)
            .ThenByDescending(item => item.RentedCarCustomerId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(item => new RentalReservationViewModel
            {
                RentedCarCustomerId = item.RentedCarCustomerId,
                LicencePlate = item.LicencsePlateRented,
                CarCompany = item.LicencsePlateRentedNavigation.CarCompany,
                Model = item.LicencsePlateRentedNavigation.Model,
                RentStartDate = item.RentStartDate,
                RentEndDate = item.RentEndDate,
                NoOfDaysForRent = item.NoOfDaysForRent,
                PriceForRent = item.PriceForRent,
                Status = item.Status == RentalStatus.Cancelled
                    ? RentalStatus.Cancelled
                    : item.RentStartDate > today
                        ? RentalStatus.Upcoming
                        : item.RentEndDate < today
                            ? RentalStatus.Completed
                            : RentalStatus.Active,
                CancellationReason = item.CancellationReason
            })
            .ToListAsync();

        return new PagedViewModel<RentalReservationViewModel>
        {
            Data = data,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<RentalReservationViewModel?> GetRentalAsync(
        int reservationId,
        string userId,
        bool hasStaffAccess)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await _context.RentedCarCustomers
            .AsNoTracking()
            .Where(item =>
                item.RentedCarCustomerId == reservationId &&
                (hasStaffAccess || item.Customer.UserId == userId))
            .Select(item => new RentalReservationViewModel
            {
                RentedCarCustomerId = item.RentedCarCustomerId,
                LicencePlate = item.LicencsePlateRented,
                CarCompany = item.LicencsePlateRentedNavigation.CarCompany,
                Model = item.LicencsePlateRentedNavigation.Model,
                RentStartDate = item.RentStartDate,
                RentEndDate = item.RentEndDate,
                NoOfDaysForRent = item.NoOfDaysForRent,
                PriceForRent = item.PriceForRent,
                Status = item.Status == RentalStatus.Cancelled
                    ? RentalStatus.Cancelled
                    : item.RentStartDate > today
                        ? RentalStatus.Upcoming
                        : item.RentEndDate < today
                            ? RentalStatus.Completed
                            : RentalStatus.Active,
                CancellationReason = item.CancellationReason,
                CustomerName = item.Customer.FullName
            })
            .SingleOrDefaultAsync();
    }

    public async Task<RentalOperationResult> CancelRentalAsync(
        int reservationId,
        string userId,
        bool isAdmin,
        string? reason)
    {
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var reservation = await _context.RentedCarCustomers
            .Include(item => item.Customer)
            .Include(item => item.LicencsePlateRentedNavigation)
            .SingleOrDefaultAsync(item =>
                item.RentedCarCustomerId == reservationId &&
                (isAdmin || item.Customer.UserId == userId));
        if (reservation is null)
        {
            return new RentalOperationResult(RentalOperationStatus.NotFound, null);
        }

        if (reservation.Status != RentalStatus.Upcoming ||
            reservation.RentStartDate <= DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return new RentalOperationResult(RentalOperationStatus.CancellationNotAllowed, null);
        }

        reservation.Status = RentalStatus.Cancelled;
        reservation.CancellationReason = string.IsNullOrWhiteSpace(reason)
            ? null
            : reason.Trim();
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new RentalOperationResult(
            RentalOperationStatus.Cancelled,
            ToReservationViewModel(reservation, reservation.LicencsePlateRentedNavigation));
    }

    public static bool IsValidDateRange(DateOnly? startDate, DateOnly? endDate)
    {
        return (!startDate.HasValue && !endDate.HasValue) ||
            (startDate.HasValue && endDate.HasValue && endDate.Value >= startDate.Value);
    }

    private static (DateOnly StartDate, DateOnly EndDate) GetAvailabilityDates(
        DateOnly? startDate,
        DateOnly? endDate)
    {
        var start = startDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return (start, endDate ?? start);
    }

    private static bool IsValidManufactureDate(DateOnly date)
    {
        return date != default && date <= DateOnly.FromDateTime(DateTime.UtcNow);
    }

    private static RentalReservationViewModel ToReservationViewModel(
        RentedCarCustomer reservation,
        CarsForRent car)
    {
        return new RentalReservationViewModel
        {
            RentedCarCustomerId = reservation.RentedCarCustomerId,
            LicencePlate = car.LicencePlate,
            CarCompany = car.CarCompany,
            Model = car.Model,
            RentStartDate = reservation.RentStartDate,
            RentEndDate = reservation.RentEndDate,
            NoOfDaysForRent = reservation.NoOfDaysForRent,
            PriceForRent = reservation.PriceForRent,
            Status = GetCurrentStatus(
                reservation,
                DateOnly.FromDateTime(DateTime.UtcNow)),
            CancellationReason = reservation.CancellationReason,
            CustomerName = reservation.Customer?.FullName
        };
    }

    private static RentalStatus GetCurrentStatus(
        RentedCarCustomer reservation,
        DateOnly today)
    {
        if (reservation.Status == RentalStatus.Cancelled)
        {
            return RentalStatus.Cancelled;
        }

        if (reservation.RentStartDate > today)
        {
            return RentalStatus.Upcoming;
        }

        return reservation.RentEndDate < today
            ? RentalStatus.Completed
            : RentalStatus.Active;
    }
}

public enum RentalCarChangeStatus
{
    Updated,
    NotFound,
    AlreadyExists,
    HasReservations,
    BranchNotFound,
    Invalid,
    EmptyUpdate
}

public enum RentalOperationStatus
{
    Created,
    Cancelled,
    NotFound,
    CustomerNotFound,
    CarNotFound,
    CarUnavailable,
    InvalidDates,
    CancellationNotAllowed
}

public record RentalOperationResult(
    RentalOperationStatus Status,
    RentalReservationViewModel? Reservation);
