using CSMS.Data;
using CSMS.Dto.Common;
using CSMS.Dto.ProductsDto;
using CSMS.Models;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Products
{
    public class ProductService : IProductService
    {
        private readonly ApplicationDbContext _context;

        public ProductService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ══════════════════════════════════════════════════════════════════
        // GET (list)
        // ══════════════════════════════════════════════════════════════════
        public async Task<PagedResult<ProductListItemDto>> GetAllAsync(
            int page, int pageSize,
            string? search,
            int? branchId,
            bool availableOnly)
        {
            var query = _context.Products
                .Include(p => p.BranchProducts)
                    .ThenInclude(bp => bp.Branch)
                .AsNoTracking()
                .AsQueryable();

            // Search filter — name or description
            if (!string.IsNullOrWhiteSpace(search))
            {
                var lower = search.ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(lower) ||
                    (p.Description != null && p.Description.ToLower().Contains(lower)));
            }

            // Branch filter — product must have a BranchProduct entry for this branch
            if (branchId.HasValue)
            {
                query = query.Where(p =>
                    p.BranchProducts.Any(bp => bp.BranchId == branchId.Value));
            }

            // Available-only filter — at least one branch must have quantity > 0
            if (availableOnly)
            {
                query = query.Where(p =>
                    p.BranchProducts.Any(bp => bp.Quantity > 0));
            }

            var totalCount = await query.CountAsync();

            var products = await query
                .OrderBy(p => p.ProductId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<ProductListItemDto>
            {
                Page       = page,
                PageSize   = pageSize,
                TotalCount = totalCount,
                Data       = products.Select(MapToListItem).ToList()
            };
        }

        // ══════════════════════════════════════════════════════════════════
        // GET (single)
        // ══════════════════════════════════════════════════════════════════
        public async Task<ProductDetailDto?> GetByIdAsync(int productId)
        {
            var product = await _context.Products
                .Include(p => p.BranchProducts)
                    .ThenInclude(bp => bp.Branch)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProductId == productId);

            return product is null ? null : MapToDetail(product);
        }

        // ══════════════════════════════════════════════════════════════════
        // POST
        // ══════════════════════════════════════════════════════════════════
        public async Task<ProductDetailDto> CreateAsync(ProductRequestDto dto)
        {
            var product = new Product
            {
                Name           = dto.Name,
                Price          = dto.Price,
                WarrantyMonths = dto.WarrantyMonths,
                Description    = dto.Description
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return (await GetByIdAsync(product.ProductId))!;
        }

        // ══════════════════════════════════════════════════════════════════
        // PUT
        // ══════════════════════════════════════════════════════════════════
        public async Task<ProductDetailDto?> UpdateAsync(int productId, ProductRequestDto dto)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product is null) return null;

            product.Name           = dto.Name;
            product.Price          = dto.Price;
            product.WarrantyMonths = dto.WarrantyMonths;
            product.Description    = dto.Description;

            await _context.SaveChangesAsync();
            return (await GetByIdAsync(productId))!;
        }

        // ══════════════════════════════════════════════════════════════════
        // DELETE
        // ══════════════════════════════════════════════════════════════════
        public async Task<bool?> DeleteAsync(int productId)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product is null) return null;

            // Check referencing entities and refuse with 409 if any exist
            bool usedInServices    = await _context.Services.AnyAsync(s => s.ProductId == productId);
            bool usedInServiceByKm = await _context.ServiceByKms
                                          .AnyAsync(sbk => sbk.Products.Any(p => p.ProductId == productId));
            bool usedInInventory   = await _context.BranchProducts.AnyAsync(bp => bp.ProductId == productId);

            if (usedInServices || usedInServiceByKm || usedInInventory)
            {
                var reasons = new List<string>();
                if (usedInServices)    reasons.Add("service records");
                if (usedInServiceByKm) reasons.Add("km-based service packages");
                if (usedInInventory)   reasons.Add("branch inventory entries");

                throw new InvalidOperationException(
                    $"Cannot delete product. It is still referenced by: {string.Join(", ", reasons)}.");
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return true;
        }

        // ══════════════════════════════════════════════════════════════════
        // Mapping helpers
        // ══════════════════════════════════════════════════════════════════
        private static List<BranchQuantityDto> MapBranchQuantities(Product p) =>
            p.BranchProducts?.Select(bp => new BranchQuantityDto
            {
                BranchId   = bp.BranchId,
                BranchName = bp.Branch?.BranchName ?? string.Empty,
                Quantity   = bp.Quantity
            }).ToList() ?? [];

        private static ProductListItemDto MapToListItem(Product p) => new()
        {
            ProductId      = p.ProductId,
            Name           = p.Name,
            Price          = p.Price,
            WarrantyMonths = p.WarrantyMonths,
            Description    = p.Description,
            BranchQuantities = MapBranchQuantities(p)
        };

        private static ProductDetailDto MapToDetail(Product p) => new()
        {
            ProductId      = p.ProductId,
            Name           = p.Name,
            Price          = p.Price,
            WarrantyMonths = p.WarrantyMonths,
            Description    = p.Description,
            BranchQuantities = MapBranchQuantities(p)
        };
    }
}
