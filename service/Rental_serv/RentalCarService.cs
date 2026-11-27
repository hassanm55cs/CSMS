using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Helper;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Rental_serv;

public class RentalCarService: IRentalCarService
{
    private readonly ApplicationDbContext _context;

    public RentalCarService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedViewModel<RentalCarListItemViewModel>> GetRentalCarsAsync(
        RentalCarListQueryDto query)
    {
        var today = RentalStatusHelper.Today();
        var from = query.FromDate ?? query.ToDate ?? today;
        var to = query.ToDate ?? query.FromDate ?? today;

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
            var fuelType = query.FuelType.Value;
            cars = cars.Where(car => car.FuelType == fuelType);
        }

        if (query.EngineType.HasValue)
        {
            var engineType = query.EngineType.Value;
            cars = cars.Where(car => car.EngineType == engineType);
        }

        if (query.MinPrice.HasValue)
        {
            var minPrice = query.MinPrice.Value;
            cars = cars.Where(car => car.PricePerDay >= minPrice);
        }

        if (query.MaxPrice.HasValue)
        {
            var maxPrice = query.MaxPrice.Value;
            cars = cars.Where(car => car.PricePerDay <= maxPrice);
        }

        if (query.Available.HasValue)
        {
            cars = query.Available.Value
                ? cars.Where(car =>
                    car.Status == RentalCarStatus.Available &&
                    !car.RentedCarCustomers.Any(rental =>
                        !rental.IsCancelled &&
                        rental.RentStartDate <= to &&
                        rental.RentEndDate >= from))
                : cars.Where(car =>
                    car.Status != RentalCarStatus.Available ||
                    car.RentedCarCustomers.Any(rental =>
                        !rental.IsCancelled &&
                        rental.RentStartDate <= to &&
                        rental.RentEndDate >= from));
        }

        var totalCount = await cars.CountAsync();
        var page = await cars
            .OrderBy(car => car.LicencePlate)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var busyPlates = await GetBusyPlatesAsync(
            page.Select(car => car.LicencePlate).ToList(), from, to);

        var data = page
            .Select(car =>
            {
                var item = Map<RentalCarListItemViewModel>(car);
                item.Available = car.Status == RentalCarStatus.Available &&
                                 !busyPlates.Contains(car.LicencePlate);
                return item;
            })
            .ToList();

