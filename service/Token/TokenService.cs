using CSMS.Models;
using CSMS.Helper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CSMS.service.Token
{
    public class TokenService : ITokenService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly Jwt _jwt;

        public TokenService(UserManager<ApplicationUser> userManager,IOptions<Jwt> jwtOptions)
        {
            _userManager = userManager;
            _jwt = jwtOptions.Value;
        }

        public async Task<JwtSecurityToken> GenerateJwtTokenAsync(ApplicationUser user)
        {
            // 1. Get the user's claims
            var userClaims = await _userManager.GetClaimsAsync(user);

            // 2. Get the user's roles
            var roles = await _userManager.GetRolesAsync(user);

            // 3. Create the token claims
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (!string.IsNullOrEmpty(user.Email))
                claims.Add(new Claim(ClaimTypes.Email, user.Email));

            // Add claims stored in Identity
            claims.AddRange(userClaims);

            // Add user roles
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            // 4. Create the signing key
            var key = new SymmetricSecurityKey(
                   Encoding.UTF8.GetBytes(_jwt.SecretKey));

            // 5. Create signing credentials
            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);

            // 6. Generate the JWT
            var token = new JwtSecurityToken(
                issuer: _jwt.Issuer,
                audience: _jwt.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwt.ExpireMinutes),
                signingCredentials: credentials
            );
            return token;
        }
    }
}