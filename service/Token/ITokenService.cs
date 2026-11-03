using CSMS.Models;
using System.IdentityModel.Tokens.Jwt;

namespace CSMS.service.Token
{
    public interface ITokenService
    {
        Task<JwtSecurityToken> GenerateJwtTokenAsync(ApplicationUser user);
    }
}
