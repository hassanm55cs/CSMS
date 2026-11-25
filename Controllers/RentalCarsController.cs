using CSMS.Dto;
using CSMS.service.Rental_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("rental-cars")]
public class RentalCarsController : ControllerBase
{
    private readonly IRentalCarService _irentalCarService;

    public RentalCarsController(IRentalCarService rentalCarService)
    {
        _irentalCarService = rentalCarService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetRentalCars([FromQuery] RentalCarListQueryDto query)
    {
        if (query.FromDate.HasValue && query.ToDate.HasValue && query.FromDate > query.ToDate)
        {
            return BadRequest(new { Message = "FromDate must not be after ToDate." });
        }

        if (query.MinPrice.HasValue && query.MaxPrice.HasValue && query.MinPrice > query.MaxPrice)
        {
            return BadRequest(new { Message = "MinPrice must not be greater than MaxPrice." });
        }

        return Ok(await _irentalCarService.GetRentalCarsAsync(query));
    }

    [HttpGet("{licencePlate}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRentalCar(string licencePlate,[FromQuery] RentalCarAvailabilityQueryDto query)
    {
        if (query.FromDate.HasValue && query.ToDate.HasValue && query.FromDate > query.ToDate)
        {
            return BadRequest(new { Message = "FromDate must not be after ToDate." });
        }

        var car = await _irentalCarService.GetRentalCarAsync(licencePlate, query);
        return car is null ? NotFound() : Ok(car);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateRentalCar([FromBody] CreateRentalCarDto dto)
    {//how this will works with the fornt end 
        var result = await _irentalCarService.CreateAsync(dto);
        return result.Status switch
        {
            RentalCarCreateStatus.Created => CreatedAtAction(
                nameof(GetRentalCar),
                new { licencePlate = result.Car!.LicencePlate },
                result.Car),
            RentalCarCreateStatus.LicencePlateAlreadyExists => Conflict(new
            {
                Message = "A rental car with this licence plate already exists."
            }),
            RentalCarCreateStatus.InvalidManufactureDate => BadRequest(new
            {
                Message = "ManufactureDate must be a valid date that is not in the future."
            }),
            RentalCarCreateStatus.InvalidEnum => BadRequest(new
            {
                Message = "FuelType must be Gasoline, Diesel, Electric or Hybrid, and EngineType must be Turbocharged, NaturallyAspirated or Supercharged."
            }),
            RentalCarCreateStatus.BranchNotFound => NotFound(new { Message = "Branch not found." }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPut("{licencePlate}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateRentalCar(
        string licencePlate,
        [FromBody] UpdateRentalCarDto dto)
    {
        if (dto.Color is null &&
            dto.NoOfCylinders is null &&
            dto.FuelType is null &&
            dto.EngineType is null &&
            dto.ManufactureDate is null &&
            dto.CarCompany is null &&
            dto.Model is null &&
            dto.PricePerDay is null &&
            dto.Status is null &&
            dto.BranchId is null)
        {
            return BadRequest(new { Message = "At least one vehicle field must be provided." });
        }

        var result = await _irentalCarService.UpdateAsync(licencePlate, dto);
        return result.Status switch
        {
            RentalCarUpdateStatus.Updated => Ok(result.Car),
            RentalCarUpdateStatus.NotFound => NotFound(),
            RentalCarUpdateStatus.InvalidManufactureDate => BadRequest(new
            {
                Message = "ManufactureDate must be a valid date that is not in the future."
            }),
            RentalCarUpdateStatus.InvalidEnum => BadRequest(new
            {
                Message = "FuelType, EngineType or Status is invalid. Status must be Available or Maintenance."
            }),
            RentalCarUpdateStatus.BranchNotFound => NotFound(new { Message = "Branch not found." }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpDelete("{licencePlate}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteRentalCar(string licencePlate)
    {
        var status = await _irentalCarService.DeleteAsync(licencePlate);
        return status switch
        {
            RentalCarDeleteStatus.Deleted => NoContent(),
            RentalCarDeleteStatus.NotFound => NotFound(),
            RentalCarDeleteStatus.HasReservations => Conflict(new
            {
                Message = "The vehicle cannot be deleted because it has reservations."
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
