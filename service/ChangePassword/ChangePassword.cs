using CSMS.Dto.AuthDto;
using CSMS.Models;
using Microsoft.AspNetCore.Identity;

namespace CSMS.service.ChangePassword
{
    public class ChangePassword : IChangePassword
    {
        private readonly UserManager<ApplicationUser> _userManager;
        public ChangePassword(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }
        public async Task<(bool Success, string[] Errors, string? UserId)> ChangePasswordAsync(string userid,ChangePasswordDto changePasswordDto)
        {
            if (string.IsNullOrEmpty(changePasswordDto.CurrentPassword) || string.IsNullOrEmpty(changePasswordDto.NewPassword))
            {
                return (false, new[] { "UserId, current password, and new password are required." }, null);
            }
            var user = await _userManager.FindByIdAsync(userid);
            if (user == null)
            {
                return (false, new[] { "User not found." }, null);
            }
            var passwordhased = user.PasswordHash;
            var passwordVerificationResult = _userManager.PasswordHasher.VerifyHashedPassword(user, passwordhased, changePasswordDto.CurrentPassword);
            if(passwordVerificationResult == PasswordVerificationResult.Success)
            {
                var result = await _userManager.ChangePasswordAsync(user, changePasswordDto.CurrentPassword, changePasswordDto.NewPassword);
                if (result.Succeeded)
                {
                    return (true, Array.Empty<string>(), user.Id);
                }
                else
                {
                    return (false, result.Errors.Select(e => e.Description).ToArray(), null);
                }
            }
            else
            {
                return (false, new[] { "Current password is incorrect." }, null);
            }
        }

   
    }
}
