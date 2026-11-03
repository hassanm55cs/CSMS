using CSMS.Models;
using Microsoft.AspNetCore.Identity;

namespace CSMS.service.ConfirmationEmail
{
    public interface IEmailConfirmationService
    {
        Task<(string description, bool success)> SendConfirmationEmailAsync(string userId);
        Task<(string description, bool success)> ConfirmEmailAsync(string userId, string token);
    }
}
