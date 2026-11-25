namespace CSMS.Dto.Visit
{
    /// <summary>Represents a single service/repair item on a visit.</summary>
    public class ServiceItemDto
    {
        public int ServiceId { get; set; }
        public DateTime ServiceDate { get; set; }
        public ProductInServiceDto? Product { get; set; }

        /// <summary>API-friendly severity: "critical", "warning", or "normal".</summary>
        public string StatusService { get; set; } = null!;

        public string Description { get; set; } = null!;
        public bool Approved { get; set; }
    }

    public class ProductInServiceDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = null!;
        public decimal Price { get; set; }
    }
}
