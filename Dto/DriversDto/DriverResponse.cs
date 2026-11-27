namespace CSMS.Dto.DriversDto
{
    public class DriverResponse
    {
        public string Fullname{ get; set; }
        public string Email{ get; set; }
        public string PhoneNumber { get; set; }
        public double ?Salary { get; set; }
        public int BranchId{ get; set; }
        public int DriverId{ get; set; }
    }
}
