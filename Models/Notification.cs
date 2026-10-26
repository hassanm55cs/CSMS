namespace CSMS.Models
{
    public class Notification
    {
        public int NotificationId { get; set; }
        public string Message { get; set; }
        public int EmployeeId{ get; set; }
        public Employee Employee{ get; set; }
        public int CustomerId { get; set; }
        public Customer Customer{ get; set; }
        public int VisitId{ get; set; }
        public Visit Visit{ get; set; }

    }
}
