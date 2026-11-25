using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.ProductsDto
{
    /// <summary>Request body for creating or updating a product.</summary>
    public class ProductRequestDto
    {
        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(200, ErrorMessage = "Name cannot exceed 200 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Price is required.")]
        [Range(0, double.MaxValue, ErrorMessage = "Price must be a non-negative value.")]
        public decimal Price { get; set; }

        [Required(ErrorMessage = "WarrantyMonths is required.")]
        [Range(0, 600, ErrorMessage = "WarrantyMonths must be between 0 and 600.")]
        public int WarrantyMonths { get; set; }

        [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
        public string? Description { get; set; }
    }
}
