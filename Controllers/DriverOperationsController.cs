using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Driver_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("drivers")]
public class DriverOperationsController : ControllerBase
{
    private readonly DriverOperationsService _driverService;

    public DriverOperationsController(DriverOperationsService driverService)
    {
        _driverService = driverService;
    }

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDrivers([FromQuery] DriverListQueryDto query)
    {
        return Ok(await _driverService.GetDriversAsync(query));
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateDriver([FromBody] CreateDriverAccountDto dto)
    {
        var result = await _driverService.CreateDriverAsync(dto);
        return result.Status switch
        {
            DriverOperationStatus.Created => Created("/drivers", result.Driver),
            DriverOperationStatus.BranchNotFound => NotFound("Branch not found."),
            DriverOperationStatus.InvalidInput => BadRequest(new { Errors = result.Errors }),
            DriverOperationStatus.RegistrationFailed => BadRequest(new { Errors = result.Errors }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPut("me/location")]
    [Authorize(Roles = "driver")]
    public async Task<IActionResult> UpdateMyLocation([FromBody] UpdateDriverLocationDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _driverService.UpdateLocationAsync(userId, dto);
        return result.Status switch
        {
            DriverOperationStatus.Updated => Ok(new
            {
                result.Driver!.DriverId,
                result.Driver.Latitude,
                result.Driver.Longitude,
                result.Driver.IsAvailable
            }),
            DriverOperationStatus.NotFound => NotFound("Driver profile not found."),
            DriverOperationStatus.DriverHasActiveRequest => Conflict(
                "A driver with an active emergency request cannot become available."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
