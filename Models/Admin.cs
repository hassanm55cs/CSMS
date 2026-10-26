namespace CSMS.Models
{
    public class Admin
    {
        public string Id { get; set; } 

        public string FullName { get; set; } 

        public virtual ApplicationUser User { get; set; } 
    }
}
