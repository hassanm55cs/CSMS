namespace CSMS.Dto.Inventory
{
    /// <summary>Returned after a successful inventory create or update.</summary>
    public class InventoryResponseDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal ProductPrice { get; set; }
        public int WarrantyMonths { get; set; }
        public int Quantity { get; set; }
    }
}
