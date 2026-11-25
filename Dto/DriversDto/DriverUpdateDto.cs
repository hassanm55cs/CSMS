using System.ComponentModel.DataAnnotations;

namespace CSMS.Dto.DriversDto
{
    public class DriverUpdateDto
    {
        [Required,MaxLength(11)]
        public string Phone{ get; set; }

    }
}
