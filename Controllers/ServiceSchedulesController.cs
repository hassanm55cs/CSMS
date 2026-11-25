using CSMS.AppServices.Interfaces;
using CSMS.Dto.ServiceSchedule;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CSMS.Controllers
{
    [ApiController]
    [Route("service-schedules")]
    public class ServiceSchedulesController : ControllerBase
    {
        private readonly IServiceScheduleService _service;

        public ServiceSchedulesController(IServiceScheduleService service)
        {
            _service = service;
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/service-schedules
        // ══════════════════════════════════════════════════════════════
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var schedules = await _service.GetAllAsync();
            return Ok(schedules);
        }

        // ══════════════════════════════════════════════════════════════
        // POST /api/v1/service-schedules
        // ══════════════════════════════════════════════════════════════
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ServiceScheduleRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(
                    nameof(GetAll),
                    new { serviceByKmId = created.ServiceByKmId },
                    created);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;

                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "One or more productIds are invalid." });

                return StatusCode(500, new { message = "A database error occurred while creating the service schedule.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/service-schedules/{serviceByKmId}
        // ══════════════════════════════════════════════════════════════
        [HttpPut("{serviceByKmId:int}")]
        public async Task<IActionResult> Update(int serviceByKmId, [FromBody] ServiceScheduleRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var updated = await _service.UpdateAsync(serviceByKmId, dto);
                if (updated is null)
                    return NotFound(new { message = $"Service schedule with id {serviceByKmId} was not found." });

                return Ok(updated);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;

                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "One or more productIds are invalid." });

                return StatusCode(500, new { message = "A database error occurred while updating the service schedule.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // DELETE /api/v1/service-schedules/{serviceByKmId}
        // ══════════════════════════════════════════════════════════════
        [HttpDelete("{serviceByKmId:int}")]
        public async Task<IActionResult> Delete(int serviceByKmId)
        {
            try
            {
                var deleted = await _service.DeleteAsync(serviceByKmId);
                if (!deleted)
                    return NotFound(new { message = $"Service schedule with id {serviceByKmId} was not found." });

                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while deleting the service schedule.", detail = inner });
            }
        }
    }
}
