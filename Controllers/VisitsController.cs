using CSMS.Dto.Visit;
using CSMS.service.Visits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CSMS.Controllers
{
    /// <summary>
    /// Staff-facing visit management endpoints.
    /// No auth enforcement — authentication will be added in a later phase.
    /// </summary>
    [ApiController]
    [Route("/visits")]
    public class VisitsController : ControllerBase
    {
       
        private readonly IVisitService _visitService;
        private string? Owner =>
        User.FindFirstValue(ClaimTypes.NameIdentifier);

        public VisitsController(IVisitService visitService)
        {
            _visitService = visitService;
          
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/visits
        // ══════════════════════════════════════════════════════════════
        /// <summary>Returns a paginated list of visits, optionally filtered by branch, status, and date range.</summary>
        [HttpGet("Get-Visits-Employee"),Authorize(Roles ="employee")]
        public async Task<IActionResult> GetVisits(
            [FromQuery] string?  status    = null,
            [FromQuery] DateOnly? fromDate = null,
            [FromQuery] DateOnly? toDate   = null,
            [FromQuery] int      page      = 1,
            [FromQuery] int      pageSize  = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;
            if(Owner is null)
            {
                return Unauthorized();
            }

            var result = await _visitService.GetVisitsAsync(
                Owner, status, fromDate, toDate, page, pageSize);

            return Ok(result);
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/visits/{visitId}/assignment
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Assigns an employee to a visit.
        /// The employee must belong to the same branch as the visit.
        /// </summary>
        [HttpPut("{visitId:int}/assignment"),Authorize(Roles ="employee")]
        public async Task<IActionResult> AssignEmployee(int visitId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _visitService.AssignEmployeeAsync(Owner, visitId);
                if (result is null)
                    return NotFound(new { message = $"Visit with id {visitId} was not found." });

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "Employee id references a non-existent employee.", detail = inner });

                return StatusCode(500, new { message = "A database error occurred while assigning the employee.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/visits/{visitId}/status
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Updates the status of a visit.
        /// Valid status strings: Requested, UnderDiagnosis, PendingCustomerConfirmation,
        /// Approved, Rejected, InProgress, Completed.
        /// </summary>
        [HttpPut("{visitId:int}/status"),Authorize(Roles ="employee,customer")]
        public async Task<IActionResult> UpdateStatus(int visitId, [FromBody] StatusUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _visitService.UpdateStatusAsync(visitId, dto);
                if (result is null)
                    return NotFound(new { message = $"Visit with id {visitId} was not found." });

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while updating the status.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/visits/{visitId}/diagnosis
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Submits a diagnosis for a visit (sets status to UnderDiagnosis).
        /// <para>
        /// <b>Limitation</b>: <c>Service.ProductId</c> is non-nullable in the DB schema.
        /// Diagnosis items without a <c>productId</c> are skipped; <c>skippedItemCount</c>
        /// in the response reports how many were omitted.
        /// </para>
        /// </summary>
        [HttpPut("{visitId:int}/diagnosis"),Authorize(Roles ="employee")]
        public async Task<IActionResult> SubmitDiagnosis(int visitId, [FromBody] DiagnosisDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if (Owner is null)
                return Unauthorized(new { message = "User is not authenticated." });

            try
            {
                var result = await _visitService.SubmitDiagnosisAsync(Owner,visitId, dto);
                if (result is null)
                    return NotFound(new { message = $"Visit with id {visitId} was not found." });

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "One or more productIds reference non-existent products.", detail = inner });

                return StatusCode(500, new { message = "A database error occurred while submitting the diagnosis.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/visits/{visitId}/customer-confirmation
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Processes customer approval/rejection of diagnosed service items.
        /// Sets Visit.Status to Approved if any item is approved, otherwise PendingCustomerConfirmation.
        /// </summary>
        [HttpPut("{visitId:int}/customer-confirmation"),Authorize(Roles ="customer")]
        public async Task<IActionResult> CustomerConfirmation(
            int visitId, [FromBody] CustomerConfirmationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if(Owner is null)
                return Unauthorized(new { message = "User is not authenticated." });

            try
            {
                var result = await _visitService.ProcessCustomerConfirmationAsync(Owner,visitId, dto);
                if (result is null)
                    return NotFound(new { message = $"Visit with id {visitId} was not found." });

                return Ok(result);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while processing customer confirmation.", detail = inner });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch(Exception)
            {
                return BadRequest("Error was returned");
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/visits/{visitId}/complete
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Completes a visit: updates the car's current km, marks specified services as done,
        /// and sets Visit.Status to Completed.
        /// </summary>
        [HttpPut("{visitId:int}/complete"),Authorize(Roles ="employee")]
        public async Task<IActionResult> CompleteVisit(int visitId, [FromBody] CompletionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _visitService.CompleteVisitAsync(visitId, dto);
                if (result is null)
                    return NotFound(new { message = $"Visit with id {visitId} was not found." });

                return Ok(result);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while completing the visit.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/visits/{visitId}/services
        // ══════════════════════════════════════════════════════════════
        /// <summary>Returns all service/repair items for a specific visit.</summary>
        [HttpGet("{visitId:int}/services"),Authorize(Roles ="employee,customer")]
        public async Task<IActionResult> GetServices(int visitId)
        {//this is for both the link the customer will use to see all service the emp has sent and the reverse for the emp and the customer has approved or not 
            var services = await _visitService.GetServicesAsync(visitId);
            if (services is null)
                return NotFound(new { message = $"Visit with id {visitId} was not found." });

            return Ok(services);
        }
     
    }
}
