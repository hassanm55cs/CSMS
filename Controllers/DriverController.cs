using CSMS.Dto;
using CSMS.service.ChangePassword;
using CSMS.service.Register;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers
{
    [Route("Driver")]
    [ApiController]

    public class DriverController : ControllerBase
    {
        private readonly IAuthService _iauthService;
        private readonly IChangePassword _changePassword;
        public DriverController(IAuthService iauthService, IChangePassword changePassword)
        {
            _iauthService = iauthService;
            _changePassword = changePassword;
        }
        [HttpPost("Add-driver")]
        public async Task<IActionResult> AddDriverAsync([FromBody] DriverDto dto)
        {
            if(!ModelState.IsValid)
            {
                return BadRequest("Invalid input data.");
            }
            if (dto.Salary == null|| dto.Salary <= 0 || dto.BranchId <= 0 || dto.PhoneNumber == null || dto.Password == null || dto.ConfirmPassword == null) 
            {
                return BadRequest("Salary, BranchId, PhoneNumber, Password, and ConfirmPassword are required and must be valid.");
            }
            if (dto.PhoneNumber.Length > 11)
            {
                return BadRequest("Phone number must be 11 digits or less.");
            }
            if(dto.Password!=dto.ConfirmPassword)
            {
                return BadRequest("Password and ConfirmPassword do not match.");
            }
            var result = await _iauthService.AddDriver(dto);
            if (result.Success)
            {
                return Ok(new
                {
                    Message = "Driver added successfully.",
                    DriverId = result.DriverId,
                    UserId = result.UserId,
                    Token = result.Token
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
        [HttpPut("change-password")]
        public async Task<IActionResult> UpdateDriverAsync([FromBody] ChangePasswordDto dto)
        {
           if(dto.UserId == null || dto.CurrentPassword == null || dto.NewPassword == null)
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
                    UserId = result.UserId,
               
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
}
