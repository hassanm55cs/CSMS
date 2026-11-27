using CSMS.Dto.AuthDto;
using CSMS.Dto.DriversDto;
using CSMS.Dto.EmployeeDto;
using CSMS.service.ConfirmationEmail;
using CSMS.service.Login;
using CSMS.service.Register;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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

        [HttpPost("register/Driver"), Authorize(Roles = "admin")]
        public async Task<IActionResult> AddDriverAsync([FromBody] DriverDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var adminUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _iauthService.AddDriver(dto, adminUserId);
            if (result.Success)
            {
                return StatusCode(201, new
                {
                    Message = "Driver account created successfully.",
                    DriverId = result.DriverId,
                    UserId = result.UserId,
                    Email = dto.Email.Trim(),
                    DefaultPassword = result.DefaultPassword
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
        [HttpPost("register/employee"), Authorize(Roles ="admin")]
        public async Task<IActionResult> RigesterEmployee([FromBody] EmployeeDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Invalid input data.");
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
        [HttpPost("/Login"),AllowAnonymous]
        public async Task<IActionResult> loginAll(LoginDto dto)
        {
            if(!ModelState.IsValid)
            {
                return BadRequest("Invalid input.");
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

