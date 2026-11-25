using CSMS.Data;
using CSMS.Models;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Customer_serv
{
    public class CustomerService : ICustomerSerivce
    {
        private readonly ApplicationDbContext _context;
        public CustomerService(ApplicationDbContext context)
        {
           _context=  context;
        }

        public async Task<(bool success, string[] errors)> DeleteCustomerAsync(string userId)
        {
            var user = await _context.Customers.FirstOrDefaultAsync(v=>v.UserId==userId);
            if(user==null)
            {
                return (false, 
                new string[]
                {
                    "user is not found"
                }
                );
            }
            return (true, Array.Empty<string>());
        }

      
    }
}
