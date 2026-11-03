using CSMS.Data;
using CSMS.Models;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Customer_serv
{
    public class CustomerService
    {
        private readonly ApplicationDbContext _context;
        public CustomerService(ApplicationDbContext context)
        {
           _context=  context;
        }
        public async Task<List<Customer>> GetCustomers()
        {
            return await _context.Customers.ToListAsync();
        }
    }
}
