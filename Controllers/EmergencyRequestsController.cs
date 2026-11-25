using System.Security.Claims;
using CSMS.Dto;
using CSMS.Helper;
using CSMS.service.Emergency_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("emergency-requests")]
[Authorize]
public class EmergencyRequestsController : ControllerBase
{
    private readonly IEmergencyService _iemergencyService;

    public EmergencyRequestsController(IEmergencyService emergencyService)
    {
        _iemergencyService = emergencyService;
    }

    [HttpPost]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> CreateEmergencyRequest([FromBody] CreateEmergencyRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _iemergencyService.CreateRequestAsync(userId, dto);
        return result.ToActionResult(this, request => CreatedAtAction(
            nameof(GetEmergencyRequest),
            new { emergencyRequestId = request.EmergencyRequestId },
            request));
    }

    [HttpGet]
    [Authorize(Roles = "customer")]
    public async Task<IActionResult> GetMyEmergencyRequests([FromQuery] EmergencyRequestListQueryDto query)
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

        return Ok(await _iemergencyService.GetMyRequestsAsync(userId, query));
    }

    [HttpGet("{emergencyRequestId:int}")]
    [Authorize(Roles = "customer,driver,admin")]
    public async Task<IActionResult> GetEmergencyRequest(int emergencyRequestId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var request = await _iemergencyService.GetRequestAsync(
            emergencyRequestId,
            userId,
            User.IsInRole("admin"));
        return request is null ? NotFound() : Ok(request);
    }

    [HttpPut("{emergencyRequestId:int}/assignment")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AssignEmergencyRequest(
        int emergencyRequestId,
        [FromBody] AssignEmergencyDto dto)
    {
        var result = await _iemergencyService.AssignAsync(emergencyRequestId, dto);
        return result.ToActionResult(this, request => Ok(request));
    }

    [HttpPut("{emergencyRequestId:int}/status")]
    [Authorize(Roles = "driver,admin")]
    public async Task<IActionResult> UpdateEmergencyStatus(
        int emergencyRequestId,
        [FromBody] UpdateEmergencyStatusDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _iemergencyService.UpdateStatusAsync(
            emergencyRequestId,
            userId,
            User.IsInRole("admin"),
            dto);
        return result.ToActionResult(this, request => Ok(request));
    }

    [HttpPost("{emergencyRequestId:int}/cancel")]
    [Authorize(Roles = "customer,driver,admin")]
    public async Task<IActionResult> CancelEmergencyRequest(
        int emergencyRequestId,
        [FromBody] CancelDto? dto = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _iemergencyService.CancelAsync(
            emergencyRequestId,
            userId,
            User.IsInRole("admin"),
            dto?.Reason);
        return result.ToActionResult(this, request => Ok(request));
    }
}
