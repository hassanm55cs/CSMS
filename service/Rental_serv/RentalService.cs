using System.Data;
using CSMS.Data;
using CSMS.Dto;
using CSMS.Enums;
using CSMS.Helper;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Rental_serv;

public class RentalService:IRentalService
{
    // Cancellation policy (confirm with the team):
    //  - only reservations that have not started yet can be cancelled
    //  - starting in 2+ days: no fee
    //  - starting tomorrow: fee of one day's price
    private const int FreeCancellationDaysBeforeStart = 2;

    private readonly ApplicationDbContext _context;

    public RentalService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RentalCreateResult> CreateRentalAsync(string userId, CreateRentalDto dto)
    {
        var start = dto.RentStartDate!.Value;
        var end = dto.RentEndDate!.Value;
        var today = RentalStatusHelper.Today();

        if (start < today || end < start)
        {
            return new RentalCreateResult(RentalCreateStatus.InvalidDates, null);
        }

        var customer = await _context.Customers
            .AsNoTracking()
            .Include(x => x.RentedCarCustomers)
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return new RentalCreateResult(RentalCreateStatus.CustomerNotFound, null);
        }
        if(customer.RentedCarCustomers.Any(i => i.Status == RentedCarCustomerStatus.Active))
        {
            return new RentalCreateResult(RentalCreateStatus.CustomerHasaRentedCar, null);
        }

