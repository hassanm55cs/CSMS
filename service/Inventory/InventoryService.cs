using CSMS.Data;
using CSMS.Dto.Inventory;
using CSMS.Models;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Inventory
{
    public class InventoryService : IInventoryService
    {
        private readonly ApplicationDbContext _context;

        public InventoryService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ══════════════════════════════════════════════════════════════════
        // POST — upsert
        // ══════════════════════════════════════════════════════════════════
        public async Task<(InventoryResponseDto Dto, bool Created)?> UpsertAsync(
            int branchId, InventoryAddRequestDto dto)
        {
            // Validate that both the branch and the product exist
            var branch = await _context.ServiceBranches.FindAsync(branchId);
            if (branch is null) return null;

            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product is null) return null;

            var existing = await _context.BranchProducts
                .FirstOrDefaultAsync(bp => bp.BranchId == branchId && bp.ProductId == dto.ProductId);

            bool created;
            if (existing is null)
            {
                // Insert new entry
                _context.BranchProducts.Add(new BranchProduct
                {
                    BranchId  = branchId,
                    ProductId = dto.ProductId,
                    Quantity  = dto.Quantity
                });
                created = true;
            }
            else
            {
                // Update existing entry
                existing.Quantity = dto.Quantity;
                created = false;
            }

            await _context.SaveChangesAsync();

            return (new InventoryResponseDto
            {
                BranchId       = branchId,
                BranchName     = branch.BranchName,
                ProductId      = product.ProductId,
                ProductName    = product.Name,
                ProductPrice   = product.Price,
                WarrantyMonths = product.WarrantyMonths,
                Quantity       = dto.Quantity
            }, created);
        }

        // ══════════════════════════════════════════════════════════════════
        // PUT — update quantity
        // ══════════════════════════════════════════════════════════════════
        public async Task<InventoryResponseDto?> UpdateAsync(
            int branchId, int productId, InventoryUpdateRequestDto dto)
        {
            var entry = await _context.BranchProducts
                .Include(bp => bp.Branch)
                .Include(bp => bp.Product)
                .FirstOrDefaultAsync(bp => bp.BranchId == branchId && bp.ProductId == productId);

            if (entry is null) return null;

            entry.Quantity = dto.Quantity;
            await _context.SaveChangesAsync();

            return new InventoryResponseDto
            {
                BranchId       = entry.BranchId,
                BranchName     = entry.Branch.BranchName,
                ProductId      = entry.ProductId,
                ProductName    = entry.Product.Name,
                ProductPrice   = entry.Product.Price,
                WarrantyMonths = entry.Product.WarrantyMonths,
                Quantity       = entry.Quantity
            };
        }

        // ══════════════════════════════════════════════════════════════════
        // DELETE
        // ══════════════════════════════════════════════════════════════════
        public async Task<bool?> DeleteAsync(int branchId, int productId)
        {
            var entry = await _context.BranchProducts
                .FirstOrDefaultAsync(bp => bp.BranchId == branchId && bp.ProductId == productId);

            if (entry is null) return null;

            _context.BranchProducts.Remove(entry);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
