using CSMS.Dto;

namespace CSMS.service.ChangePassword
{
    public interface IChangePassword
    {
        Task<(bool Success, string[] Errors,int?CustomerId,string?UserId)> ChangePasswordCustomerAsync(ChangePasswordDto changePasswordDto);
        Task<(bool Success, string[] Errors, int? DriverId, string? UserId)> ChangePasswordDriverAsync(ChangePasswordDto changePasswordDto);
    }
}
