using System.Collections.Generic;

namespace CSMS.Dto.ServiceSchedule
{
    public class ServiceScheduleResponseDto
    {
        public int ServiceByKmId { get; set; }
        public int KilometerInterval { get; set; }
        public string Description { get; set; } = string.Empty;
        public double Price { get; set; }
        public List<ServiceScheduleProductDto> Products { get; set; } = new();
    }

    public class ServiceScheduleProductDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
    }
}
