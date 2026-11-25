using CSMS.Dto.AuthDto;

namespace CSMS.service.Login
{
    public interface ILoginService
    {
        Task<(bool succsee,string error, string Token )> LoginAsync(LoginDto dto);
    }
}
