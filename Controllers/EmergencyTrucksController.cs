using CSMS.Dto;
using CSMS.service.Truck_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("emergency-trucks")]
[Authorize(Roles = "admin")]
public class EmergencyTrucksController : ControllerBase
{
    private readonly IEmergencyTruckService _itruckService;
    public EmergencyTrucksController(IEmergencyTruckService truckService)
    {
        _itruckService = truckService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrucks([FromQuery] EmergencyTruckQueryDto query)
    {
        return Ok(new { Data = await _itruckService.GetTrucksAsync(query) });
    }

    [HttpPost]
    public async Task<IActionResult> CreateTruck([FromBody] CreateEmergencyTruckDto dto)
    {
        var result = await _itruckService   .CreateAsync(dto);
        return result.Status switch
        {
            TruckCreateStatus.Created => StatusCode(StatusCodes.Status201Created, result.Truck),
            TruckCreateStatus.LicencePlateAlreadyExists => Conflict(new
            {
                Message = "A truck with this licence plate already exists."
            }),
            TruckCreateStatus.InvalidManufactureDate => BadRequest(new
            {
                Message = "ManufactureDate must be a valid date that is not in the future."
            }),
            TruckCreateStatus.BranchNotFound => NotFound(new { Message = "Branch not found." }),
            TruckCreateStatus.DriverNotFound => NotFound(new { Message = "Driver not found." }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPut("{licencePlate}")]
    public async Task<IActionResult> UpdateTruck(
        string licencePlate,
        [FromBody] UpdateEmergencyTruckDto dto)
    {
        if (dto.TruckCompany is null &&
            dto.TruckModel is null &&
            dto.IsAvailable is null &&
            dto.StartDate is null &&
            dto.ManufactureDate is null &&
            dto.BranchId is null &&
            dto.DriverId is null)
        {
            return BadRequest(new { Message = "At least one truck field must be provided." });
        }

        var result = await _itruckService.UpdateAsync(licencePlate, dto);
        return result.Status switch
        {
            TruckUpdateStatus.Updated => Ok(result.Truck),
            TruckUpdateStatus.NotFound => NotFound(),
            TruckUpdateStatus.InvalidManufactureDate => BadRequest(new
            {
                Message = "ManufactureDate must be a valid date that is not in the future."
            }),
            TruckUpdateStatus.BranchNotFound => NotFound(new { Message = "Branch not found." }),
            TruckUpdateStatus.DriverNotFound => NotFound(new { Message = "Driver not found." }),
            TruckUpdateStatus.InUse => Conflict(new
            {
                Message = "The truck is assigned to an active emergency request."
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpDelete("{licencePlate}")]
    public async Task<IActionResult> DeleteTruck(string licencePlate)
    {
        var status = await _itruckService.DeleteAsync(licencePlate);
        return status switch
        {
            TruckDeleteStatus.Deleted => NoContent(),
            TruckDeleteStatus.NotFound => NotFound(),
            TruckDeleteStatus.HasRequests => Conflict(new
            {
                Message = "The truck cannot be deleted because it has emergency requests."
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
