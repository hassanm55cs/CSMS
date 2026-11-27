using CSMS.Dto.AuthDto;
using CSMS.Data;
using CSMS.Models;
using CSMS.service.Token;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace CSMS.service.Login
{
    public class LoginService : ILoginService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ITokenService _itokenService;
        private readonly ApplicationDbContext _context;
        public LoginService(UserManager<ApplicationUser> userManager, ITokenService itokenService, ApplicationDbContext context)
        {
            _userManager = userManager;
            _itokenService = itokenService;
            _context = context;
        }
        public async Task<(bool succsee,string error, string Token)> LoginAsync(LoginDto dto)
        {
        
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if(user == null)
            {
                return (false,"email or paswword is incorrect", null);
            }
            if(!await _userManager.CheckPasswordAsync(user, dto.Password))
            {
                return (false, "email or paswword is incorrect", null);
            }
            if (await _userManager.IsInRoleAsync(user, "driver"))
            {
                var driver = await _context.Drivers.AsNoTracking().FirstOrDefaultAsync(d => d.UserId == user.Id);
                if (driver is null)
                {
                    return (false, "Driver profile not found.", null);
                }
            }
            var token =  await _itokenService.GenerateJwtTokenAsync(user);
            var tokenstring = new JwtSecurityTokenHandler().WriteToken(token);
            return(true,string.Empty, tokenstring);



        }
    }
}
