using CSMS.Dto;
using CSMS.service.Adminserv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CSMS.Controllers
{
    [Route("/Admin-Actions")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _iadminService;
        private string? Owner =>
         User.FindFirstValue(ClaimTypes.NameIdentifier);

        public AdminController(IAdminService adminService)
        {
            _iadminService = adminService;
        }
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] AdminDashboardQueryDto query)
        {
            if (HasInvalidRange(query))
            {
                return BadRequest(new { Message = "FromDate must not be after ToDate." });
            }

            return Ok(await _iadminService.GetDashboardAsync(query));
        }
        [HttpGet("reports/revenue")]
        public async Task<IActionResult> GetRevenueReport([FromQuery] RevenueReportQueryDto query)
        {
            if (HasInvalidRange(query))
            {
                return BadRequest(new { Message = "FromDate must not be after ToDate." });
            }

            return Ok(new { Data = await _iadminService.GetRevenueReportAsync(query) });
        }
        [HttpGet("reports/fleet-utilization")]
        public async Task<IActionResult> GetFleetUtilization()
        {
            return Ok(await _iadminService.GetFleetUtilizationAsync());
        }
        [HttpGet("reports/branches")]
        public async Task<IActionResult> GetBranchReport([FromQuery] AdminDateRangeQueryDto query)
        {
            if (HasInvalidRange(query))
            {
                return BadRequest(new { Message = "FromDate must not be after ToDate." });
            }

            return Ok(new { Data = await _iadminService.GetBranchReportAsync(query) });
        }
        [HttpGet("Get-Emergenct-Request-Details/{emergencyId:int}")]
        public async Task<IActionResult> GetRequestAsync([FromRoute]int emergencyId)
        {
            var request = await _iadminService.GetRequestsDetailsAsync(emergencyId);
            if(request == null)
            {
                return NotFound();
            }
            return Ok(request);

        }
        [HttpGet("emergency-requests")]
        public async Task<IActionResult> GetEmergencyRequests([FromQuery] EmergencyRequestListQueryDto query)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            if (query.FromDate.HasValue && query.ToDate.HasValue && query.FromDate > query.ToDate)
            {
                return BadRequest(new { Message = "FromDate must not be after ToDate." });
            }

            return Ok(await _iadminService.GetEmergencyRequestsAsync(query));
        }
        private static bool HasInvalidRange(AdminDateRangeQueryDto query)
        {
            return query.FromDate.HasValue && query.ToDate.HasValue && query.FromDate > query.ToDate;
        }

    }
}
