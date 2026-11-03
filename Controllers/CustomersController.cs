using CSMS.Data;
using CSMS.Dto;
using CSMS.Models;
using CSMS.service.ChangePassword;
using CSMS.service.Customer_serv;
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
    private readonly CustomerService _customerService;
    private readonly IChangePassword _changePassword;
    public CustomersController(ApplicationDbContext context, CustomerService customerService, IChangePassword changePassword)
    {
        _context = context;
        _customerService = customerService;
        _changePassword = changePassword;
    }

    // GET: api/Customer
    [HttpGet("GetCustomer-allCustomers")]
    [Authorize(Roles ="customer")]
    public async Task<IActionResult> GetCustomer()
    {
        var customers = await _context.Customers.ToListAsync();
        return Ok(customers);
    }

    [HttpGet("Get-customer/{id:int}")]
    public async Task<IActionResult> GetCustomerById(int id)
    {
        var isexsist = _context.Customers.FirstOrDefault(x => x.CustomerId == id);
        if (isexsist != null)
        {
            return Ok(isexsist);
        }
        else
        {
            return NotFound("not found");
        }
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
    [HttpPut("Update-Customer/{id}")]
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
    [HttpGet("Get-Customers")]
    public async Task<IActionResult> GetCustomers()
    {
        var customers = await _customerService.GetCustomers();

        return Ok(customers);
    }
    [HttpPut("/update-password-customer")]
    public async Task<IActionResult> UpdateCusomerAsync([FromBody] ChangePasswordDto dto)
    {
        if (dto.UserId == null || dto.CurrentPassword == null || dto.NewPassword == null)
        {
            return BadRequest("UserId, current password, and new password are required.");
        }
        var result = await _changePassword.ChangePasswordDriverAsync(dto);
        if (result.Success)
        {
            return Ok(new
            {
                Message = "Password changed successfully.",
                DriverId = result.DriverId,
                UserId = result.UserId
            });
        }
        else
        {
            return BadRequest(new
            {
                Errors = result.Errors
            });
        }
    }

}