        return new PagedViewModel<RentalCarListItemViewModel>
        {
            Data = data,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<RentalCarDetailsViewModel?> GetRentalCarAsync(
        string licencePlate,
        RentalCarAvailabilityQueryDto query)
    {
        var car = await _context.CarsForRents
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (car is null)
        {
            return null;
        }

        var today = RentalStatusHelper.Today();
        var from = query.FromDate ?? query.ToDate ?? today;
        var to = query.ToDate ?? query.FromDate ?? today;

        // Only date ranges are returned (no customer data) because this endpoint is public.
        var reservations = await _context.RentedCarCustomers
            .AsNoTracking()
            .Where(rental =>
                rental.LicencsePlateRented == licencePlate &&
                !rental.IsCancelled &&
                rental.RentEndDate >= today)
            .OrderBy(rental => rental.RentStartDate)
            .Select(rental => new RentalCarReservationViewModel
            {
                RentStartDate = rental.RentStartDate,
                RentEndDate = rental.RentEndDate
            })
            .ToListAsync();

        var details = Map<RentalCarDetailsViewModel>(car);
        details.Reservations = reservations;
        details.Available = car.Status == RentalCarStatus.Available &&
                            !reservations.Any(item =>
                                item.RentStartDate <= to && item.RentEndDate >= from);
        return details;
    }

    public async Task<RentalCarCreateResult> CreateAsync(CreateRentalCarDto dto)
    {
        if (!dto.ManufactureDate.HasValue ||
            dto.ManufactureDate.Value == default ||
            dto.ManufactureDate.Value > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return new RentalCarCreateResult(RentalCarCreateStatus.InvalidManufactureDate, null);
        }

        if (!TryParseEnum<FuelType>(dto.FuelType, out var fuelType) ||
            !TryParseEnum<EngineType>(dto.EngineType, out var engineType))
        {
            return new RentalCarCreateResult(RentalCarCreateStatus.InvalidEnum, null);
        }



        var licencePlate = dto.LicencePlate.Trim();
        if (await _context.CarsForRents.AnyAsync(item => item.LicencePlate == licencePlate))
        {
            return new RentalCarCreateResult(RentalCarCreateStatus.LicencePlateAlreadyExists, null);
        }

        var car = new CarsForRent
        {
            LicencePlate = licencePlate,
            Color = dto.Color,
            NoOfCylinders = dto.NoOfCylinders!.Value,
            FuelType = fuelType,
            EngineType = engineType,
            ManufactuareDate = dto.ManufactureDate.Value,
            CarCompany = dto.CarCompany,
            Model = dto.Model,
            PricePerDay = dto.PricePerDay!.Value,
            Status = RentalCarStatus.Available,
        };

        _context.CarsForRents.Add(car);
        await _context.SaveChangesAsync();

        return new RentalCarCreateResult(RentalCarCreateStatus.Created, Map<RentalCarViewModel>(car));
    }

    public async Task<RentalCarUpdateResult> UpdateAsync(string licencePlate, UpdateRentalCarDto dto)
    {
        var car = await _context.CarsForRents
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (car is null)
        {
            return new RentalCarUpdateResult(RentalCarUpdateStatus.NotFound, null);
        }

        if (dto.ManufactureDate.HasValue &&
            (dto.ManufactureDate.Value == default ||
             dto.ManufactureDate.Value > DateOnly.FromDateTime(DateTime.UtcNow)))
        {
            return new RentalCarUpdateResult(RentalCarUpdateStatus.InvalidManufactureDate, null);
        }

        FuelType? fuelType = null;
        if (dto.FuelType is not null)
        {
            if (!TryParseEnum<FuelType>(dto.FuelType, out var parsedFuel))
            {
                return new RentalCarUpdateResult(RentalCarUpdateStatus.InvalidEnum, null);
            }

            fuelType = parsedFuel;
        }

        EngineType? engineType = null;
        if (dto.EngineType is not null)
        {
            if (!TryParseEnum<EngineType>(dto.EngineType, out var parsedEngine))
            {
                return new RentalCarUpdateResult(RentalCarUpdateStatus.InvalidEnum, null);
            }

            engineType = parsedEngine;
        }

        RentalCarStatus? status = null;
        if (dto.Status is not null)
        {
            if (!TryParseEnum<RentalCarStatus>(dto.Status, out var parsedStatus))
            {
                return new RentalCarUpdateResult(RentalCarUpdateStatus.InvalidEnum, null);
            }

            status = parsedStatus;
        }

        if (dto.BranchId.HasValue &&
            !await _context.ServiceBranches.AnyAsync(branch => branch.BranchId == dto.BranchId.Value))
        {
            return new RentalCarUpdateResult(RentalCarUpdateStatus.BranchNotFound, null);
        }

        car.Color = dto.Color ?? car.Color;
        car.NoOfCylinders = dto.NoOfCylinders ?? car.NoOfCylinders;
        car.FuelType = fuelType ?? car.FuelType;
        car.EngineType = engineType ?? car.EngineType;
        car.ManufactuareDate = dto.ManufactureDate ?? car.ManufactuareDate;
        car.CarCompany = dto.CarCompany ?? car.CarCompany;
        car.Model = dto.Model ?? car.Model;
        car.PricePerDay = dto.PricePerDay ?? car.PricePerDay;
        car.Status = status ?? car.Status;

        await _context.SaveChangesAsync();
        return new RentalCarUpdateResult(RentalCarUpdateStatus.Updated, Map<RentalCarViewModel>(car));
    }

    public async Task<RentalCarDeleteStatus> DeleteAsync(string licencePlate)
    {
        var car = await _context.CarsForRents
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);
        if (car is null)
        {
            return RentalCarDeleteStatus.NotFound;
        }

        // Cancelled reservations count too: rental history must be preserved.
        var hasReservations = await _context.RentedCarCustomers
            .AnyAsync(rental => rental.LicencsePlateRented == licencePlate);
        if (hasReservations)
        {
            return RentalCarDeleteStatus.HasReservations;
        }

        _context.CarsForRents.Remove(car);
        await _context.SaveChangesAsync();
        return RentalCarDeleteStatus.Deleted;
    }

    private async Task<HashSet<string>> GetBusyPlatesAsync(
        List<string> plates,
        DateOnly from,
        DateOnly to)
    {
        var busy = await _context.RentedCarCustomers
            .AsNoTracking()
            .Where(rental =>
                plates.Contains(rental.LicencsePlateRented) &&
                !rental.IsCancelled &&
                rental.RentStartDate <= to &&
                rental.RentEndDate >= from)
            .Select(rental => rental.LicencsePlateRented)
            .Distinct()
            .ToListAsync();

        return busy.ToHashSet();
    }

    public static T Map<T>(CarsForRent car) where T : RentalCarViewModel, new()
    {
        return new T
        {
            LicencePlate = car.LicencePlate,
            Color = car.Color,
            NoOfCylinders = car.NoOfCylinders,
            FuelType = car.FuelType.ToString(),
            EngineType = car.EngineType.ToString(),
            ManufactureDate = car.ManufactuareDate,
            CarCompany = car.CarCompany,
            Model = car.Model,
            PricePerDay = car.PricePerDay,
            Status = car.Status.ToString(),
        };
    }

    private static bool TryParseEnum<T>(string? value, out T result) where T : struct, Enum
    {
        return Enum.TryParse(value, true, out result) && Enum.IsDefined(result);
    }
}

public enum RentalCarCreateStatus
{
    Created,
    LicencePlateAlreadyExists,
    InvalidManufactureDate,
    InvalidEnum,
    BranchNotFound
}

public record RentalCarCreateResult(RentalCarCreateStatus Status, RentalCarViewModel? Car);

public enum RentalCarUpdateStatus
{
    Updated,
    NotFound,
    InvalidManufactureDate,
    InvalidEnum,
    BranchNotFound
}

public record RentalCarUpdateResult(RentalCarUpdateStatus Status, RentalCarViewModel? Car);

public enum RentalCarDeleteStatus
{
    Deleted,
    NotFound,
    HasReservations
}
