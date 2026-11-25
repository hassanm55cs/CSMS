using CSMS.Dto.Visit;
using CSMS.Models;
using CSMS.service.Visits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CSMS.Controllers
{
    /// <summary>
    /// Customer-facing booking endpoints.
    /// No auth enforcement — authentication will be added in a later phase.
    /// </summary>
    [ApiController]
    [Route("/bookings")]
    [Authorize(Roles ="customer")]
    public  class BookingsController : ControllerBase
    {
        private readonly IVisitService _visitService;

        private string? Owner =>
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        public BookingsController(IVisitService visitService)
        {
            _visitService = visitService;
        }
     
        // ══════════════════════════════════════════════════════════════
        // POST /api/v1/bookings
        // ══════════════════════════════════════════════════════════════
        /// <summary>Creates a new booking (visit) with Status = Requested.</summary>
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] BookingRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            if (Owner is null)
                return Unauthorized(new { message = "User is not authenticated." });

            try
            {
                var result = await _visitService.CreateBookingAsync(Owner,dto);
                return CreatedAtAction(
                    nameof(GetBookingById),
                    new { visitId = result.VisitId },
                    result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "One or more referenced entities were not found.", detail = inner });

                return StatusCode(500, new { message = "A database error occurred while creating the booking.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/bookings
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Returns a paged list of bookings for a customer.
        /// <para><b>customerId</b> is required (auth is deferred — will be derived from token later).</para>
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetBookings(
            [FromQuery] string? status         = null,
            [FromQuery] DateOnly? fromDate     = null,
            [FromQuery] DateOnly? toDate       = null,
            [FromQuery] string? carLicencePlate = null,
            [FromQuery] int    page            = 1,
            [FromQuery] int    pageSize        = 10)
        {
         

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;
            if(Owner is null)
                return Unauthorized(new { message = "User is not authenticated." });

            var result = await _visitService.GetBookingsAsync(
                Owner, status, fromDate, toDate, carLicencePlate, page, pageSize);

            return Ok(result);
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/bookings/{visitId}
        // ══════════════════════════════════════════════════════════════
        /// <summary>Returns the full details of a single booking.</summary>
        [HttpGet("{visitId:int}")]
        public async Task<IActionResult> GetBookingById(int visitId)
        {
            if(Owner is null)
                return Unauthorized(new { message = "User is not authenticated." });
            var detail = await _visitService.GetBookingDetailAsync(Owner,visitId);
            if (detail is null)
                return NotFound(new { message = $"Booking with visitId {visitId} was not found." });

            return Ok(detail);
        }

        // ══════════════════════════════════════════════════════════════
        // POST /api/v1/bookings/{visitId}/cancel
        // ══════════════════════════════════════════════════════════════
        /// <summary>
        /// Cancels a booking.
        /// <para>
        /// Note: The <c>Status</c> enum has no dedicated "Cancelled" value.
        /// Cancellation is represented as <c>ended</c> (API string: "Completed").
        /// A reason string is prepended to the first service item's description for audit purposes.
        /// </para>
        /// </summary>
        [HttpPost("{visitId:int}/cancel")]
        public async Task<IActionResult> CancelBooking(
            int visitId,
            [FromBody] CancelBookingDto? dto = null)
        {
            try
            {
                if (Owner is null)
                    return Unauthorized(new { message = "User is not authenticated." });
                var result = await _visitService.CancelBookingAsync(Owner, visitId, dto?.Reason);
                if (result is null)
                    return NotFound(new { message = $"Booking with visitId {visitId} was not found." });

                return Ok(result);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while cancelling the booking.", detail = inner });
            }
        }
    }

    /// <summary>Optional body for the cancel endpoint.</summary>
    public class CancelBookingDto
    {
        public string? Reason { get; set; }
    }
}
