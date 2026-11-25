using System.Security.Claims;
using CSMS.Dto;
using CSMS.Helper;
using CSMS.service.Emergency_serv;
using CSMS.ViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

// The driver is always identified from the JWT; there is no driverId parameter anywhere.
[ApiController]
[Route("api/v1/driver/emergency-requests")]
[Authorize(Roles = "driver")]
public class DriverEmergencyRequestsController : ControllerBase
{
    private readonly EmergencyService _emergencyService;

    public DriverEmergencyRequestsController(EmergencyService emergencyService)
    {
        _emergencyService = emergencyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetEmergencyRequests(
        [FromQuery] DriverEmergencyRequestListQueryDto query)
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

        return Ok(await _emergencyService.GetDriverRequestsAsync(
            userId, query, query.Assigned, query.BranchId));
    }

    [HttpGet("assigned")]
    public async Task<IActionResult> GetAssignedEmergencyRequests(
        [FromQuery] EmergencyRequestListQueryDto query)
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

        return Ok(await _emergencyService.GetDriverRequestsAsync(userId, query, true, null));
    }

    [HttpGet("{emergencyRequestId:int}")]
    public async Task<IActionResult> GetEmergencyRequest(int emergencyRequestId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var request = await _emergencyService.GetDriverRequestAsync(emergencyRequestId, userId);
        return request is null ? NotFound() : Ok(request);
    }

    [HttpPost("{emergencyRequestId:int}/accept")]
    public async Task<IActionResult> AcceptEmergencyRequest(
        int emergencyRequestId,
        [FromBody] AcceptEmergencyDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _emergencyService.AcceptAsync(
            emergencyRequestId, userId, dto.TruckLicencePlate);
        return result.ToActionResult(this, request => Ok(new
        {
            RequestId = request.EmergencyRequestId,
            request.Status,
            DriverId = request.Driver?.DriverId,
            TruckLicencePlate = request.Truck?.LicencePlate
        }));
    }

    [HttpPut("{emergencyRequestId:int}/status")]
    public async Task<IActionResult> UpdateEmergencyStatus(
        int emergencyRequestId,
        [FromBody] UpdateEmergencyStatusDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        // isAdmin is false on purpose: here only the assigned driver may change the status.
        var result = await _emergencyService.UpdateStatusAsync(
            emergencyRequestId, userId, false, dto);
        return result.ToActionResult(this, request => Ok(new
        {
            RequestId = request.EmergencyRequestId,
            request.Status,
            // The live location is hidden once the job is over, so echo what the driver just sent.
            DriverLocation = request.DriverLocation ?? (dto.Latitude.HasValue
                ? new LocationViewModel
                {
                    Latitude = dto.Latitude.Value,
                    Longitude = dto.Longitude!.Value
                }
                : null),
            UpdatedAt = request.UpdatedAt
        }));
    }
}
