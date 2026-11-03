using CSMS.Dto;
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
        public async Task<(bool Success, string[] Errors, int? CustomerId, string? UserId)> ChangePasswordCustomerAsync(ChangePasswordDto changePasswordDto)
        {
            if (string.IsNullOrEmpty(changePasswordDto.UserId) || string.IsNullOrEmpty(changePasswordDto.CurrentPassword) || string.IsNullOrEmpty(changePasswordDto.NewPassword))
            {
                return (false, new[] { "UserId, current password, and new password are required." }, null, null);
            }
            var user = await _userManager.FindByIdAsync(changePasswordDto.UserId);
            if (user == null)
            {
                return (false, new[] { "User not found." }, null, null);
            }
            var passwordhased = user.PasswordHash;
            var passwordVerificationResult = _userManager.PasswordHasher.VerifyHashedPassword(user, passwordhased, changePasswordDto.CurrentPassword);
            if(passwordVerificationResult == PasswordVerificationResult.Success)
            {
                var result = await _userManager.ChangePasswordAsync(user, changePasswordDto.CurrentPassword, changePasswordDto.NewPassword);
                if (result.Succeeded)
                {
                    return (true, Array.Empty<string>(), null, user.Id);
                }
                else
                {
                    return (false, result.Errors.Select(e => e.Description).ToArray(), null, null);
                }
            }
            else
            {
                return (false, new[] { "Current password is incorrect." }, null, null);
            }
        }

        public async Task<(bool Success, string[] Errors, int? DriverId, string? UserId)> ChangePasswordDriverAsync(ChangePasswordDto changePasswordDto)
        {

            if (string.IsNullOrEmpty(changePasswordDto.UserId) || string.IsNullOrEmpty(changePasswordDto.CurrentPassword) || string.IsNullOrEmpty(changePasswordDto.NewPassword) || string.IsNullOrEmpty(changePasswordDto.ConfirmPassword))
            {
                return (false, new[] { "UserId, current password, and new password are required." }, null, null);
            }
            var user = await _userManager.FindByIdAsync(changePasswordDto.UserId);
            if (user == null)
            {
                return (false, new[] { "User not found." }, null, null);
            }
            if (await _userManager.CheckPasswordAsync(user, changePasswordDto.CurrentPassword))
            {
                var result = await _userManager.ChangePasswordAsync(user, changePasswordDto.CurrentPassword, changePasswordDto.NewPassword);
                if (result.Succeeded)
                {
                    return (true, Array.Empty<string>(), null, user.Id);
                }
                else
                {
                    return (false, result.Errors.Select(e => e.Description).ToArray(), null, null);
                }
            }
            else
            {
                return (false, new[] { "Current password is incorrect." }, null, null);
            }

        }
    }
}
