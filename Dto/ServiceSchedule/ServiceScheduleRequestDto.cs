using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.ServiceSchedule
{
    public class ServiceScheduleRequestDto
    {
        [Required]
        public int KilometerInterval { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public double Price { get; set; }

        /// <summary>IDs of the products to link to this service schedule.</summary>
        public List<int> ProductIds { get; set; } = new();
    }
}
