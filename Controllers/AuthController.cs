using CSMS.Dto;
using CSMS.service.ConfirmationEmail;
using CSMS.service.Login;
using CSMS.service.Register;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers
{
 
        [ApiController]
        [Route("/auth")]
        public class AuthController : ControllerBase
        {
            private readonly IAuthService _iauthService;
        private readonly IEmailConfirmationService _emailConfirmationService;
        private readonly ILoginService  _loginService;

        public AuthController(IAuthService authService, IEmailConfirmationService emailConfirmationService, ILoginService loginService)
            {
                _iauthService = authService;
                _emailConfirmationService = emailConfirmationService;
                _loginService = loginService;
            }

            [HttpPost("register/customer")]
            public async Task<IActionResult> RegisterCustomer(RegisterDto dto)
            {
                var result =
                    await _iauthService.RegisterCustomerAsync(dto);

                if (!result.Success)
                {
                    return BadRequest(new
                    {
                        errors = result.Errors
                    });
                }

                return StatusCode(201, new
                {
                    message = "Customer registered successfully.",
                    customerId = result.CustomerId,
                    userId = result.UserId
                });
            }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail([FromQuery] string userId,[FromQuery] string token)
        {
            var result = await _emailConfirmationService.ConfirmEmailAsync(
                userId,
                token);

            if (!result.success)
            {
                return BadRequest(new
                {
                    message = "Email confirmation failed.",
                    errors = result.description
                });
            }

            return Ok("Email confirmed successfully.");
        }
        [HttpGet("send-confirmation-email")]
        public async Task<IActionResult> SendConfirmationEmail([FromQuery] string userId)
        {
            var result = await _emailConfirmationService.SendConfirmationEmailAsync(userId);

            if (!result.success)
            {
                return BadRequest(new
                {
                    message = "Failed to send confirmation email.",
                    errors = result.description
                });
            }

            return Ok("Confirmation email sent successfully.");
        }

        [HttpPost("register/Driver")]
        public async Task<IActionResult> AddDriverAsync([FromBody] DriverDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid input data.");
            }
            if ( dto.Salary <= 0 || dto.BranchId <= 0 || dto.PhoneNumber == null || dto.Password == null || dto.ConfirmPassword == null)
            {
                return BadRequest("Salary, BranchId, PhoneNumber, Password, and ConfirmPassword are required and must be valid.");
            }
            if (dto.PhoneNumber.Length > 11)
            {
                return BadRequest("Phone number must be 11 digits or less.");
            }
            if (dto.Password != dto.ConfirmPassword)
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
        [HttpPost("register/employee")]
        public async Task<IActionResult> RigesterEmployee([FromBody] EmployeeDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid input data.");
            }
            if ( dto.Salary <= 0 || dto.BranchId <= 0 || dto.PhoneNumber == null || dto.Password == null || dto.ConfirmPassword == null)
            {
                return BadRequest("Salary, BranchId, PhoneNumber, Password, and ConfirmPassword are required and must be valid.");
            }
            if (dto.PhoneNumber.Length > 11)
            {
                return BadRequest("Phone number must be 11 digits or less.");
            }
            if (dto.Password != dto.ConfirmPassword)
            {
                return BadRequest("Password and ConfirmPassword do not match.");
            }
            var result = await _iauthService.RegisterEmployeeAsync(dto);
            if (result.Success)
            {
                return Ok(new
                {
                    Message = "Employee registered successfully.",
                    EmployeeId = result.CustomerId,
                    UserId = result.UserId,
                    token=result.Token
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
        [HttpPost("/Login")]
        public async Task<IActionResult> loginAll(LoginDto dto)
        {
            if(!ModelState.IsValid)
            {
                return BadRequest("Invalid input data.");
            }
            var result = await _loginService.LoginAsync(dto);
            if(result.succsee)
            {
                return Ok(new
                {
                    Message = "Login successful.",
                    Token = result.Token
                });
            }
            else
            {
                return BadRequest(new
                {
                    Error = result.error
                });
            }
        }


    }
}

