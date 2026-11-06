using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Emergency_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace CSMS.Controllers;

[ApiController]
[Route("emergency-requests")]
[Authorize]
public class EmergencyRequestsController : ControllerBase
{
    private readonly EmergencyService _emergencyService;

    public EmergencyRequestsController(EmergencyService emergencyService)
    {
        _emergencyService = emergencyService;
    }

    [HttpPost]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateEmergencyRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _emergencyService.CreateRequestAsync(userId, dto);
        return result.Status switch
        {
            EmergencyOperationStatus.Created => CreatedAtAction(
                nameof(GetRequest),
                new { emergencyRequestId = result.Request!.EmergencyRequestId },
                result.Request),
            EmergencyOperationStatus.CustomerNotFound => NotFound("Customer profile not found."),
            EmergencyOperationStatus.CarNotFound => NotFound("The car was not found for this customer."),
            EmergencyOperationStatus.ActiveRequestExists => Conflict(
                "This car already has an active emergency request."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpGet]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> GetCustomerRequests(
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

        return Ok(await _emergencyService.GetCustomerRequestsAsync(userId, query));
    }

    [HttpGet("{emergencyRequestId:int}")]
    [Authorize(Roles = "customer,driver,admin")]
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
            User.IsInRole("admin"),
            false);
        return request is null ? NotFound() : Ok(request);
    }

    [HttpPut("{emergencyRequestId:int}/assignment")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AssignRequest(
        int emergencyRequestId,
        [FromBody] AssignEmergencyRequestDto dto)
    {
        var result = await _emergencyService.AssignRequestAsync(emergencyRequestId, dto);
        return result.Status switch
        {
            EmergencyOperationStatus.Updated => Ok(result.Request),
            EmergencyOperationStatus.NotFound => NotFound(),
            EmergencyOperationStatus.AssigneeNotFound => NotFound(
                "Driver or emergency truck was not found."),
            EmergencyOperationStatus.AssigneeUnavailable => Conflict(
                "The driver or truck is not available."),
            EmergencyOperationStatus.BranchMismatch => Conflict(
                "The driver and truck must belong to the same branch."),
            EmergencyOperationStatus.InvalidStatus => Conflict(
                "Only a requested emergency can be assigned."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPut("{emergencyRequestId:int}/status")]
    [Authorize(Roles = "driver,admin")]
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
            User.IsInRole("admin"),
            dto);
        return result.Status switch
        {
            EmergencyOperationStatus.Updated => Ok(result.Request),
            EmergencyOperationStatus.NotFound => NotFound(),
            EmergencyOperationStatus.InvalidCoordinates => BadRequest(
                "Latitude and longitude must be provided together."),
            EmergencyOperationStatus.InvalidStatus => Conflict(
                "The requested emergency status transition is not allowed."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    [HttpPost("{emergencyRequestId:int}/cancel")]
    [Authorize(Roles = "customer,driver,admin")]
    public async Task<IActionResult> CancelRequest(
        int emergencyRequestId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelRequestDto? dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _emergencyService.CancelRequestAsync(
            emergencyRequestId,
            userId,
            User.IsInRole("admin"),
            dto?.Reason);
        return result.Status switch
        {
            EmergencyOperationStatus.Updated => Ok(result.Request),
            EmergencyOperationStatus.NotFound => NotFound(),
            EmergencyOperationStatus.InvalidStatus => Conflict(
                "Only an active emergency request can be cancelled."),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
