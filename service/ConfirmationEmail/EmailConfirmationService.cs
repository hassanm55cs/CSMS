
using CSMS.Models;
using CSMS.service.Emial;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using System.Text;
namespace CSMS.service.ConfirmationEmail
{
    public class EmailConfirmationService : IEmailConfirmationService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public EmailConfirmationService(UserManager<ApplicationUser> userManager,IEmailService emailService,IConfiguration configuration)
        {
            _userManager = userManager;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task<(string description, bool success)> ConfirmEmailAsync(string userId,string token)
        {
            if(string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                return ("the userId or token is null or empty", false);
            }
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return ("User not found", false);

            var decodedToken = Encoding.UTF8.GetString(
                WebEncoders.Base64UrlDecode(token));
            var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
            if(!result.Succeeded)
            {
                return ("Failed to confirm email", false);
            }
            else
            {
                return ("Email confirmed successfully", true);
            }
        }

        public async Task<(string description, bool success)> SendConfirmationEmailAsync(string userId)
        {
            var user=await _userManager.FindByIdAsync(userId);
            if(user == null)
            {
                return ("User not found", false);
            }
            var token =
             await _userManager.GenerateEmailConfirmationTokenAsync(user);

            var encodedToken = WebEncoders.Base64UrlEncode(
              Encoding.UTF8.GetBytes(token));

            var baseUrl = _configuration["EmailSettings:ApiBaseUrl"]!;

            var confirmationLink =
          $"{baseUrl.TrimEnd('/')}/auth/confirm-email" +
          $"?userId={Uri.EscapeDataString(user.Id)}" +
          $"&token={Uri.EscapeDataString(encodedToken)}";

           var emial= await _emailService.SendEmailAsync(
              user.Email!,
              "Confirm your CSMS account",
              $"""
            <h2>Welcome to CSMS!</h2>
            <p>Click the link below to confirm your email:</p>
            <a href="{confirmationLink}">Confirm Email</a>
            """);
            if(!emial)
            {
                return ("error occurred while sending email", false);
            }
            else
            {
                return ("Email sent successfully", true);
            }



        }
    }
}
