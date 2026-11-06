using System.Security.Claims;
using CSMS.Dto;
using CSMS.service.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("profile")]
[Authorize(Roles = "customer")]
public class ProfileController : ControllerBase
{
    private readonly ProfileService _profileService;

    public ProfileController(ProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (userId is null)
        {
            return Unauthorized();
        }

        var profile = await _profileService.GetProfileAsync(userId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateCustomerProfileDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        var status = await _profileService.UpdateProfileAsync(userId, dto);
        return status switch
        {
            ProfileUpdateStatus.Updated => Ok(await _profileService.GetProfileAsync(userId)),
            ProfileUpdateStatus.NotFound => NotFound(),
            ProfileUpdateStatus.PhoneAlreadyUsed => Conflict(new
            {
                Message = "The phone number is already in use."
            }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
