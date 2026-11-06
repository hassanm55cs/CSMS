using CSMS.Dto;
using CSMS.service.Rental_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("rental-cars")]
public class RentalCarsController : ControllerBase
{
    private readonly RentalService _rentalService;

    public RentalCarsController(RentalService rentalService)
    {
        _rentalService = rentalService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetRentalCars([FromQuery] RentalCarListQueryDto query)
    {
        if (!RentalService.IsValidDateRange(query.StartDate, query.EndDate) ||
            query.MinPrice.HasValue &&
            query.MaxPrice.HasValue &&
            query.MinPrice > query.MaxPrice)
        {
            return BadRequest("The date and price ranges are invalid.");
        }

        return Ok(await _rentalService.GetRentalCarsAsync(query));
    }

    [HttpGet("{licencePlate}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRentalCar(string licencePlate)
    {
        var car = await _rentalService.GetRentalCarAsync(licencePlate);
        return car is null ? NotFound() : Ok(car);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AddRentalCar([FromBody] CreateRentalCarDto dto)
    {
        var status = await _rentalService.AddRentalCarAsync(dto);
        if (status != RentalCarChangeStatus.Updated)
        {
            return await MapChangeStatus(status);
        }

        var car = await _rentalService.GetRentalCarAsync(dto.LicencePlate);
        return CreatedAtAction(nameof(GetRentalCar), new { licencePlate = dto.LicencePlate }, car);
    }

    [HttpPut("{licencePlate}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateRentalCar(
        string licencePlate,
        [FromBody] UpdateRentalCarDto dto)
    {
        return await MapChangeStatus(
            await _rentalService.UpdateRentalCarAsync(licencePlate, dto));
    }

    [HttpDelete("{licencePlate}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteRentalCar(string licencePlate)
    {
        var status = await _rentalService.DeleteRentalCarAsync(licencePlate);
        return status == RentalCarChangeStatus.Updated
            ? NoContent()
            : await MapChangeStatus(status);
    }

    private async Task<IActionResult> MapChangeStatus(RentalCarChangeStatus status)
    {
        return status switch
        {
            RentalCarChangeStatus.Updated => Ok(
                await _rentalService.GetRentalCarAsync(
                    RouteData.Values["licencePlate"]?.ToString() ?? string.Empty)),
            RentalCarChangeStatus.NotFound => NotFound(),
            RentalCarChangeStatus.AlreadyExists => Conflict(new
            {
                Message = "A rental car with this licence plate already exists."
            }),
            RentalCarChangeStatus.HasReservations => Conflict(new
            {
                Message = "A rental car with reservation history cannot be deleted."
            }),
            RentalCarChangeStatus.BranchNotFound => NotFound("Branch not found."),
            RentalCarChangeStatus.Invalid => BadRequest("The vehicle data is invalid."),
            RentalCarChangeStatus.EmptyUpdate => BadRequest(
                "At least one vehicle field must be provided."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
