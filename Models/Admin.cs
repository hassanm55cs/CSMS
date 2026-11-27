namespace CSMS.Models
{
    public class Admin
    {
        public int AdminId { get; set; } 

        public string FullName { get; set; }
        public string UserId { get; set; }

        public virtual ApplicationUser User { get; set; }
    }
}
