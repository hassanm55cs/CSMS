using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Car_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("cars")]
[Authorize]
public class CarsController : ControllerBase
{
    private readonly CarService _carService;

    public CarsController(CarService carService)
    {
        _carService = carService;
    }

    [HttpGet]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> GetCars([FromQuery] CarListQueryDto query)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var cars = await _carService.GetCustomerCarsAsync(userId, query);
        return cars is null ? NotFound() : Ok(cars);
    }

    [HttpGet("{licencePlate}")]
    [Authorize(Roles = "customer,employee,admin")]
    public async Task<IActionResult> GetCarByPlate(string licencePlate)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var car = await _carService.GetCarAsync(
            licencePlate,
            userId,
            User.IsInRole("employee") || User.IsInRole("admin"));
        return car is null ? NotFound() : Ok(car);
    }

    [HttpPost("/Add-Car")]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> AddCar([FromBody] CreateCarDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _carService.AddCarAsync(userId, dto);
        return result.Status switch
        {
            CarCreateStatus.Created => CreatedAtAction(
                nameof(GetCarByPlate),
                new { licencePlate = result.Car!.LicencePlate },
                new
                {
                    result.Car.LicencePlate,
                    CustomerId = result.CustomerId,
                    Message = "Car added successfully."
                }),
            CarCreateStatus.CustomerNotFound => NotFound("Customer profile not found."),
            CarCreateStatus.LicencePlateAlreadyExists => Conflict(new
            {
                Message = "A car with this licence plate already exists."
            }),
            CarCreateStatus.InvalidManufactureDate => BadRequest(new
            {
                Message = "ManufactureDate must be a valid date that is not in the future."
            }),
            CarCreateStatus.Invalid => BadRequest(new
            {
                Message = "Fuel type is invalid.or engien type is invalid"
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPut("{licencePlate}")]
    [Authorize(Roles = "customer,employee,admin")]
    public async Task<IActionResult> UpdateCar(
        string licencePlate,
        [FromBody] UpdateCarDto dto)
    {
        if (dto.Color is null &&
            dto.NoOfCylinders is null &&
            dto.FuelType is null &&
            dto.EngineType is null &&
            dto.ManufactureDate is null &&
            dto.CarCompany is null &&
            dto.Model is null &&
            dto.PriceInEgp is null &&
            dto.CurrentKm is null)
        {
            return BadRequest("At least one car field must be provided.");
        }

        if (dto.ManufactureDate.HasValue &&
            (dto.ManufactureDate.Value == default ||
             dto.ManufactureDate.Value > DateOnly.FromDateTime(DateTime.UtcNow)))
        {
            return BadRequest("ManufactureDate must be a valid date that is not in the future.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var car = await _carService.UpdateCarAsync(
            licencePlate,
            userId,
            User.IsInRole("employee") || User.IsInRole("admin"),
            dto);
        return car is null ? NotFound() : Ok(car);
    }

    [HttpDelete("{licencePlate}")]
    [Authorize(Roles = "customer,admin")]
    public async Task<IActionResult> DeleteCar(string licencePlate)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var status = await _carService.DeleteCarAsync(
            licencePlate,
            userId,
            User.IsInRole("admin"));
        return status switch
        {
            CarDeleteStatus.Deleted => NoContent(),
            CarDeleteStatus.NotFound => NotFound(),
            CarDeleteStatus.Forbidden => Forbid(),
            CarDeleteStatus.HasLinkedRecords => Conflict(new
            {
                Message = "The car cannot be deleted while it has visits, emergency requests, or active services."
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
