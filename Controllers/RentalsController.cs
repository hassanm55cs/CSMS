using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Rental_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace CSMS.Controllers;

[ApiController]
[Route("rentals")]
[Authorize]
public class RentalsController : ControllerBase
{
    private readonly RentalService _rentalService;

    public RentalsController(RentalService rentalService)
    {
        _rentalService = rentalService;
    }

    [HttpPost]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> CreateRental([FromBody] CreateRentalDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _rentalService.CreateRentalAsync(userId, dto);
        return result.Status switch
        {
            RentalOperationStatus.Created => CreatedAtAction(
                nameof(GetRental),
                new { rentedCarCustomerId = result.Reservation!.RentedCarCustomerId },
                result.Reservation),
            RentalOperationStatus.InvalidDates => BadRequest(
                "Rent dates must be valid and cannot start in the past."),
            RentalOperationStatus.CustomerNotFound => NotFound("Customer profile not found."),
            RentalOperationStatus.CarNotFound => NotFound("Rental car not found."),
            RentalOperationStatus.CarUnavailable => Conflict(
                "The rental car is unavailable for the selected dates."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpGet]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> GetRentals([FromQuery] RentalListQueryDto query)
    {
        if (!IsValidDateRange(query.FromDate, query.ToDate))
        {
            return BadRequest("FromDate must not be after ToDate.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await _rentalService.GetRentalsAsync(userId, query));
    }

    [HttpGet("{rentedCarCustomerId:int}")]
    [Authorize(Roles = "customer,employee,admin")]
    public async Task<IActionResult> GetRental(int rentedCarCustomerId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var rental = await _rentalService.GetRentalAsync(
            rentedCarCustomerId,
            userId,
            User.IsInRole("employee") || User.IsInRole("admin"));
        return rental is null ? NotFound() : Ok(rental);
    }

    [HttpPost("{rentedCarCustomerId:int}/cancel")]
    [Authorize(Roles = "customer,admin")]
    public async Task<IActionResult> CancelRental(
        int rentedCarCustomerId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelRequestDto? dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _rentalService.CancelRentalAsync(
            rentedCarCustomerId,
            userId,
            User.IsInRole("admin"),
            dto?.Reason);
        return result.Status switch
        {
            RentalOperationStatus.Cancelled => Ok(result.Reservation),
            RentalOperationStatus.NotFound => NotFound(),
            RentalOperationStatus.CancellationNotAllowed => Conflict(
                "Only upcoming reservations that have not started can be cancelled."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    private static bool IsValidDateRange(DateOnly? fromDate, DateOnly? toDate)
    {
        return !fromDate.HasValue || !toDate.HasValue || toDate.Value >= fromDate.Value;
    }
}
