using CSMS.Dto.Branch;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using CSMS.service.Branch;

namespace CSMS.Controllers
{
    [ApiController]
    [Route("/branches")]
    [Authorize(Roles ="admin")]
    public class BranchesController : ControllerBase
    {
        private readonly IBranchService _branchService;

        public BranchesController(IBranchService branchService)
        {
            _branchService = branchService;
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/branches
        // ══════════════════════════════════════════════════════════════
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page          = 1,
            [FromQuery] int pageSize      = 10,
            [FromQuery] string? search    = null,
            [FromQuery] double? latitude  = null,
            [FromQuery] double? longitude = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var result = await _branchService.GetAllAsync(page, pageSize, search, latitude, longitude);
            return Ok(result);
        }

        // ══════════════════════════════════════════════════════════════
        // GET /api/v1/branches/{branchId}
        // ══════════════════════════════════════════════════════════════
        [HttpGet("{branchId:int}")]
        public async Task<IActionResult> GetById(int branchId)
        {
            var branch = await _branchService.GetByIdAsync(branchId);
            if (branch is null)
                return NotFound(new { message = $"Branch with id {branchId} was not found." });

            return Ok(branch);
        }

        // ══════════════════════════════════════════════════════════════
        // POST /api/v1/branches
        // ══════════════════════════════════════════════════════════════
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BranchRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Treat managerId = 0 as "no manager"
            if (dto.ManagerId == 0) dto.ManagerId = null;

            try
            {
                var created = await _branchService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById),
                    new { branchId = created.BranchId },
                    created);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;

                // FK violation — managerId points to a non-existent employee
                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "ManagerId does not reference a valid employee." });

                return StatusCode(500, new { message = "A database error occurred while creating the branch.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // PUT /api/v1/branches/{branchId}
        // ══════════════════════════════════════════════════════════════
        [HttpPut("{branchId:int}")]
        public async Task<IActionResult> Update(int branchId, [FromBody] BranchRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Treat managerId = 0 as "no manager"
            if (dto.ManagerId == 0) dto.ManagerId = null;

            try
            {
                var updated = await _branchService.UpdateAsync(branchId, dto);
                if (updated is null)
                    return NotFound(new { message = $"Branch with id {branchId} was not found." });

                return Ok(updated);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;

                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "ManagerId does not reference a valid employee." });

                return StatusCode(500, new { message = "A database error occurred while updating the branch.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════
        // DELETE /api/v1/branches/{branchId}
        // ══════════════════════════════════════════════════════════════
        [HttpDelete("{branchId:int}")]
        public async Task<IActionResult> Delete(int branchId)
        {
            try
            {
                var result = await _branchService.DeleteAsync(branchId);
                if (result is null)
                    return NotFound(new { message = $"Branch with id {branchId} was not found." });

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while deleting the branch.", detail = inner });
            }
        }
    }
}
