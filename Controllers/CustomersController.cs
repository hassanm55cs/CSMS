using CSMS.Data;
using CSMS.Dto;
using CSMS.Models;
using CSMS.ViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[Route("/Customer")]
[ApiController]
public class CustomersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public CustomersController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Customer
    [HttpGet("GetCustomer-allCustomers")]
    [Authorize(Roles ="customer")]
    public async Task<IActionResult> GetCustomer()
    {
        var customers = await _context.Customers.ToListAsync();
        return Ok(customers);
    }
    [HttpGet("GetCustomer-allCustomers-withcars")]
    public async Task<IActionResult> GetCustomerWithcars()
    {
        try
        {
            var customersCars = _context.Customers.Select(x => new CustomerCar
            {
                Address = x.Address,
                Email = x.Email,
                FullName = x.FullName,
                Phone = x.Phone,
                Cars1 = x.Cars.Select(c => new Cars
                {
                    CarCompany = c.CarCompany,
                    CurrentKm = c.CurrentKm,
                    EngineType = c.EngineType,
                    CustomerId = c.CustomerId,
                    FuelType = c.FuelType,
                    LicencesPlate = c.LicencesPlate,
                    ManufactuareDate = c.ManufactuareDate,
                    Model = c.Model,
                    NoOfCylinders = c.NoOfCylinders,
                    PriceInEgp = c.PriceInEgp
                }).ToList()

            });
            return (Ok(customersCars));
        }
        catch
        {
            return BadRequest("there is an error");
        }
    }
    [HttpPost("Add-Customer")]
    public async Task<IActionResult> AddCustomer([FromBody] CustomerDto cust)
    {
        var customer = new Customer
        {
            Phone = cust.Phone,
            Email = cust.Email,
            FullName = cust.FullName,
            Address = cust.Address
        };
        if (cust == null)
        {
            return await Task.FromResult<IActionResult>(BadRequest("Customer data is null."));
        }
        await _context.Customers.AddAsync(customer);
        await _context.SaveChangesAsync();

        return Ok("the customer is added");
    }
    [HttpPut("Update-Customer/id")]
public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CustomerDto cust)
    {
        var customerExsist = await _context.Customers.FirstOrDefaultAsync(x => x.CustomerId == id);
        if(customerExsist == null)
        {
            return NotFound("Customer not found");
        }
        customerExsist.Address = cust.Address;
        customerExsist.Email = cust.Email;
        customerExsist.FullName = cust.FullName;
        customerExsist.Phone = cust.Phone;
        await _context.SaveChangesAsync();
        return Ok("the customer is updated");

    }
    [HttpDelete("customer-delete/id")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customerexsist = await _context.Customers.FirstOrDefaultAsync(x => x.CustomerId == id);
        if (customerexsist == null)
        {
            return NotFound("this customer is not found");
        }
        _context.Remove(customerexsist);
        await _context.SaveChangesAsync();
        return Ok("customer removed");
    }
}
