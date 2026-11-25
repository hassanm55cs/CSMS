using CSMS.Dto.Common;
using CSMS.Dto.ProductsDto;

namespace CSMS.service.Products
{
    public interface IProductService
    {
        /// <summary>
        /// Returns a paginated list of products with their branch quantities.
        /// </summary>
        /// <param name="page">1-based page number.</param>
        /// <param name="pageSize">Items per page (max 100).</param>
        /// <param name="search">Optional name/description filter.</param>
        /// <param name="branchId">Optional branch filter — only products stocked in this branch.</param>
        /// <param name="availableOnly">When true, only products with quantity &gt; 0 in at least one branch.</param>
        Task<PagedResult<ProductListItemDto>> GetAllAsync(
            int page, int pageSize,
            string? search,
            int? branchId,
            bool availableOnly);

        /// <summary>Returns full product detail with all branch stock, or null if not found.</summary>
        Task<ProductDetailDto?> GetByIdAsync(int productId);

        /// <summary>Creates a new product and returns its detail.</summary>
        Task<ProductDetailDto> CreateAsync(ProductRequestDto dto);

        /// <summary>Updates an existing product. Returns null when not found.</summary>
        Task<ProductDetailDto?> UpdateAsync(int productId, ProductRequestDto dto);

        /// <summary>
        /// Deletes a product.
        /// Returns null when not found (→ 404).
        /// Throws <see cref="InvalidOperationException"/> when the product is referenced by
        /// Service records, ServiceByKm packages, or BranchProduct inventory entries (→ 409).
        /// </summary>
        Task<bool?> DeleteAsync(int productId);
    }
}
