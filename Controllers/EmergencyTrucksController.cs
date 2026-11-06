using CSMS.Dto;
using CSMS.service.Fleet_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("emergency-trucks")]
[Authorize(Roles = "admin")]
public class EmergencyTrucksController : ControllerBase
{
    private readonly EmergencyTruckService _truckService;

    public EmergencyTrucksController(EmergencyTruckService truckService)
    {
        _truckService = truckService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrucks([FromQuery] EmergencyTruckListQueryDto query)
    {
        return Ok(await _truckService.GetTrucksAsync(query));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTruck([FromBody] CreateEmergencyTruckDto dto)
    {
        var status = await _truckService.CreateTruckAsync(dto);
        if (status != EmergencyTruckOperationStatus.Updated)
        {
            return MapStatus(status);
        }

        var truck = await _truckService.GetTruckAsync(dto.LicencePlate);
        return Created("/emergency-trucks", truck);
    }

    [HttpPut("{licencePlate}")]
    public async Task<IActionResult> UpdateTruck(
        string licencePlate,
        [FromBody] UpdateEmergencyTruckDto dto)
    {
        var status = await _truckService.UpdateTruckAsync(licencePlate, dto);
        return status == EmergencyTruckOperationStatus.Updated
            ? Ok(await _truckService.GetTruckAsync(licencePlate))
            : MapStatus(status);
    }

    [HttpDelete("{licencePlate}")]
    public async Task<IActionResult> DeleteTruck(string licencePlate)
    {
        var status = await _truckService.DeleteTruckAsync(licencePlate);
        return status == EmergencyTruckOperationStatus.Updated
            ? NoContent()
            : MapStatus(status);
    }

    private IActionResult MapStatus(EmergencyTruckOperationStatus status)
    {
        return status switch
        {
            EmergencyTruckOperationStatus.NotFound => NotFound(),
            EmergencyTruckOperationStatus.AlreadyExists => Conflict(
                "An emergency truck with this licence plate already exists."),
            EmergencyTruckOperationStatus.RelatedEntityNotFound => NotFound(
                "The driver or branch was not found."),
            EmergencyTruckOperationStatus.DriverUnavailable => Conflict(
                "The driver must be available."),
            EmergencyTruckOperationStatus.BranchMismatch => Conflict(
                "The driver and truck must belong to the same branch."),
            EmergencyTruckOperationStatus.HasActiveAssignment => Conflict(
                "The truck cannot be changed while it is assigned to an active request."),
            EmergencyTruckOperationStatus.HasHistory => Conflict(
                "A truck with emergency request history cannot be deleted."),
            EmergencyTruckOperationStatus.Invalid => BadRequest(
                "The truck dates or fields are invalid."),
            EmergencyTruckOperationStatus.EmptyUpdate => BadRequest(
                "At least one truck field must be provided."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