        var licencePlate = dto.LicencePlate.Trim();
        var car = await _context.CarsForRents
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.LicencePlate == licencePlate);

        if (car is null)
        {
            return new RentalCreateResult(RentalCreateStatus.CarNotFound, null);
        }

        if (car.Status != RentalCarStatus.Available)
        {
            return new RentalCreateResult(RentalCreateStatus.CarUnavailable, null);
        }

        if (car.PricePerDay <= 0)
        {
            return new RentalCreateResult(RentalCreateStatus.CarNotPriced, null);
        }

        // Serializable so two customers cannot book the same dates at the same time.
        await using var transaction =
            await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var overlaps = await _context.RentedCarCustomers.AnyAsync(rental =>
            rental.LicencsePlateRented == car.LicencePlate &&
            !rental.IsCancelled &&
            rental.RentStartDate <= end &&
            rental.RentEndDate >= start);
        if (overlaps)
        {
            return new RentalCreateResult(RentalCreateStatus.Overlap, null);
        }

        // Both the start and end day are counted (same-day rental = 1 day).
        var days = end.DayNumber - start.DayNumber + 1;
        car.Status = RentalCarStatus.Rented;

        var rental = new RentedCarCustomer
        {
            CustomerId = customer.CustomerId,
            LicencsePlateRented = car.LicencePlate,
            RentStartDate = start,
            RentEndDate = end,
            NoOfDaysForRent = days,
            PriceForRent = Math.Round(days * car.PricePerDay, 2),
            CreatedAt = DateTime.UtcNow
        };

        _context.RentedCarCustomers.Add(rental);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new RentalCreateResult(RentalCreateStatus.Created, ToViewModel(rental, car, today));
    }

    public async Task<PagedViewModel<RentalViewModel>?> GetMyRentalsAsync(
        string userId,
        RentalListQueryDto query)
    {
        var customerId = await _context.Customers
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .Select(item => (int?)item.CustomerId)
            .SingleOrDefaultAsync();
        if (customerId is null)
        {
            return null;
        }

        var today = RentalStatusHelper.Today();
        var rentals = _context.RentedCarCustomers
            .AsNoTracking()
            .Where(rental => rental.CustomerId == customerId.Value);

        if (query.Status.HasValue)
        {
            rentals = query.Status.Value switch
            {
                RentalStatus.Upcoming => rentals.Where(rental =>
                    !rental.IsCancelled && rental.RentStartDate > today),
                RentalStatus.Active => rentals.Where(rental =>
                    !rental.IsCancelled && rental.RentStartDate <= today && rental.RentEndDate >= today),
                RentalStatus.Completed => rentals.Where(rental =>
                    !rental.IsCancelled && rental.RentEndDate < today),
                _ => rentals.Where(rental => rental.IsCancelled)
            };
        }

        // The range matches any reservation that overlaps it.
        if (query.FromDate.HasValue)
        {
            var fromDate = query.FromDate.Value;
            rentals = rentals.Where(rental => rental.RentEndDate >= fromDate);
        }

        if (query.ToDate.HasValue)
        {
            var toDate = query.ToDate.Value;
            rentals = rentals.Where(rental => rental.RentStartDate <= toDate);
        }

        var totalCount = await rentals.CountAsync();
        var rows = await rentals
            .OrderByDescending(rental => rental.RentStartDate)
            .ThenByDescending(rental => rental.RentedCarCustomerId)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(rental => new { Rental = rental, Car = rental.LicencsePlateRentedNavigation })
            .ToListAsync();

        return new PagedViewModel<RentalViewModel>
        {
            Data = rows.Select(row => ToViewModel(row.Rental, row.Car, today)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount
        };
    }

    public async Task<RentalDetailsViewModel?> GetRentalAsync(
        int rentedCarCustomerId,
        string userId,
        bool hasStaffAccess)
    {
        var row = await _context.RentedCarCustomers
            .AsNoTracking()
            .Where(rental =>
                rental.RentedCarCustomerId == rentedCarCustomerId &&
                (hasStaffAccess || rental.Customer.UserId == userId))
            .Select(rental => new
            {
                Rental = rental,
                Car = rental.LicencsePlateRentedNavigation,
                Customer = rental.Customer
            })
            .SingleOrDefaultAsync();
        if (row is null)
        {
            return null;
        }

        var today = RentalStatusHelper.Today();
        var baseModel = ToViewModel(row.Rental, row.Car, today);

        return new RentalDetailsViewModel
        {
            RentedCarCustomerId = baseModel.RentedCarCustomerId,
            LicencePlate = baseModel.LicencePlate,
            CarCompany = baseModel.CarCompany,
            Model = baseModel.Model,
            RentStartDate = baseModel.RentStartDate,
            RentEndDate = baseModel.RentEndDate,
            NoOfDays = baseModel.NoOfDays,
            PriceForRent = baseModel.PriceForRent,
            Status = baseModel.Status,
            CreatedAt = baseModel.CreatedAt,
            CancelledAt = baseModel.CancelledAt,
            CancellationReason = baseModel.CancellationReason,
            CancellationFee = baseModel.CancellationFee,
            Vehicle = RentalCarService.Map<RentalCarViewModel>(row.Car),
            Customer = hasStaffAccess
                ? new CustomerSummaryViewModel
                {
                    CustomerId = row.Customer.CustomerId,
                    FullName = row.Customer.FullName,
                    Email = row.Customer.Email,
                    Phone = row.Customer.Phone
                }
                : null
        };
    }

    public async Task<RentalCancelResult> CancelRentalAsync(string userId,bool isAdmin, string? reason)
    {
        var rental = await _context.RentedCarCustomers
            .Include(item => item.LicencsePlateRentedNavigation)
            .SingleOrDefaultAsync(item =>
                item.Customer.UserId == userId &&
                (isAdmin || item.Customer.UserId == userId));
        if (rental is null)
        {
            return new RentalCancelResult(RentalCancelStatus.NotFound, null);
        }

        if (rental.IsCancelled)
        {
            return new RentalCancelResult(RentalCancelStatus.AlreadyCancelled, null);
        }

        var today = RentalStatusHelper.Today();
        var daysUntilStart = rental.RentStartDate.DayNumber - today.DayNumber;
        if (daysUntilStart <= 0)
        {
            return new RentalCancelResult(RentalCancelStatus.NotCancellable, null);
        }

        var fee = 0d;
        if (daysUntilStart < FreeCancellationDaysBeforeStart)
        {
            fee = Math.Round(rental.PriceForRent / rental.NoOfDaysForRent, 2);
        }

        rental.IsCancelled = true;
        rental.CancelledAt = DateTime.UtcNow;
        rental.CancellationReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        rental.LicencsePlateRentedNavigation.Status = RentalCarStatus.Available;
        rental.CancellationFee = fee;

        await _context.SaveChangesAsync();
        return new RentalCancelResult(
            RentalCancelStatus.Cancelled,
            ToViewModel(rental, rental.LicencsePlateRentedNavigation, today));
    }

    private static RentalViewModel ToViewModel(RentedCarCustomer rental, CarsForRent car, DateOnly today)
    {
        var status = RentalStatusHelper.Resolve(
            rental.IsCancelled, rental.RentStartDate, rental.RentEndDate, today);

        return new RentalViewModel
        {
            RentedCarCustomerId = rental.RentedCarCustomerId,
            LicencePlate = car.LicencePlate,
            CarCompany = car.CarCompany,
            Model = car.Model,
            RentStartDate = rental.RentStartDate,
            RentEndDate = rental.RentEndDate,
            NoOfDays = rental.NoOfDaysForRent,
            PriceForRent = rental.PriceForRent,
            Status = status.ToString(),
            CreatedAt = rental.CreatedAt,
            CancelledAt = rental.CancelledAt,
            CancellationReason = rental.CancellationReason,
            CancellationFee = rental.IsCancelled ? rental.CancellationFee : null
        };
    }
}

public enum RentalCreateStatus
{
    Created,
    InvalidDates,
    CustomerNotFound,
    CarNotFound,
    CarUnavailable,
    CarNotPriced,
    Overlap,
    CustomerHasaRentedCar
}

public record RentalCreateResult(RentalCreateStatus Status, RentalViewModel? Rental);

public enum RentalCancelStatus
{
    Cancelled,
    NotFound,
    AlreadyCancelled,
    NotCancellable
}

public record RentalCancelResult(RentalCancelStatus Status, RentalViewModel? Rental);
