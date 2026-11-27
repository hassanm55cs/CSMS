using CSMS.Dto.AuthDto;
using CSMS.Dto.DriversDto;
using CSMS.service.ChangePassword;
using CSMS.service.Driver_serv;
using CSMS.service.Register;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CSMS.Controllers
{
    [Route("Driver")]
    [ApiController]

    public class DriverController : ControllerBase
    {
        private readonly IAuthService _iauthService;
        private readonly IChangePassword _changePassword;
        private readonly IDriverService _idriverService;
        private string? Owner => User.FindFirstValue(ClaimTypes.NameIdentifier);
        public DriverController(IAuthService iauthService, IChangePassword changePassword, IDriverService idriverService    )
        {
            _iauthService = iauthService;
            _changePassword = changePassword;
            _idriverService = idriverService;
        }
        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetDrivers([FromQuery] DriverListQueryDto query)
        {
            return Ok(await _idriverService.GetDriversAsync(query));
        }

        [HttpGet("me")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> GetMe()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
            {
                return Unauthorized();
            }

            var driver = await _idriverService.GetMeAsync(userId);
            return driver is null ? NotFound(new { Message = "Driver profile not found." }) : Ok(driver);
        }

        [HttpPut("change-password")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> UpdateDriverAsync([FromBody] ChangePasswordDto dto)
        {
           if(!ModelState.IsValid)
            {
                return BadRequest( (ModelState));
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
        [HttpPut("{driverId:int}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateDriverAdminFields(int driverId, [FromBody] UpdateDriverAdminDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _idriverService.UpdateAdminFieldsAsync(driverId, dto);
            return result.Status switch
            {
                DriverAdminUpdateStatus.Updated => Ok(result.Driver),
                DriverAdminUpdateStatus.NotFound => NotFound(new { Message = "Driver not found." }),
                DriverAdminUpdateStatus.EmailAlreadyUsed => Conflict(new { Message = "Email is already in use." }),
                DriverAdminUpdateStatus.PhoneAlreadyUsed => Conflict(new { Message = "Phone number is already in use." }),
                DriverAdminUpdateStatus.IdentityFailed => BadRequest(new { Errors = result.Errors }),
                _ => StatusCode(StatusCodes.Status500InternalServerError)
            };
        }
        [HttpPut("phone")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateDriverPhone([FromBody] UpdateDriverPhoneDto dto)
        {
            var result = await _idriverService.UpdatePhoneByEmailAsync(dto);
            return result.Status switch
            {
                DriverPhoneStatus.Updated => Ok(result.Driver),
                DriverPhoneStatus.NotFound => NotFound(new { Message = "No driver found with this email." }),
                DriverPhoneStatus.PhoneAlreadyUsed => Conflict(new
                {
                    Message = "This phone number is already used by another driver."
                }),
                DriverPhoneStatus.IdentityFailed => BadRequest(new { Errors = result.Errors }),
                _ => StatusCode(StatusCodes.Status500InternalServerError)
            };
        }
        [HttpPut("me/location")]
        [Authorize(Roles = "driver")]
        public async Task<IActionResult> UpdateMyLocation([FromBody] UpdateDriverLocationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
            {
                return Unauthorized();
            }

            var result = await _idriverService.UpdateLocationAsync(userId, dto);
            return result.Status switch
            {
                DriverLocationStatus.Updated => Ok(result.Location),
                DriverLocationStatus.NotFound => NotFound(new { Message = "Driver profile not found." }),
                DriverLocationStatus.HasActiveRequest => Conflict(new
                {
                    Message = "You cannot mark yourself available while you have an active emergency request."
                }),
                _ => StatusCode(StatusCodes.Status500InternalServerError)
            };
        }
    }
}
