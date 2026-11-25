using CSMS.Data;
using CSMS.Dto.AuthDto;
using CSMS.Dto.CustomerDto;
using CSMS.Models;
using CSMS.service.ChangePassword;
using CSMS.service.Customer_serv;
using CSMS.ViewModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[Route("/Customer")]
[ApiController]
[Authorize(Roles = "customer")]
public class CustomersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICustomerSerivce _customerService;
    private readonly IChangePassword _changePassword;
    private string ?Owner => User.FindFirstValue(ClaimTypes.NameIdentifier);
    public CustomersController(ApplicationDbContext context, CustomerService customerService, IChangePassword changePassword)
    {
        _context = context;
        _customerService = customerService;
        _changePassword = changePassword;
    }

    //[HttpGet("Get-customer/{id:int}")]
    //public async Task<IActionResult> GetCustomerById(int id)
    //{
    //    var isexsist = _context.Customers.FirstOrDefault(x => x.CustomerId == id);
    //    if (isexsist != null)
    //    {
    //        return Ok(isexsist);
    //    }
    //    else
    //    {
    //        return NotFound("not found");
    //    }
    //}

    [HttpDelete("customer-delete/id")]
    public async Task<IActionResult> DeleteCustomer()
    {
        if(Owner==null)
        {
            return Unauthorized();
        }
        var deleted = await _customerService.DeleteCustomerAsync(Owner);
        if(!deleted.success)
        {
            return BadRequest(new
            {
                error = deleted.errors
            });
        }
        return Ok("Customer deleted succssfully");
    }

    [HttpPut("/update-password-customer")]
    public async Task<IActionResult> UpdatePasswordAsync([FromBody] ChangePasswordDto dto)
    {
        if ( !ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        if(Owner==null)
        {
            return Unauthorized();
        }
        var result = await _changePassword.ChangePasswordAsync(Owner,dto);
        if (result.Success)
        {
            return Ok(new
            {
                Message = "Password changed successfully.",
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
