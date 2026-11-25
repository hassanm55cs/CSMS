namespace CSMS.Dto.ProductsDto
{
    /// <summary>Summary row returned in the paginated list.</summary>
    public class ProductListItemDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int WarrantyMonths { get; set; }
        public string? Description { get; set; }

        /// <summary>Stock level per branch — always populated on list responses.</summary>
        public List<BranchQuantityDto> BranchQuantities { get; set; } = [];
    }

    /// <summary>Full product detail including all branch stock entries.</summary>
    public class ProductDetailDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int WarrantyMonths { get; set; }
        public string? Description { get; set; }
        public List<BranchQuantityDto> BranchQuantities { get; set; } = [];
    }

    /// <summary>Branch-level stock quantity embedded in product responses.</summary>
    public class BranchQuantityDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }
}
