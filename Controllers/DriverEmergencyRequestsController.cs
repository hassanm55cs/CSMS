using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Emergency_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("driver/emergency-requests")]
[Authorize(Roles = "driver")]
public class DriverEmergencyRequestsController : ControllerBase
{
    private readonly EmergencyService _emergencyService;

    public DriverEmergencyRequestsController(EmergencyService emergencyService)
    {
        _emergencyService = emergencyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRequests(
        [FromQuery] EmergencyRequestListQueryDto query)
    {
        if (!EmergencyService.IsValidDateRange(query.FromDate, query.ToDate))
        {
            return BadRequest("FromDate must not be after ToDate.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await _emergencyService.GetDriverRequestsAsync(userId, query, false));
    }

    [HttpGet("{emergencyRequestId:int}")]
    public async Task<IActionResult> GetRequest(int emergencyRequestId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var request = await _emergencyService.GetEmergencyRequestAsync(
            emergencyRequestId,
            userId,
            false,
            true);
        return request is null ? NotFound() : Ok(request);
    }

    [HttpPost("{emergencyRequestId:int}/accept")]
    public async Task<IActionResult> AcceptRequest(
        int emergencyRequestId,
        [FromBody] AcceptEmergencyRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _emergencyService.AcceptRequestAsync(
            emergencyRequestId,
            userId,
            dto.TruckLicencePlate);
        return result.Status switch
        {
            EmergencyOperationStatus.Updated => Ok(new
            {
                result.Request!.EmergencyRequestId,
                result.Request.Status,
                result.Request.DriverId,
                result.Request.TruckLicencePlate
            }),
            EmergencyOperationStatus.NotFound => NotFound(),
            EmergencyOperationStatus.DriverNotFound => NotFound("Driver profile not found."),
            EmergencyOperationStatus.AssigneeNotFound => NotFound(
                "The truck is not assigned to this driver."),
            EmergencyOperationStatus.AssigneeUnavailable => Conflict(
                "The driver or truck is not available."),
            EmergencyOperationStatus.BranchMismatch => Conflict(
                "The driver and truck must belong to the same branch."),
            EmergencyOperationStatus.InvalidStatus => Conflict(
                "Only a requested emergency can be accepted."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPut("{emergencyRequestId:int}/status")]
    public async Task<IActionResult> UpdateStatus(
        int emergencyRequestId,
        [FromBody] UpdateEmergencyRequestStatusDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _emergencyService.UpdateStatusAsync(
            emergencyRequestId,
            userId,
            false,
            dto);
        return result.Status switch
        {
            EmergencyOperationStatus.Updated => Ok(new
            {
                result.Request!.EmergencyRequestId,
                result.Request.Status,
                DriverLatitude = result.Request.DriverLatitude,
                DriverLongitude = result.Request.DriverLongitude,
                result.Request.UpdatedAt
            }),
            EmergencyOperationStatus.NotFound => NotFound(),
            EmergencyOperationStatus.InvalidCoordinates => BadRequest(
                "Latitude and longitude must be provided together."),
            EmergencyOperationStatus.InvalidStatus => Conflict(
                "The requested emergency status transition is not allowed."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpGet("assigned")]
    public async Task<IActionResult> GetAssignedRequests(
        [FromQuery] EmergencyRequestListQueryDto query)
    {
        if (!EmergencyService.IsValidDateRange(query.FromDate, query.ToDate))
        {
            return BadRequest("FromDate must not be after ToDate.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await _emergencyService.GetDriverRequestsAsync(userId, query, true));
    }
}
