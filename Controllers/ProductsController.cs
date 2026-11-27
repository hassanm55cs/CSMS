using CSMS.Dto.ProductsDto;
using CSMS.Data;
using CSMS.service.Products;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CSMS.Controllers
{
    [ApiController]
    [Route("/products")]
    [Authorize]
    public class ProductsController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ApplicationDbContext _context;

        public ProductsController(IProductService productService, ApplicationDbContext context)
        {
            _productService = productService;
            _context = context;
        }

        // ══════════════════════════════════════════════════════════════════
        // GET /api/v1/products
        // ══════════════════════════════════════════════════════════════════
        [HttpGet]
        [Authorize(Roles = "admin,employee")]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page              = 1,
            [FromQuery] int pageSize          = 10,
            [FromQuery] string? search        = null,
            [FromQuery] int? branchId         = null,
            [FromQuery] bool availableOnly    = false,
            [FromQuery] string? stockStatus   = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            int? employeeBranchId = null;
            if (User.IsInRole("employee"))
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var employee = userId is null
                    ? null
                    : await _context.Employees.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == userId);

                if (employee is null)
                    return Forbid();

                // Employees may browse the catalog, but only see stock for their own branch.
                employeeBranchId = employee.BranchId;
                branchId = employee.BranchId;
                availableOnly = false;
                stockStatus = string.Equals(stockStatus, "outOfStock", StringComparison.OrdinalIgnoreCase)
                    ? "outOfStock"
                    : "available";
            }

            var result = await _productService.GetAllAsync(page, pageSize, search, branchId, availableOnly, stockStatus);
            if (employeeBranchId.HasValue)
            {
                foreach (var product in result.Data)
                    product.BranchQuantities = product.BranchQuantities
                        .Where(stock => stock.BranchId == employeeBranchId.Value)
                        .ToList();
            }
            return Ok(result);
        }

        // ══════════════════════════════════════════════════════════════════
        // GET /api/v1/products/{productId}
        // ══════════════════════════════════════════════════════════════════
        [HttpGet("{productId:int}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetById(int productId)
        {
            var product = await _productService.GetByIdAsync(productId);
            if (product is null)
                return NotFound(new { message = $"Product with id {productId} was not found." });

            return Ok(product);
        }

        // ══════════════════════════════════════════════════════════════════
        // POST /api/v1/products
        // ══════════════════════════════════════════════════════════════════
        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] ProductRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var created = await _productService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById),
                    new { productId = created.ProductId },
                    created);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while creating the product.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // PUT /api/v1/products/{productId}
        // ══════════════════════════════════════════════════════════════════
        [HttpPut("{productId:int}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int productId, [FromBody] ProductRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var updated = await _productService.UpdateAsync(productId, dto);
                if (updated is null)
                    return NotFound(new { message = $"Product with id {productId} was not found." });

                return Ok(updated);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while updating the product.", detail = inner });
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // DELETE /api/v1/products/{productId}
        // ══════════════════════════════════════════════════════════════════
        [HttpDelete("{productId:int}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int productId)
        {
            try
            {
                var result = await _productService.DeleteAsync(productId);
                if (result is null)
                    return NotFound(new { message = $"Product with id {productId} was not found." });

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                // Product is still referenced — 409 Conflict
                return Conflict(new { message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { message = "A database error occurred while deleting the product.", detail = inner });
            }
        }
    }
}
