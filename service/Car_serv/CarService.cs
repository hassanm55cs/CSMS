using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Car_serv;

public class CarService
{
    private readonly ApplicationDbContext _context;

    public CarService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedViewModel<CarViewModel>?> GetCustomerCarsAsync(
        string userId,
        CarListQueryDto query)
    {
        var customer = await _context.Customers
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return null;
        }

        var cars = _context.Cars
            .AsNoTracking()
            .Where(car => car.CustomerId == customer.CustomerId);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            cars = cars.Where(car =>
                car.LicencesPlate.Contains(search) ||
                car.Color.Contains(search) ||
                car.CarCompany.Contains(search) ||
                car.Model.Contains(search));
        }

        var totalCount = await cars.CountAsync();
        var data = await cars
            .OrderBy(car => car.LicencesPlate)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(car => new CarViewModel
            {
                LicencePlate = car.LicencesPlate,
                Color = car.Color,
                NoOfCylinders = car.NoOfCylinders,
                FuelType = car.FuelType,
                EngineType = car.EngineType,
                ManufactureDate = car.ManufactuareDate,
                CarCompany = car.CarCompany,
                Model = car.Model,
                CustomerId = car.CustomerId,
                PriceInEgp = car.PriceInEgp,
                CurrentKm = car.CurrentKm
            })
            .ToListAsync();

        return new PagedViewModel<CarViewModel>
        {
            Data = data,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public Task<CarDetailsViewModel?> GetCarAsync(
        string licencePlate,
        string userId,
        bool hasStaffAccess)
    {
        return _context.Cars
            .AsNoTracking()
            .Where(car =>
                car.LicencesPlate == licencePlate &&
                (hasStaffAccess || car.Customer.UserId == userId))
            .Select(car => new CarDetailsViewModel
            {
                LicencePlate = car.LicencesPlate,
                Color = car.Color,
                NoOfCylinders = car.NoOfCylinders,
                FuelType = car.FuelType,
                EngineType = car.EngineType,
                ManufactureDate = car.ManufactuareDate,
                CarCompany = car.CarCompany,
                Model = car.Model,
                CustomerId = car.CustomerId,
                PriceInEgp = car.PriceInEgp,
                CurrentKm = car.CurrentKm,
                Customer = new CustomerSummaryViewModel
                {
                    CustomerId = car.Customer.CustomerId,
                    FullName = car.Customer.FullName,
                    Email = car.Customer.Email,
                    Phone = car.Customer.Phone
                }
            })
            .SingleOrDefaultAsync();
    }

    public async Task<CarCreateResult> AddCarAsync(string userId, CreateCarDto dto)
    {
        if (!dto.ManufactureDate.HasValue ||
            dto.ManufactureDate.Value == default ||
            dto.ManufactureDate.Value > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return new CarCreateResult(CarCreateStatus.InvalidManufactureDate, null, null);
        }

        var customer = await _context.Customers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return new CarCreateResult(CarCreateStatus.CustomerNotFound, null, null);
        }

        if (await _context.Cars.AnyAsync(car => car.LicencesPlate == dto.LicencePlate))
        {
            return new CarCreateResult(CarCreateStatus.LicencePlateAlreadyExists, null, null);
        }

        var car = new Car
        {
            LicencesPlate = dto.LicencePlate,
            Color = dto.Color,
            NoOfCylinders = dto.NoOfCylinders!.Value,
            FuelType = dto.FuelType!.Value,
            EngineType = dto.EngineType!.Value,
            ManufactuareDate = dto.ManufactureDate.Value,
            CarCompany = dto.CarCompany,
            Model = dto.Model,
            CustomerId = customer.CustomerId,
            PriceInEgp = dto.PriceInEgp!.Value,
            CurrentKm = dto.CurrentKm!.Value
        };

        _context.Cars.Add(car);
        await _context.SaveChangesAsync();

        return new CarCreateResult(
            CarCreateStatus.Created,
            ToViewModel(car),
            customer.CustomerId);
    }

    public async Task<CarViewModel?> UpdateCarAsync(
        string licencePlate,
        string userId,
        bool hasStaffAccess,
        UpdateCarDto dto)
    {
        var car = await _context.Cars
            .Include(item => item.Customer)
            .SingleOrDefaultAsync(item =>
                item.LicencesPlate == licencePlate &&
                (hasStaffAccess || item.Customer.UserId == userId));
        if (car is null)
        {
            return null;
        }

        if (dto.ManufactureDate.HasValue &&
            (dto.ManufactureDate.Value == default ||
             dto.ManufactureDate.Value > DateOnly.FromDateTime(DateTime.UtcNow)))
        {
            return null;
        }

        car.Color = dto.Color ?? car.Color;
        car.NoOfCylinders = dto.NoOfCylinders ?? car.NoOfCylinders;
        car.FuelType = dto.FuelType ?? car.FuelType;
        car.EngineType = dto.EngineType ?? car.EngineType;
        car.ManufactuareDate = dto.ManufactureDate ?? car.ManufactuareDate;
        car.CarCompany = dto.CarCompany ?? car.CarCompany;
        car.Model = dto.Model ?? car.Model;
        car.PriceInEgp = dto.PriceInEgp ?? car.PriceInEgp;
        car.CurrentKm = dto.CurrentKm ?? car.CurrentKm;

        await _context.SaveChangesAsync();
        return ToViewModel(car);
    }

    public async Task<CarDeleteStatus> DeleteCarAsync(
        string licencePlate,
        string userId,
        bool isAdmin)
    {
        var car = await _context.Cars
            .Include(item => item.Customer)
            .SingleOrDefaultAsync(item => item.LicencesPlate == licencePlate);
        if (car is null)
        {
            return CarDeleteStatus.NotFound;
        }

        if (!isAdmin && car.Customer.UserId != userId)
        {
            return CarDeleteStatus.Forbidden;
        }

        var hasVisits = await _context.Visits.AnyAsync(visit => visit.CarId == licencePlate);
        var hasEmergencyRequests = await _context.EmergencyRequests
            .AnyAsync(request => request.CarLicencePlate == licencePlate);
        var hasActiveServices = await _context.Services.AnyAsync(service =>
            service.Visit.CarId == licencePlate &&
            service.Approved &&
            (service.Visit.Status == Status.serviceApproved ||
             service.Visit.Status == Status.servicing));

        if (hasVisits || hasEmergencyRequests || hasActiveServices)
        {
            return CarDeleteStatus.HasLinkedRecords;
        }

        _context.Cars.Remove(car);
        await _context.SaveChangesAsync();
        return CarDeleteStatus.Deleted;
    }

    private static CarViewModel ToViewModel(Car car)
    {
        return new CarViewModel
        {
            LicencePlate = car.LicencesPlate,
            Color = car.Color,
            NoOfCylinders = car.NoOfCylinders,
            FuelType = car.FuelType,
            EngineType = car.EngineType,
            ManufactureDate = car.ManufactuareDate,
            CarCompany = car.CarCompany,
            Model = car.Model,
            CustomerId = car.CustomerId,
            PriceInEgp = car.PriceInEgp,
            CurrentKm = car.CurrentKm
        };
    }
}

public enum CarCreateStatus
{
    Created,
    CustomerNotFound,
    LicencePlateAlreadyExists,
    InvalidManufactureDate
}

public record CarCreateResult(
    CarCreateStatus Status,
    CarViewModel? Car,
    int? CustomerId);

public enum CarDeleteStatus
{
    Deleted,
    NotFound,
    Forbidden,
    HasLinkedRecords
}
