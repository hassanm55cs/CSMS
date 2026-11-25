using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Rental_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("/Rentals")]
[Authorize]
public class RentalsController : ControllerBase
{
    private readonly IRentalService _irentalService;

    public RentalsController(IRentalService rentalService)
    {
        _irentalService = rentalService;
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

        var result = await _irentalService.CreateRentalAsync(userId, dto);
        return result.Status switch
        {
            RentalCreateStatus.Created => CreatedAtAction(
                nameof(GetRental),
                new { rentedCarCustomerId = result.Rental!.RentedCarCustomerId },
                result.Rental),
            RentalCreateStatus.InvalidDates => BadRequest(new
            {
                Message = "RentStartDate must not be in the past and RentEndDate must not be before RentStartDate."
            }),
            RentalCreateStatus.CustomerNotFound => NotFound(new { Message = "Customer profile not found." }),
            RentalCreateStatus.CarNotFound => NotFound(new { Message = "Rental car not found." }),
            RentalCreateStatus.CarUnavailable => Conflict(new
            {
                Message = "This vehicle is not available for rent."
            }),
            RentalCreateStatus.CarNotPriced => Conflict(new
            {
                Message = "This vehicle has no daily price yet, so it cannot be reserved."
            }),
            RentalCreateStatus.Overlap => Conflict(new
            {
                Message = "The vehicle is already reserved for part of these dates."
            }),
            RentalCreateStatus.CustomerHasaRentedCar => Conflict(new
            {
                Message = "the customer has already rentead a vechile"
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpGet]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> GetMyRentals([FromQuery] RentalListQueryDto query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (query.FromDate.HasValue && query.ToDate.HasValue && query.FromDate > query.ToDate)
        {
            return BadRequest(new { Message = "FromDate must not be after ToDate." });
        }

        var rentals = await _irentalService.GetMyRentalsAsync(userId, query);
        return rentals is null ? NotFound() : Ok(rentals);
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

        var rental = await _irentalService.GetRentalAsync(
            rentedCarCustomerId,
            userId,
            User.IsInRole("employee") || User.IsInRole("admin"));
        return rental is null ? NotFound() : Ok(rental);
    }

    [HttpPost("/cancel")]
    [Authorize(Roles = "customer,admin")]
    public async Task<IActionResult> CancelRental([FromBody] CancelDto dto )
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _irentalService.CancelRentalAsync(userId,User.IsInRole("admin"),dto?.Reason);
        return result.Status switch
        {
            RentalCancelStatus.Cancelled => Ok(result.Rental),
            RentalCancelStatus.NotFound => NotFound(),
            RentalCancelStatus.AlreadyCancelled => Conflict(new
            {
                Message = "This reservation is already cancelled."
            }),
            RentalCancelStatus.NotCancellable => Conflict(new
            {
                Message = "Only reservations that have not started yet can be cancelled."
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
