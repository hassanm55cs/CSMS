using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.Inventory
{
    /// <summary>Request body for adding a product to a branch's inventory (POST upsert).</summary>
    public class InventoryAddRequestDto
    {
        [Required(ErrorMessage = "ProductId is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "ProductId must be a positive integer.")]
        public int ProductId { get; set; }

        [Required(ErrorMessage = "Quantity is required.")]
        [Range(0, int.MaxValue, ErrorMessage = "Quantity must be non-negative.")]
        public int Quantity { get; set; }
    }

    /// <summary>Request body for updating an existing inventory entry (PUT).</summary>
    public class InventoryUpdateRequestDto
    {
        [Required(ErrorMessage = "Quantity is required.")]
        [Range(0, int.MaxValue, ErrorMessage = "Quantity must be non-negative.")]
        public int Quantity { get; set; }
    }
}
