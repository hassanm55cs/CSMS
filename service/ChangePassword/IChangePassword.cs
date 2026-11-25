using CSMS.Dto.AuthDto;

namespace CSMS.service.ChangePassword
{
    public interface IChangePassword
    {
        Task<(bool Success, string[] Errors,string?UserId)> ChangePasswordAsync(string userId,ChangePasswordDto changePasswordDto);
        //Task<(bool Success, string[] Errors, int? DriverId, string? UserId)> ChangePasswordDriverAsync(ChangePasswordDto changePasswordDto);
    }
}
