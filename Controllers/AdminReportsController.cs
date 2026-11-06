using CSMS.Dto;
using CSMS.service.Admin_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("admin")]
[Authorize(Roles = "admin")]
public class AdminReportsController : ControllerBase
{
    private readonly AdminReportsService _reportsService;

    public AdminReportsController(AdminReportsService reportsService)
    {
        _reportsService = reportsService;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] ReportQueryDto query)
    {
        if (!IsValidRange(query.FromDate, query.ToDate) ||
            query.BranchId.HasValue &&
            !await BranchExistsAsync(query.BranchId.Value))
        {
            return BadRequest("The date range or branch filter is invalid.");
        }

        return Ok(await _reportsService.GetDashboardAsync(query));
    }

    [HttpGet("reports/revenue")]
    public async Task<IActionResult> GetRevenue([FromQuery] RevenueReportQueryDto query)
    {
        if (!IsValidRange(query.FromDate, query.ToDate) ||
            query.BranchId.HasValue &&
            !await BranchExistsAsync(query.BranchId.Value))
        {
            return BadRequest("The date range or branch filter is invalid.");
        }

        return Ok(new { Data = await _reportsService.GetRevenueReportAsync(query) });
    }

    [HttpGet("reports/fleet-utilization")]
    public async Task<IActionResult> GetFleetUtilization()
    {
        return Ok(await _reportsService.GetFleetUtilizationAsync());
    }

    [HttpGet("reports/branches")]
    public async Task<IActionResult> GetBranches([FromQuery] ReportQueryDto query)
    {
        if (!IsValidRange(query.FromDate, query.ToDate))
        {
            return BadRequest("FromDate must not be after ToDate.");
        }

        return Ok(new { Data = await _reportsService.GetBranchReportAsync(query) });
    }

    private Task<bool> BranchExistsAsync(int branchId)
    {
        return _reportsService.BranchExistsAsync(branchId);
    }

    private static bool IsValidRange(DateOnly? fromDate, DateOnly? toDate)
    {
        return !fromDate.HasValue || !toDate.HasValue || toDate.Value >= fromDate.Value;
    }
}
