using CSMS.Dto.Inventory;
using CSMS.service.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CSMS.Controllers
{
    [ApiController]
    [Route("branches/{branchId:int}/inventory")]
    [Authorize(Roles =("admin"))]
    public class BranchInventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;

        public BranchInventoryController(IInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
        }

        // ══════════════════════════════════════════════════════════════════
        // POST /api/v1/branches/{branchId}/inventory
        // Upsert: 201 Created if new, 200 OK if already exists
        // ══════════════════════════════════════════════════════════════════
        [HttpPost]
        public async Task<IActionResult> Upsert(int branchId, [FromBody] InventoryAddRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _inventoryService.UpsertAsync(branchId, dto);

                if (result is null)
                    return NotFound(new { message = $"Branch {branchId} or Product {dto.ProductId} was not found." });

                var (inventoryDto, created) = result.Value;

                if (created)
                    return StatusCode(201, inventoryDto);

                return Ok(inventoryDto);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;

                if (inner.Contains("FOREIGN KEY") || inner.Contains("FK_"))
                    return BadRequest(new { message = "BranchId or ProductId does not reference an existing record." });

                return StatusCode(500, new { message = "A database error occurred while updating inventory.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // PUT /api/v1/branches/{branchId}/inventory/{productId}
        // ══════════════════════════════════════════════════════════════════
        [HttpPut("{productId:int}")]
        public async Task<IActionResult> Update(
            int branchId,
            int productId,
            [FromBody] InventoryUpdateRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _inventoryService.UpdateAsync(branchId, productId, dto);

                if (result is null)
                    return NotFound(new
                    {
                        message = $"Inventory entry for branch {branchId} / product {productId} was not found."
                    });

                return Ok(result);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while updating inventory.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // DELETE /api/v1/branches/{branchId}/inventory/{productId}
        // ══════════════════════════════════════════════════════════════════
        [HttpDelete("{productId:int}")]
        public async Task<IActionResult> Delete(int branchId, int productId)
        {
            try
            {
                var result = await _inventoryService.DeleteAsync(branchId, productId);

                if (result is null)
                    return NotFound(new
                    {
                        message = $"Inventory entry for branch {branchId} / product {productId} was not found."
                    });

                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while deleting inventory.", detail = inner });
            }
        }
    }
}
